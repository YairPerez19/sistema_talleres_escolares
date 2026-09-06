import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AssignAdminDto } from './dto/assign-admin.dto';

export interface AdminUser {
  user_id: string;
  email: string;
  nombre: string;
}

interface UserRoleRow {
  user_id: string;
  role: string;
}

interface ProfileNameRow {
  id: string;
  nombre: string | null;
}

interface AuthUserRow {
  id: string;
  email: string | null;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async listAdmins(): Promise<AdminUser[]> {
    const { data: adminRoles, error: rolesError } = await this.supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) this.fail('listar administradores', rolesError);

    const userRoles = (adminRoles ?? []) as unknown as UserRoleRow[];
    const userIds = userRoles.map((r) => r.user_id);
    if (userIds.length === 0) return [];

    const profilesMap = new Map<string, string>();
    const { data: profilesData } = await this.supabase
      .from('profiles')
      .select('id, nombre')
      .in('id', userIds);

    if (profilesData) {
      const profRows = profilesData as unknown as ProfileNameRow[];
      for (const p of profRows) {
        profilesMap.set(p.id, p.nombre ?? '');
      }
    }

    const emailsMap = await this.fetchEmails(userIds);

    return userIds.map((userId) => ({
      user_id: userId,
      email: emailsMap.get(userId) ?? '',
      nombre: profilesMap.get(userId) ?? 'Administrador',
    }));
  }

  async assignAdmin(
    dto: AssignAdminDto,
  ): Promise<{ user_id: string; role: 'admin' }> {
    const { user_id } = dto;

    const userExists = await this.checkUserExists(user_id);
    if (!userExists) {
      throw new NotFoundException(`Usuario con id "${user_id}" no encontrado.`);
    }

    const { data: existingRole, error: roleCheckError } = (await this.supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user_id)
      .eq('role', 'admin')
      .maybeSingle()) as {
      data: UserRoleRow | null;
      error: { message?: string } | null;
    };

    if (roleCheckError) {
      this.fail('verificar rol de administrador', roleCheckError);
    }
    if (existingRole) {
      throw new ConflictException(
        'El usuario ya tiene el rol de administrador.',
      );
    }

    const { error: insertError } = await this.supabase
      .from('user_roles')
      .insert({ user_id, role: 'admin' });

    if (insertError) {
      if (this.isUniqueViolation(insertError)) {
        throw new ConflictException(
          'El usuario ya tiene el rol de administrador.',
        );
      }
      this.fail('asignar rol de administrador', insertError);
    }

    return { user_id, role: 'admin' };
  }

  async revokeAdmin(
    targetUserId: string,
    currentUserId: string,
  ): Promise<{ user_id: string; revoked: true }> {
    if (targetUserId === currentUserId) {
      throw new BadRequestException(
        'No puedes revocar tu propio rol de administrador.',
      );
    }

    const { data: existingRole, error: checkError } = (await this.supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('role', 'admin')
      .maybeSingle()) as {
      data: UserRoleRow | null;
      error: { message?: string } | null;
    };

    if (checkError) this.fail('verificar rol de administrador', checkError);
    if (!existingRole) {
      throw new NotFoundException(
        'El usuario no tiene el rol de administrador.',
      );
    }

    const { error: deleteError } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('user_id', targetUserId)
      .eq('role', 'admin');

    if (deleteError) this.fail('revocar rol de administrador', deleteError);

    return { user_id: targetUserId, revoked: true };
  }

  private async checkUserExists(userId: string): Promise<boolean> {
    const { data: profile } = (await this.supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle()) as { data: { id: string } | null };

    if (profile) return true;

    try {
      const { data: authUser } = (await this.supabase
        .schema('auth')
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle()) as { data: { id: string } | null };
      if (authUser) return true;
    } catch {
      // ignore
    }

    try {
      const { data: userResp } =
        await this.supabase.auth.admin.getUserById(userId);
      if (userResp?.user) return true;
    } catch {
      // ignore
    }

    return false;
  }

  private async fetchEmails(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) return map;

    try {
      const { data: usersData, error } = await this.supabase
        .schema('auth')
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (!error && usersData) {
        const authRows = usersData as unknown as AuthUserRow[];
        for (const u of authRows) {
          if (u.id && u.email) map.set(u.id, u.email);
        }
        return map;
      }
    } catch {
      // ignore
    }

    try {
      const { data: adminUsers } = await this.supabase.auth.admin.listUsers();
      if (adminUsers?.users) {
        for (const u of adminUsers.users) {
          if (
            u &&
            typeof u.id === 'string' &&
            typeof u.email === 'string' &&
            userIds.includes(u.id)
          ) {
            map.set(u.id, u.email);
          }
        }
      }
    } catch {
      // ignore
    }

    return map;
  }

  private isUniqueViolation(error: {
    code?: string;
    message?: string;
  }): boolean {
    return (
      error.code === '23505' ||
      error.message?.toLowerCase().includes('duplicate key') === true
    );
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
