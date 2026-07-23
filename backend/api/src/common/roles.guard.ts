import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import type { AppRole } from './roles.types';

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  private supabaseAdmin: SupabaseClient;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    this.supabaseAdmin = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    const req = ctx.switchToHttp().getRequest<Request>();
    const user = await this.authenticate(req);

    if (!required || required.length === 0) return true;
    if (!required.includes(user.role)) {
      throw new ForbiddenException(
        `Rol "${user.role}" no autorizado. Requiere: ${required.join(', ')}.`,
      );
    }
    return true;
  }

  private async authenticate(req: Request): Promise<AuthUser> {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer requerido.');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token) throw new UnauthorizedException('Token vacío.');

    const { data, error } = await this.supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      this.logger.debug(`Token inválido: ${error?.message ?? 'sin usuario'}`);
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    const { data: roleData, error: roleError } = await this.supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (roleError || !roleData) {
      throw new ForbiddenException('El usuario no tiene un rol asignado.');
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email ?? '',
      role: roleData.role as AppRole,
    };
    req.user = user;
    return user;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.user) {
      throw new UnauthorizedException('Usuario no autenticado.');
    }
    return req.user;
  },
);
