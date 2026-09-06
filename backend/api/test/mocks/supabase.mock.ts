export type MockQueryBuilder = {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  or?: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  schema: jest.Mock;
  from: jest.Mock;
  then?: (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise<unknown>;
  [key: string]: unknown;
};

export type MockSupabaseAuth = {
  getUser: jest.Mock;
  signInWithPassword: jest.Mock;
  signOut: jest.Mock;
  admin: {
    createUser: jest.Mock;
    deleteUser: jest.Mock;
    updateUserById: jest.Mock;
    listUsers: jest.Mock;
    generateLink: jest.Mock;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type MockSupabaseClient = {
  from: jest.Mock;
  schema: jest.Mock;
  rpc: jest.Mock;
  auth: MockSupabaseAuth;
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  [key: string]: unknown;
};

export function createMockQueryBuilder(
  defaultData: unknown = [],
  defaultError: unknown = null,
  defaultCount: number | null = null,
): MockQueryBuilder {
  const count =
    defaultCount ?? (Array.isArray(defaultData) ? defaultData.length : null);

  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: defaultData,
      count,
      error: defaultError,
    }),
    maybeSingle: jest.fn().mockResolvedValue({
      data: defaultData,
      count,
      error: defaultError,
    }),
    then: (
      resolve: (value: {
        data: unknown;
        count: number | null;
        error: unknown;
      }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({
        data: defaultData,
        count,
        error: defaultError,
      }).then(resolve, reject),
  };

  return queryBuilder;
}

export function createMockSupabaseClient(): MockSupabaseClient {
  const queryBuilder = createMockQueryBuilder();

  const mockAuth: MockSupabaseAuth = {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'mock-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: { id: 'mock-user-id', email: 'test@example.com' },
        session: { access_token: 'mock-token' },
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    admin: {
      createUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-new-user-id', email: 'new@example.com' } },
        error: null,
      }),
      deleteUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      updateUserById: jest.fn().mockResolvedValue({
        data: { user: { id: 'mock-user-id' } },
        error: null,
      }),
      listUsers: jest
        .fn()
        .mockResolvedValue({ data: { users: [] }, error: null }),
      generateLink: jest.fn().mockResolvedValue({
        data: { properties: { action_link: 'http://localhost/auth/action' } },
        error: null,
      }),
    },
  };

  const client: MockSupabaseClient = {
    from: jest.fn().mockReturnValue(queryBuilder),
    schema: jest.fn().mockReturnValue(queryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: mockAuth,

    select: queryBuilder.select,
    eq: queryBuilder.eq,
    neq: queryBuilder.neq,
    gt: queryBuilder.gt,
    gte: queryBuilder.gte,
    lt: queryBuilder.lt,
    lte: queryBuilder.lte,
    like: queryBuilder.like,
    ilike: queryBuilder.ilike,
    is: queryBuilder.is,
    in: queryBuilder.in,
    order: queryBuilder.order,
    limit: queryBuilder.limit,
    range: queryBuilder.range,
    single: queryBuilder.single,
    maybeSingle: queryBuilder.maybeSingle,
    insert: queryBuilder.insert,
    upsert: queryBuilder.upsert,
    update: queryBuilder.update,
    delete: queryBuilder.delete,
  };

  return client;
}
