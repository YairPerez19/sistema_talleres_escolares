import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import { Loader2, ShieldCheck, Clock, RefreshCw, Mail } from '@/components/AnimatedIcons'
import { sendOtp, verifyOtp, getRedirectPath } from '../services/authService'
import { toast } from 'sonner'
import { cn } from '../lib/utils'
import { usePageMeta } from '../hooks/usePageMeta'

export const Route = createFileRoute('/verify-otp')({
  component: VerifyOtpPage,
})

const PENDING_KEYS = [
  'pending_auth_token',
  'pending_auth_email',
  'pending_auth_nombre',
  'pending_auth_role',
  'pending_auth_is_registration',
] as const

function clearPendingAuth() {
  for (const key of PENDING_KEYS) {
    localStorage.removeItem(key)
  }
}

function VerifyOtpPage() {
  usePageMeta({
    title: 'Verificar Código',
    description: 'Verifica tu identidad con el código de acceso enviado. Sistema Integral de Talleres Escolares del CBTis No. 61.',
    canonicalPath: '/verify-otp',
    noindex: true,
  })
  const navigate = useNavigate()

  const [session, setSession] = useState({
    pendingToken: null as string | null, emailMasked: '', nombre: '',
    isRegistration: false, role: '',
  })
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [loadingState, setLoadingState] = useState({ loading: false, sendingOtp: false })

  const [timers, setTimers] = useState({
    cooldownUntil: null as Date | null,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    cooldownRemaining: 0,
    expiresRemaining: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('pending_auth_token')
    const emailDisplay = localStorage.getItem('pending_auth_email')
    const nombre = localStorage.getItem('pending_auth_nombre')
    const role = localStorage.getItem('pending_auth_role')
    const isRegistration = localStorage.getItem('pending_auth_is_registration')

    if (!token || !emailDisplay || !role) {
      navigate({ to: '/auth' })
      return
    }

    setSession({
      pendingToken: token,
      emailMasked: emailDisplay,
      nombre: nombre || '',
      isRegistration: isRegistration === 'true',
      role,
    })
  }, [navigate])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleSendOtp = useCallback(async () => {
    if (!session.pendingToken) return
    setLoadingState(s => ({ ...s, sendingOtp: true }))
    try {
      const result = await sendOtp(session.pendingToken)
      if (result.sent) {
        setTimers(t => ({ ...t, expiresAt: new Date(Date.now() + 10 * 60 * 1000), cooldownUntil: new Date(result.cooldown_until) }))
        toast.success('Código enviado a tu correo')
      } else {
        setTimers(t => ({ ...t, cooldownUntil: new Date(result.cooldown_until) }))
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el código')
    } finally {
      setLoadingState(s => ({ ...s, sendingOtp: false }))
    }
  }, [session.pendingToken])

  useEffect(() => {
    if (!session.pendingToken) return
    handleSendOtp()
  }, [session.pendingToken, handleSendOtp])

  useEffect(() => {
    if (!timers.cooldownUntil) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timers.cooldownUntil!.getTime() - Date.now()) / 1000))
      setTimers(t => {
        if (remaining <= 0) return { ...t, cooldownRemaining: 0, cooldownUntil: null }
        return { ...t, cooldownRemaining: remaining }
      })
    }, 200)
    return () => clearInterval(interval)
  }, [timers.cooldownUntil])

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((timers.expiresAt.getTime() - Date.now()) / 1000))
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      setTimers(t => ({ ...t, expiresRemaining: `${mins}:${secs.toString().padStart(2, '0')}` }))
    }, 1000)
    return () => clearInterval(interval)
  }, [timers.expiresAt])

  const handleCodeChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newCode = pasted.split('')
      setCode(newCode)
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos')
      return
    }
    if (!session.pendingToken) return

    setLoadingState(s => ({ ...s, loading: true }))
    try {
      const result = await verifyOtp(session.pendingToken, fullCode)

      if (!result.access_token || !result.refresh_token) {
        clearPendingAuth()
        toast.error('Error de autenticación. Inicia sesión nuevamente.')
        navigate({ to: '/auth' })
        return
      }

      await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      })

      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session?.user?.id) {
        localStorage.setItem(`role_${sessionData.session.user.id}`, result.role || session.role)
      }

      clearPendingAuth()

      toast.success(`¡Bienvenido${session.nombre ? ', ' + session.nombre : ''}!`)
      navigate({ to: getRedirectPath(result.role || session.role) })
    } catch (err: any) {
      toast.error(err.message || 'Código incorrecto')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoadingState(s => ({ ...s, loading: false }))
    }
  }

  if (!session.pendingToken) return null

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0C0810]">
      <div className="relative z-10 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        <Header tone="dark" />
      </div>
      <div className="flex-1 flex items-center justify-center p-4 relative">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B1A32]/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#5C1020]/10 blur-[150px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <button type="button" onClick={() => navigate({ to: '/auth' })} className="text-white/30 hover:text-white text-xs font-bold mb-6 flex items-center gap-1 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            Volver
          </button>
          <div className="p-8 bg-[#150D18]/80 backdrop-blur-[24px] rounded-[2.5rem] border border-white/[0.06] shadow-2xl shadow-black/30 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/20 flex items-center justify-center text-[#8B1A32] border border-[#8B1A32]/20 mx-auto mb-6">
              <ShieldCheck size={28} />
            </div>

            <h2 className="text-2xl font-extrabold text-white mb-2">
              {session.isRegistration ? 'Verifica tu cuenta' : 'Verificación en dos pasos'}
            </h2>
            <p className="text-white/40 text-sm mb-1">
              {session.isRegistration
                ? 'Tu cuenta fue creada. Ingresa el código que enviamos a:'
                : `${session.nombre ? `Hola ${session.nombre}, ` : ''}ingresa el código que enviamos a:`}
            </p>
            <p className="text-[#8B1A32] font-bold text-sm flex items-center justify-center gap-2 mb-8">
              <Mail size={14} /> {session.emailMasked}
            </p>

            <div className="flex items-center justify-center gap-3 mb-8" onPaste={handlePaste}>
              {code.map((digit, pos) => (
                <input
                  key={`otp-${pos}`}
                  ref={el => { inputRefs.current[pos] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(pos, e.target.value)}
                  onKeyDown={e => handleKeyDown(pos, e)}
                  aria-label={`Dígito ${pos + 1}`}
                  className={cn(
                    'w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-200 outline-none',
                    digit
                      ? 'border-[#8B1A32]/40 bg-[#8B1A32]/10 text-white shadow-[0_0_15px_rgba(255,0,85,0.15)]'
                      : 'border-white/[0.06] bg-white/[0.03] text-white/30',
                    'focus:border-[#8B1A32]/50 focus:shadow-[0_0_20px_rgba(255,0,85,0.2)]',
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleVerify}
              disabled={loadingState.loading || code.join('').length !== 6}
              className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-[#8B1A32] to-[#B8354D] text-white hover:shadow-[0_10px_35px_rgba(255,0,85,0.4)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none mb-6"
            >
              {loadingState.loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
              {loadingState.loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/30">
                <Clock size={14} />
                <span className={cn(parseInt(timers.expiresRemaining) < 120 && 'text-amber-400 font-semibold')}>
                  {timers.expiresRemaining}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loadingState.sendingOtp || (timers.cooldownRemaining > 0)}
                className="flex items-center gap-1.5 text-[#8B1A32] font-semibold hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loadingState.sendingOtp ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} className={cn(timers.cooldownRemaining > 0 && 'animate-spin')} />
                )}
                {timers.cooldownRemaining > 0
                  ? `Reenviar en ${timers.cooldownRemaining}s`
                  : 'Reenviar código'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
