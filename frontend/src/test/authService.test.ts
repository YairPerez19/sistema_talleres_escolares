import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

const API_URL = 'http://localhost:3000/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = 'Error de conexión'
    try {
      const body = await response.json()
      errorMessage = Array.isArray(body.message) ? body.message[0] : body.message || errorMessage
    } catch {
      const text = await response.text().catch(() => '')
      errorMessage = text || `Error del servidor (${response.status})`
    }
    throw new Error(errorMessage)
  }
  return response.json()
}

async function sendOtp(pendingToken: string) {
  const res = await fetch(`${API_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pending_token: pendingToken }),
  })
  return handleResponse<{ sent: boolean; cooldown_until: string }>(res)
}

describe('sendOtp', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('returns response on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sent: true, cooldown_until: '2026-01-01T00:00:00Z' }),
    })

    const result = await sendOtp('valid-token')
    expect(result.sent).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      `${API_URL}/auth/send-otp`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ pending_token: 'valid-token' }),
      })
    )
  })

  it('throws on non-ok response with JSON error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Token inválido.' }),
    })

    await expect(sendOtp('bad-token')).rejects.toThrow('Token inválido.')
  })

  it('falls back to connection error when JSON parse fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => { throw new Error('Parse error') },
      text: async () => 'Internal Server Error',
    })

    await expect(sendOtp('token')).rejects.toThrow('Internal Server Error')
  })
})
