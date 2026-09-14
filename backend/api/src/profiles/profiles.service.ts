import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);
  private supabase: any;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) this.fail('obtener perfil', error);
    if (!data) throw new NotFoundException('Perfil no encontrado.');
    return data as Record<string, unknown>;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    if (Object.keys(dto).length === 0) {
      return this.getProfile(userId);
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update(dto)
      .eq('id', userId)
      .select()
      .single();

    if (error) this.fail('actualizar perfil', error);
    return data as Record<string, unknown>;
  }

  async getSettings(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('settings')
      .select('key, value');

    if (error) this.fail('obtener configuraciones', error);
    return data ?? [];
  }

  async updateSetting(
    key: string,
    value: string,
  ): Promise<Record<string, unknown>> {
    const { data, error } = await this.supabase
      .from('settings')
      .update({ value })
      .eq('key', key)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const { data: inserted, error: insertError } = await this.supabase
          .from('settings')
          .insert({ key, value })
          .select()
          .single();

        if (insertError) this.fail('crear configuración', insertError);
        return inserted as Record<string, unknown>;
      }
      this.fail('actualizar configuración', error);
    }
    return data as Record<string, unknown>;
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
