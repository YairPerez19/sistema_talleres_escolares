import { supabase } from '../integrations/supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}

export async function generateWorkshopDescription(
  nombre: string,
  categoria: string,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_URL}/ai/generate-description`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ nombre, categoria }),
  });

  if (!response.ok) {
    let message = 'Error al generar la descripción';
    try {
      const body = (await response.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      // ignore
    }
    throw new AiServiceError(message);
  }

  const body = (await response.json()) as { description?: string };
  return body.description ?? '';
}
