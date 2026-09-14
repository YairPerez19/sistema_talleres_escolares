import { randomUUID } from 'node:crypto';

export type Row = Record<string, any>;

type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

interface InjectedFailure {
  table: string;
  op: Op;
  error: { message?: string; code?: string; status?: number };
}

/**
 * Base de datos en memoria que emula el comportamiento de Supabase
 * (PostgREST + GoTrue) para pruebas unitarias y de integración sin red.
 */
export class FakeDb {
  tables = new Map<string, Row[]>();
  authUsers: Row[] = [];
  tokens = new Map<string, string>();
  rpcHandlers = new Map<string, (params: any) => any>();
  private failures: InjectedFailure[] = [];

  table(name: string): Row[] {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name)!;
  }

  seed(tableName: string, rows: Row[]): void {
    this.table(tableName).push(...rows.map((r) => ({ ...r })));
  }

  addAuthUser(input: {
    id?: string;
    email: string;
    password: string;
    email_confirmed?: boolean;
    user_metadata?: Row;
  }): Row {
    const user: Row = {
      id: input.id ?? randomUUID(),
      email: input.email,
      password: input.password,
      email_confirmed: input.email_confirmed ?? true,
      user_metadata: input.user_metadata ?? {},
    };
    this.authUsers.push(user);
    return user;
  }

  issueToken(userId: string): string {
    const token = `fake-jwt-${randomUUID()}`;
    this.tokens.set(token, userId);
    return token;
  }

  registerRpc(name: string, handler: (params: any) => any): void {
    this.rpcHandlers.set(name, handler);
  }

  /** Inyecta un fallo único para la próxima operación sobre una tabla. */
  injectError(
    table: string,
    op: Op,
    error: { message?: string; code?: string; status?: number } = {
      message: 'fallo inyectado',
    },
  ): void {
    this.failures.push({ table, op, error });
  }

  consumeFailure(table: string, op: Op): InjectedFailure['error'] | null {
    const idx = this.failures.findIndex(
      (f) => f.table === table && f.op === op,
    );
    if (idx === -1) return null;
    return this.failures.splice(idx, 1)[0].error;
  }

  reset(): void {
    this.tables.clear();
    this.authUsers = [];
    this.tokens.clear();
    this.rpcHandlers.clear();
    this.failures = [];
  }
}

const toPublicUser = (user: Row): Row => ({
  id: user.id,
  email: user.email,
  email_confirmed_at: user.email_confirmed ? '2026-01-01T00:00:00Z' : null,
  user_metadata: user.user_metadata ?? {},
});

type Filter = (row: Row) => boolean;

class QueryBuilder implements PromiseLike<{ data: any; error: any }> {
  private filters: Filter[] = [];
  private op: Op = 'select';
  private payload: any = null;
  private conflictKeys: string[] | null = null;
  private wantsReturn = false;
  private cols = '*';
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;

  constructor(
    private db: FakeDb,
    private tableName: string,
  ) {}

  select(cols = '*'): this {
    this.cols = cols;
    this.wantsReturn = true;
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.op = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], opts?: { onConflict?: string }): this {
    this.op = 'upsert';
    this.payload = payload;
    this.conflictKeys = opts?.onConflict
      ? opts.onConflict.split(',').map((k) => k.trim())
      : null;
    return this;
  }

  delete(): this {
    this.op = 'delete';
    return this;
  }

  eq(col: string, value: unknown): this {
    this.filters.push((r) => r[col] === value);
    return this;
  }

  in(col: string, values: unknown[]): this {
    this.filters.push((r) => values.includes(r[col]));
    return this;
  }

  ilike(col: string, pattern: string): this {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*')
      .replace(/_/g, '.');
    const re = new RegExp(`^${escaped}$`, 'i');
    this.filters.push((r) => typeof r[col] === 'string' && re.test(r[col]));
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  private rows(): Row[] {
    if (this.tableName === 'auth.users') return this.db.authUsers;
    return this.db.table(this.tableName);
  }

  private match(row: Row): boolean {
    return this.filters.every((f) => f(row));
  }

  private withRelations(row: Row): Row {
    if (this.tableName === 'talleres' && this.cols.includes('horarios')) {
      row.horarios = this.db
        .table('horarios')
        .filter((h) => h.taller_id === row.id)
        .map((h) => ({ ...h }));
    }
    return row;
  }

  private execute(): { data: any; error: any } {
    const injected = this.db.consumeFailure(this.tableName, this.op);
    if (injected) return { data: null, error: injected };

    const rows = this.rows();

    switch (this.op) {
      case 'select': {
        let out = rows
          .filter((r) => this.match(r))
          .map((r) => this.withRelations({ ...r }));
        if (this.orderCol) {
          const col = this.orderCol;
          const dir = this.orderAsc ? 1 : -1;
          out = [...out].sort((a, b) => {
            if (a[col] < b[col]) return -1 * dir;
            if (a[col] > b[col]) return 1 * dir;
            return 0;
          });
        }
        if (this.limitN !== null) out = out.slice(0, this.limitN);
        return { data: out, error: null };
      }
      case 'insert': {
        const items = Array.isArray(this.payload)
          ? this.payload
          : [this.payload];
        const inserted = items.map((item) => {
          const row: Row = { id: randomUUID(), ...item };
          if (!('created_at' in row)) row.created_at = new Date().toISOString();
          rows.push(row);
          return row;
        });
        return { data: this.wantsReturn ? inserted : null, error: null };
      }
      case 'update': {
        const updated: Row[] = [];
        for (const row of rows) {
          if (this.match(row)) {
            Object.assign(row, this.payload);
            updated.push(row);
          }
        }
        return { data: this.wantsReturn ? updated : null, error: null };
      }
      case 'delete': {
        const deleted = rows.filter((r) => this.match(r));
        const kept = rows.filter((r) => !this.match(r));
        if (this.tableName === 'auth.users') {
          this.db.authUsers = kept;
        } else {
          this.db.tables.set(this.tableName, kept);
        }
        return { data: this.wantsReturn ? deleted : null, error: null };
      }
      case 'upsert': {
        const items = Array.isArray(this.payload)
          ? this.payload
          : [this.payload];
        const keys = this.conflictKeys ?? ['id'];
        const result: Row[] = [];
        for (const item of items) {
          const existing = rows.find((r) =>
            keys.every((k) => r[k] === item[k]),
          );
          if (existing) {
            Object.assign(existing, item);
            result.push(existing);
          } else {
            const row: Row = { id: randomUUID(), ...item };
            if (!('created_at' in row)) {
              row.created_at = new Date().toISOString();
            }
            rows.push(row);
            result.push(row);
          }
        }
        return { data: this.wantsReturn ? result : null, error: null };
      }
    }
  }

  single(): Promise<{ data: any; error: any }> {
    const res = this.execute();
    if (res.error) return Promise.resolve(res);
    const arr = res.data as Row[];
    if (!Array.isArray(arr) || arr.length !== 1) {
      return Promise.resolve({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      });
    }
    return Promise.resolve({ data: arr[0], error: null });
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    const res = this.execute();
    if (res.error) return Promise.resolve(res);
    const arr = res.data as Row[];
    if (!Array.isArray(arr)) {
      return Promise.resolve({ data: null, error: null });
    }
    return Promise.resolve({ data: arr[0] ?? null, error: null });
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

/**
 * Crea un cliente falso de Supabase sobre la FakeDb dada.
 * Cubre los métodos usados por los servicios y el RolesGuard.
 */
export function createFakeSupabase(db: FakeDb) {
  return {
    from: (table: string) => new QueryBuilder(db, table),
    schema: (name: string) => ({
      from: (table: string) => new QueryBuilder(db, `${name}.${table}`),
    }),
    rpc: (fn: string, params?: any) => {
      const handler = db.rpcHandlers.get(fn);
      if (!handler) {
        return Promise.resolve({
          data: null,
          error: { message: `function ${fn} does not exist` },
        });
      }
      try {
        return Promise.resolve({ data: handler(params ?? {}), error: null });
      } catch (err: any) {
        return Promise.resolve({
          data: null,
          error: { message: err?.message ?? 'rpc error' },
        });
      }
    },
    auth: {
      signInWithPassword: ({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) => {
        const user = db.authUsers.find((u) => u.email === email);
        if (!user || user.password !== password) {
          return Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Invalid login credentials' },
          });
        }
        if (!user.email_confirmed) {
          return Promise.resolve({
            data: { user: null, session: null },
            error: { message: 'Email not confirmed' },
          });
        }
        const accessToken = db.issueToken(user.id);
        return Promise.resolve({
          data: {
            user: toPublicUser(user),
            session: {
              access_token: accessToken,
              refresh_token: `refresh-${accessToken}`,
            },
          },
          error: null,
        });
      },
      getUser: (token: string) => {
        const userId = db.tokens.get(token);
        const user = userId
          ? db.authUsers.find((u) => u.id === userId)
          : undefined;
        if (!user) {
          return Promise.resolve({
            data: { user: null },
            error: { message: 'invalid JWT' },
          });
        }
        return Promise.resolve({
          data: { user: toPublicUser(user) },
          error: null,
        });
      },
      admin: {
        createUser: (input: any) => {
          if (db.authUsers.some((u) => u.email === input.email)) {
            return Promise.resolve({
              data: { user: null },
              error: { message: 'User already registered', status: 422 },
            });
          }
          const user = db.addAuthUser({
            email: input.email,
            password: input.password,
            email_confirmed: !!input.email_confirm,
            user_metadata: input.user_metadata ?? {},
          });
          return Promise.resolve({
            data: { user: toPublicUser(user) },
            error: null,
          });
        },
        deleteUser: (id: string) => {
          db.authUsers = db.authUsers.filter((u) => u.id !== id);
          for (const [token, userId] of db.tokens) {
            if (userId === id) db.tokens.delete(token);
          }
          return Promise.resolve({ data: null, error: null });
        },
        updateUserById: (id: string, patch: any) => {
          const user = db.authUsers.find((u) => u.id === id);
          if (!user) {
            return Promise.resolve({
              data: null,
              error: { message: 'user not found' },
            });
          }
          if (patch.email_confirm !== undefined) {
            user.email_confirmed = patch.email_confirm;
          }
          return Promise.resolve({
            data: { user: toPublicUser(user) },
            error: null,
          });
        },
        generateLink: ({ email }: { email: string }) => {
          const user = db.authUsers.find((u) => u.email === email);
          if (!user) {
            return Promise.resolve({
              data: null,
              error: { message: 'user not found' },
            });
          }
          const accessToken = db.issueToken(user.id);
          const actionLink =
            `https://app.local/callback?access_token=${accessToken}` +
            `&refresh_token=refresh-${accessToken}&type=magiclink`;
          return Promise.resolve({
            data: { properties: { action_link: actionLink } },
            error: null,
          });
        },
      },
    },
  };
}
