import { supabase } from '../integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export type Role = 'student' | 'instructor' | 'admin';

interface VerifyIdentityParams {
  email: string;
  password: string;
  role: Role;
  matricula?: string;
  taller_id?: string;
}

interface VerifyIdentityResponseNeedsOtp {
  verified: true;
  needs_otp: true;
  email_masked: string;
  pending_token: string;
  nombre: string;
}

interface VerifyIdentityResponseSession {
  verified: true;
  needs_otp: false;
  access_token: string;
  refresh_token: string;
  role: Role;
  nombre: string;
  email_masked: string;
}

type VerifyIdentityResponse = VerifyIdentityResponseNeedsOtp | VerifyIdentityResponseSession;

interface SendOtpResponse {
  sent: boolean;
  cooldown_until: string;
}

interface VerifyOtpResponse {
  verified: boolean;
  access_token?: string;
  refresh_token?: string;
  login_token?: string;
  user: { id: string; email: string };
  role: Role;
}

class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'Error de conexión';
    try {
      const body = await response.json();
      errorMessage = Array.isArray(body.message) ? body.message[0] : body.message || errorMessage;
    } catch {
      const text = await response.text().catch(() => '');
      errorMessage = text || `Error del servidor (${response.status})`;
    }
    throw new AuthServiceError(errorMessage);
  }
  return response.json();
}

export async function verifyIdentity(params: VerifyIdentityParams): Promise<VerifyIdentityResponse> {
  const res = await fetch(`${API_URL}/auth/verify-identity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<VerifyIdentityResponse>(res);
}

interface RegisterStudentResponse {
  pending_token: string;
  email_masked: string;
  nombre: string;
}

export async function registerStudent(params: Omit<VerifyIdentityParams, 'role' | 'taller_id'> & { nombre: string; turno: 'matutino' | 'vespertino' }): Promise<RegisterStudentResponse> {
  const res = await fetch(`${API_URL}/auth/register-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return handleResponse<RegisterStudentResponse>(res);
}

interface RegisterInstructorParams {
  nombre: string;
  email: string;
  password: string;
  matricula: string;
  taller_id: string;
}

interface RegisterInstructorResponse {
  user_id: string;
  email: string;
  nombre: string;
  taller_id: string;
}

export async function registerInstructor(
  params: RegisterInstructorParams,
): Promise<RegisterInstructorResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new AuthServiceError('No hay sesión activa. Inicia sesión nuevamente.');
  }

  const res = await fetch(`${API_URL}/auth/register-instructor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });
  return handleResponse<RegisterInstructorResponse>(res);
}

export async function sendOtp(pendingToken: string): Promise<SendOtpResponse> {
  const res = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pending_token: pendingToken }),
  });
  return handleResponse<SendOtpResponse>(res);
}

export async function verifyOtp(pendingToken: string, code: string): Promise<VerifyOtpResponse> {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pending_token: pendingToken, code }),
  });
  return handleResponse<VerifyOtpResponse>(res);
}

export async function finalizeSession(
  email: string,
  password: string,
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new AuthServiceError('Error al iniciar sesión');
  return data;
}

export function getRedirectPath(role: Role): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'instructor': return '/instructor';
    case 'student': return '/dashboard';
  }
}
