import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../../src/common/roles.decorator';
import type { AppRole } from '../../src/common/roles.types';
import type { AuthUser } from '../../src/common/roles.guard';

export const TEST_USERS = {
  student: {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'student@cbtis61.edu.mx',
    role: 'student' as AppRole,
  },
  student2: {
    id: '11111111-1111-1111-1111-111111111112',
    email: 'student2@cbtis61.edu.mx',
    role: 'student' as AppRole,
  },
  instructor: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'instructor@cbtis61.edu.mx',
    role: 'instructor' as AppRole,
  },
  instructor2: {
    id: '22222222-2222-2222-2222-222222222223',
    email: 'instructor2@cbtis61.edu.mx',
    role: 'instructor' as AppRole,
  },
  admin: {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'admin@cbtis61.edu.mx',
    role: 'admin' as AppRole,
  },
  admin2: {
    id: '33333333-3333-3333-3333-333333333334',
    email: 'admin2@cbtis61.edu.mx',
    role: 'admin' as AppRole,
  },
};

export const TEST_TOKENS = {
  student: 'Bearer test-token-student',
  student2: 'Bearer test-token-student-2',
  instructor: 'Bearer test-token-instructor',
  instructor2: 'Bearer test-token-instructor-2',
  admin: 'Bearer test-token-admin',
  admin2: 'Bearer test-token-admin-2',
  invalid: 'Bearer invalid-token',
  noRole: 'Bearer no-role-token',
  empty: 'Bearer ',
};

@Injectable()
export class TestRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = this.authenticate(req);

    if (!required || required.length === 0) return true;
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Rol "${user.role}" no autorizado. Requiere: ${required.join(', ')}.`,
      );
    }
    return true;
  }

  private authenticate(req: Request): AuthUser {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer requerido.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Token vacío.');
    }

    if (token === 'invalid-token') {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    if (token === 'no-role-token') {
      throw new ForbiddenException('El usuario no tiene un rol asignado.');
    }

    let user: AuthUser | null = null;
    if (token === 'test-token-student') {
      user = TEST_USERS.student;
    } else if (token === 'test-token-student-2') {
      user = TEST_USERS.student2;
    } else if (token === 'test-token-instructor') {
      user = TEST_USERS.instructor;
    } else if (token === 'test-token-instructor-2') {
      user = TEST_USERS.instructor2;
    } else if (token === 'test-token-admin') {
      user = TEST_USERS.admin;
    } else if (token === 'test-token-admin-2') {
      user = TEST_USERS.admin2;
    } else if (token.startsWith('user:')) {
      const parts = token.split(':');
      const role = (parts[1] ?? 'student') as AppRole;
      const id = parts[2] ?? TEST_USERS.student.id;
      user = { id, email: `${role}@cbtis61.edu.mx`, role };
    }

    if (!user) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    req.user = user;
    return user;
  }
}
