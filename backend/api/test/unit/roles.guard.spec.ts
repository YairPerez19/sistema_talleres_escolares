import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { RolesGuard } from '../../../src/common/roles.guard';
import { Roles } from '../../../src/common/roles.decorator';
import { ConfigService } from '@nestjs/config';
import {
  FakeDb,
  createFakeSupabase as mockCreateFakeSupabase,
  Row,
} from '../../helpers/fake-supabase';

let mockDb: FakeDb;

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockCreateFakeSupabase(mockDb)),
}));

class TestController {
  @Roles('admin')
  adminOnly() {}

  @Roles('admin', 'instructor')
  staffOnly() {}

  publicRoute() {}
}

const makeCtx = (req: any, handler: (...args: any[]) => any) =>
  ({
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => req }),
  }) as any;

describe('RolesGuard', () => {
  let guard: RolesGuard;
  const controller = new TestController();

  const seedUser = (role: string): { user: Row; token: string } => {
    const user = mockDb.addAuthUser({
      email: `${role}@cbtis61.edu.mx`,
      password: 'password123',
    });
    mockDb.seed('user_roles', [{ user_id: user.id, role }]);
    return { user, token: mockDb.issueToken(user.id) };
  };

  beforeEach(() => {
    mockDb = new FakeDb();
    guard = new RolesGuard(new Reflector(), {
      get: (key: string) =>
        key === 'SUPABASE_URL' ? 'https://fake.supabase.co' : 'fake-key',
    } as unknown as ConfigService);
  });

  it('rechaza petición sin encabezado Authorization', async () => {
    const ctx = makeCtx({ headers: {} }, controller.adminOnly);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza esquema distinto de Bearer', async () => {
    const ctx = makeCtx(
      { headers: { authorization: 'Basic abc' } },
      controller.adminOnly,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza token vacío', async () => {
    const ctx = makeCtx(
      { headers: { authorization: 'Bearer ' } },
      controller.adminOnly,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza token inválido o expirado', async () => {
    const ctx = makeCtx(
      { headers: { authorization: 'Bearer token-falso' } },
      controller.adminOnly,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza usuario sin rol asignado', async () => {
    const user = mockDb.addAuthUser({
      email: 'sinrol@cbtis61.edu.mx',
      password: 'x',
    });
    const token = mockDb.issueToken(user.id);
    const ctx = makeCtx(
      { headers: { authorization: `Bearer ${token}` } },
      controller.adminOnly,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza rol no autorizado para la ruta', async () => {
    const { token } = seedUser('student');
    const ctx = makeCtx(
      { headers: { authorization: `Bearer ${token}` } },
      controller.adminOnly,
    );
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('permite rol autorizado y adjunta req.user', async () => {
    const { user, token } = seedUser('admin');
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = makeCtx(req, controller.adminOnly);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      id: user.id,
      email: user.email,
      role: 'admin',
    });
  });

  it('acepta cualquiera de los roles permitidos', async () => {
    const { token } = seedUser('instructor');
    const ctx = makeCtx(
      { headers: { authorization: `Bearer ${token}` } },
      controller.staffOnly,
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('ruta sin @Roles sólo requiere autenticación', async () => {
    const { token } = seedUser('student');
    const ctx = makeCtx(
      { headers: { authorization: `Bearer ${token}` } },
      controller.publicRoute,
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});
