import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import { Loader2, ShieldCheck, Clock, RefreshCw, Mail } from '@/components/AnimatedIcons'
import { sendOtp, verifyOtp, finalizeSession, getRedirectPath } from '../services/authService'
import { toast } from 'sonner'
import type { Role } from '../services/authService'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/verify-otp')({
  component: VerifyOtpPage,
})

function VerifyOtpPage() {
  const navigate = useNavigate()

  const [pendingToken, setPendingToken] = useState<string | null>(null)
  const [emailMasked, setEmailMasked] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null)
  const [expiresAt, setExpiresAt] = useState<Date>(() => new Date(Date.now() + 10 * 60 * 1000))
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [expiresRemaining, setExpiresRemaining] = useState('')
  useEffect(() => {
    const token = localStorage.getItem('pending_token')
    const emailM = localStorage.getItem('pending_email_masked')
    const name = localStorage.getItem('pending_nombre')
    const r = localStorage.getItem('pending_role') as Role | null
    const e = localStorage.getItem('pending_email')
    const p = localStorage.getItem('pending_password')

    if (!token || !emailM || !r || !e || !p) {
      navigate({ to: '/auth' })
      return
    }

    setPendingToken(token)
    setEmailMasked(emailM)
    setNombre(name || '')
    setEmail(e)
    setPassword(p)
  }, [])

  useEffect(() => {
    if (!pendingToken) return
    handleSendOtp()
  }, [pendingToken])

  const handleSendOtp = useCallback(async () => {
    if (!pendingToken) return
    setSendingOtp(true)
    try {
      const result = await sendOtp(pendingToken)
      if (result.sent) {
        setExpiresAt(new Date(Date.now() + 10 * 60 * 1000))
        setCooldownUntil(new Date(result.cooldown_until))
        toast.success('Código enviado a tu correo')
      } else {
        setCooldownUntil(new Date(result.cooldown_until))
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el código')
    } finally {
      setSendingOtp(false)
    }
  }, [pendingToken])

  useEffect(() => {
    if (!cooldownUntil) return
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000))
      setCooldownRemaining(remaining)
      if (remaining <= 0) setCooldownUntil(null)
    }, 200)
    return () => clearInterval(interval)
  }, [cooldownUntil])

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      const mins = Math.floor(remaining / 60)
      const secs = remaining % 60
      setExpiresRemaining(`${mins}:${secs.toString().padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

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
    if (!pendingToken) return

    setLoading(true)
    try {
      const result = await verifyOtp(pendingToken, fullCode)

      if (result.access_token && result.refresh_token) {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      } else if (result.login_token) {
        await finalizeSession(email, password)
      }

      localStorage.removeItem('pending_token')
      localStorage.removeItem('pending_email_masked')
      localStorage.removeItem('pending_nombre')
      localStorage.removeItem('pending_role')
      localStorage.removeItem('pending_email')
      localStorage.removeItem('pending_password')

      toast.success(`¡Bienvenido${nombre ? ', ' + nombre : ''}!`)
      navigate({ to: getRedirectPath(result.role) })
    } catch (err: any) {
      toast.error(err.message || 'Código incorrecto')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (!pendingToken) return null

  return (
    <div className="flex flex-col w-full min-h-screen">
      <div className="glass-card mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto">
        <Header />
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button onClick={() => navigate({ to: '/auth' })} className="text-white/40 hover:text-white text-xs font-bold mb-6 flex items-center gap-1 transition-colors">
            ← Volver
          </button>
          <div className="p-8 glass-card rounded-[2.5rem] border border-white/10 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-glow border border-primary/20 mx-auto mb-6">
              <ShieldCheck size={32} />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Verificación en dos pasos</h2>
            <p className="text-white/50 text-sm mb-1">
              {nombre ? `Hola ${nombre}, ` : ''}ingresa el código que enviamos a:
            </p>
            <p className="text-primary-glow font-bold text-sm flex items-center justify-center gap-2 mb-8">
              <Mail size={14} /> {emailMasked}
            </p>

            <div className="flex items-center justify-center gap-3 mb-8" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={cn(
                    'w-12 h-14 text-center text-2xl font-black rounded-xl border transition-all outline-none',
                    digit
                      ? 'border-primary/60 bg-primary/10 text-white'
                      : 'border-white/10 bg-white/5 text-white',
                    'focus:border-primary/60 focus:ring-2 focus:ring-primary/20',
                  )}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading || code.join('').length !== 6}
              className="w-full py-4 rounded-xl font-bold bg-primary text-white hover:bg-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
              {loading ? 'Verificando...' : 'Verificar código'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-white/40">
                <Clock size={14} />
                <span className={cn(parseInt(expiresRemaining) < 120 && 'text-amber-400')}>
                  {expiresRemaining}
                </span>
              </div>

              <button
                onClick={handleSendOtp}
                disabled={sendingOtp || (cooldownRemaining > 0)}
                className="flex items-center gap-1.5 text-primary-glow font-bold hover:brightness-125 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sendingOtp ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} className={cn(cooldownRemaining > 0 && 'animate-spin')} />
                )}
                {cooldownRemaining > 0
                  ? `Reenviar en ${cooldownRemaining}s`
                  : 'Reenviar código'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
