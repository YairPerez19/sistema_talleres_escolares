import { Injectable, Logger, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { EmailService } from '../email/email.service';
import type { VerifyIdentityDto } from './dto/verify-identity.dto';

interface PendingTokenPayload {
  user_id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseAdmin: SupabaseClient;
  private supabaseAnon: SupabaseClient;
  private readonly jwtSecret: string;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    const url = this.configService.get<string>('SUPABASE_URL')!;
    const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = this.configService.get<string>('SUPABASE_ANON_KEY')!;
    this.jwtSecret = this.configService.get<string>('JWT_SECRET')!;

    this.supabaseAdmin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.supabaseAnon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async verifyIdentity(dto: VerifyIdentityDto) {
    const { email, password } = dto;

    const { data: authData, error: authError } = await this.supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes('not confirmed')) {
        return await this.handleUnconfirmedLogin(dto);
      }
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const userId = authData.user.id;
    const { nombre } = await this.validateCredentials(userId, dto);

    return {
      verified: true,
      needs_otp: false,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      role: dto.role,
      nombre,
      email_masked: email.replace(/(?<=.).(?=[^@]*?.@)/g, '*'),
    };
  }

  private async validateCredentials(
    userId: string,
    dto: VerifyIdentityDto,
  ): Promise<{ nombre: string }> {
    const { data: roleData } = await this.supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!roleData || roleData.role !== dto.role) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const { data: profile } = await this.supabaseAdmin
      .from('profiles')
      .select('nombre, matricula')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (dto.role === 'student' || dto.role === 'instructor') {
      if (profile.matricula !== dto.matricula) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }
    }

    if (dto.role === 'instructor') {
      const { data: taller } = await this.supabaseAdmin
        .from('talleres')
        .select('id')
        .eq('id', dto.taller_id)
        .eq('instructor_id', userId)
        .single();

      if (!taller) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }
    }

    return { nombre: profile.nombre };
  }

  private async handleUnconfirmedLogin(dto: VerifyIdentityDto) {
    const { email } = dto;

    const { data: authUser, error: authUserError } = await this.supabaseAdmin
      .schema('auth')
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (authUserError || !authUser) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const userId = authUser.id;
    const { nombre } = await this.validateCredentials(userId, dto);

    const pendingToken = jwt.sign(
      { user_id: userId, email, role: dto.role } satisfies PendingTokenPayload,
      this.jwtSecret,
      { expiresIn: '10m' },
    );

    return {
      verified: true,
      needs_otp: true,
      email_masked: email.replace(/(?<=.).(?=[^@]*?.@)/g, '*'),
      pending_token: pendingToken,
      nombre,
    };
  }

  async registerStudent(dto: import('./dto/register-student.dto').RegisterStudentDto) {
    const { email, password, nombre, matricula, turno } = dto;

    const { data: authData, error: authError } = await this.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { nombre, matricula, turno },
    });

    if (authError || !authData.user) {
      if (authError?.message.includes('already registered')) {
        throw new BadRequestException('El correo ya está registrado.');
      }
      throw new InternalServerErrorException(`Error al crear usuario: ${authError?.message}`);
    }

    const userId = authData.user.id;

    const { error: profileError } = await this.supabaseAdmin
      .from('profiles')
      .upsert({ id: userId, nombre, matricula, turno });

    if (profileError) {
      await this.supabaseAdmin.auth.admin.deleteUser(userId);
      throw new InternalServerErrorException('Error al guardar el perfil del estudiante.');
    }

    const { error: roleError } = await this.supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'student' });

    if (roleError) {
      await this.supabaseAdmin.auth.admin.deleteUser(userId);
      throw new InternalServerErrorException('Error al asignar rol de estudiante.');
    }

    const pendingToken = jwt.sign(
      { user_id: userId, email, role: 'student' } satisfies PendingTokenPayload,
      this.jwtSecret,
      { expiresIn: '10m' },
    );

    return {
      pending_token: pendingToken,
      email_masked: email.replace(/(?<=.).(?=[^@]*?.@)/g, '*'),
      nombre,
    };
  }

  async sendOtp(pendingToken: string): Promise<{ sent: boolean; cooldown_until: string }> {
    let payload: PendingTokenPayload;
    try {
      payload = jwt.verify(pendingToken, this.jwtSecret) as PendingTokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    const { data: lastCode } = await this.supabaseAdmin
      .from('verification_codes')
      .select('created_at')
      .eq('user_id', payload.user_id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCode) {
      const elapsed = Date.now() - new Date(lastCode.created_at).getTime();
      if (elapsed < 60000) {
        const cooldownUntil = new Date(Date.now() + (60000 - elapsed)).toISOString();
        return { sent: false, cooldown_until: cooldownUntil };
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(otpCode, 10);

    await this.supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('user_id', payload.user_id)
      .eq('used', false);

    await this.supabaseAdmin.from('verification_codes').insert({
      user_id: payload.user_id,
      code_hash: codeHash,
      email: payload.email,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
      used: false,
    });

    const { data: profile } = await this.supabaseAdmin
      .from('profiles')
      .select('nombre')
      .eq('id', payload.user_id)
      .single();

    await this.emailService.sendOtpEmail(payload.email, otpCode, profile?.nombre ?? 'Usuario');

    this.logger.debug(`OTP enviado a ${payload.email}`);

    return { sent: true, cooldown_until: new Date(Date.now() + 60000).toISOString() };
  }

  async verifyOtp(pendingToken: string, code: string) {
    let payload: PendingTokenPayload;
    try {
      payload = jwt.verify(pendingToken, this.jwtSecret) as PendingTokenPayload;
    } catch {
      throw new UnauthorizedException('Sesión expirada. Inicia sesión nuevamente.');
    }

    const { data: codes } = await this.supabaseAdmin
      .from('verification_codes')
      .select('*')
      .eq('user_id', payload.user_id)
      .eq('used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!codes || codes.length === 0) {
      throw new BadRequestException('No hay un código de verificación activo. Solicita uno nuevo.');
    }

    const verificationCode = codes[0];

    if (new Date(verificationCode.expires_at) < new Date()) {
      await this.supabaseAdmin
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);
      throw new BadRequestException('El código ha expirado. Solicita uno nuevo.');
    }

    if (verificationCode.attempts >= 5) {
      await this.supabaseAdmin
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationCode.id);
      throw new BadRequestException('Demasiados intentos fallidos. Solicita un nuevo código.');
    }

    const isValid = await bcrypt.compare(code, verificationCode.code_hash);
    if (!isValid) {
      await this.supabaseAdmin
        .from('verification_codes')
        .update({ attempts: verificationCode.attempts + 1 })
        .eq('id', verificationCode.id);
      const remaining = 4 - verificationCode.attempts;
      throw new BadRequestException(`Código incorrecto. Te quedan ${remaining} intento(s).`);
    }

    await this.supabaseAdmin
      .from('verification_codes')
      .update({ used: true })
      .eq('id', verificationCode.id);

    await this.supabaseAdmin.auth.admin.updateUserById(payload.user_id, {
      email_confirm: true,
    });

    // Generar sesión mediante magic link y extraer tokens
    try {
      const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL')!;

      const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          type: 'magiclink',
          email: payload.email,
          redirect_to: 'http://localhost:5173/verify-otp',
        }),
      });

      const linkData = await response.json();

      if (linkData?.properties?.action_link) {
        const url = new URL(linkData.properties.action_link);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');

        if (accessToken && refreshToken) {
          return {
            verified: true,
            access_token: accessToken,
            refresh_token: refreshToken,
            user: { id: payload.user_id, email: payload.email },
            role: payload.role,
          };
        }
      }
    } catch (err) {
      this.logger.error('Error generando magic link:', err);
    }

    // Fallback: devolver login_token para que el frontend haga signInWithPassword
    const loginToken = jwt.sign(
      { user_id: payload.user_id, email: payload.email, role: payload.role, otp_verified: true },
      this.jwtSecret,
      { expiresIn: '5m' },
    );

    return {
      verified: true,
      login_token: loginToken,
      user: { id: payload.user_id, email: payload.email },
      role: payload.role,
    };
  }
}
