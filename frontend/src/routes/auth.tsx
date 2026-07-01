import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import Iridescence from '../components/Iridescence'
import { Loader2, LogIn, Mail, Lock, Hash, BookOpen, ShieldCheck, UserCheck, GraduationCap } from '@/components/AnimatedIcons'
import { useAuth } from '../hooks/useAuth'
import { verifyIdentity, registerStudent } from '../services/authService'
import { toast } from 'sonner'
import type { Role } from '../services/authService'
import { User } from '@/components/AnimatedIcons'


export const Route = createFileRoute('/auth')({
  component: LoginPage,
})

type TallerOption = { id: string; nombre: string; categoria: string }

function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  const [step, setStep] = useState<'select-role' | 'credentials'>('select-role')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  const [loading, setLoading] = useState(false)
  const [talleres, setTalleres] = useState<TallerOption[]>([])
  const [loadingTalleres, setLoadingTalleres] = useState(false)

  // Form fields
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [matricula, setMatricula] = useState('')
  const [tallerId, setTallerId] = useState('')
  const [turno, setTurno] = useState<'matutino' | 'vespertino'>('matutino')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) {
      navigate({ to: '/admin' })
    }
  }, [user])

  useEffect(() => {
    if (role === 'instructor') {
      setLoadingTalleres(true)
      supabase.from('talleres').select('id, nombre, categoria').then(({ data }) => {
        if (data) setTalleres(data as TallerOption[])
        setLoadingTalleres(false)
      })
    }
  }, [role])

  const selectRole = (r: Role) => {
    setRole(r)
    setStep('credentials')
    setAuthMode('login')
    setNombre('')
    setEmail('')
    setPassword('')
    setMatricula('')
    setTallerId('')
    setTurno('matutino')
  }

  const goBack = () => {
    setStep('select-role')
    setRole(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return

    setLoading(true)

    if (authMode === 'register' && role === 'student') {
      try {
        await registerStudent({ email, password, nombre, matricula, turno })
        toast.success('Cuenta creada exitosamente. Inicia sesión para continuar.')
        setAuthMode('login')
      } catch (err: any) {
        toast.error(err.message || 'Error al crear la cuenta.')
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const result = await verifyIdentity({
        email,
        password,
        role,
        ...(role !== 'admin' ? { matricula } : {}),
        ...(role === 'instructor' ? { taller_id: tallerId } : {}),
      })

      localStorage.setItem('pending_token', result.pending_token)
      localStorage.setItem('pending_email_masked', result.email_masked)
      localStorage.setItem('pending_nombre', result.nombre)
      localStorage.setItem('pending_role', role)
      localStorage.setItem('pending_email', email)
      localStorage.setItem('pending_password', password)

      navigate({ to: '/verify-otp' })
    } catch (err: any) {
      toast.error(err.message || 'Credenciales inválidas.')
    } finally {
      setLoading(false)
    }
  }

  const roles: { id: Role; label: string; icon: typeof GraduationCap; desc: string }[] = [
    { id: 'student', label: 'Alumno', icon: GraduationCap, desc: 'Acceso a catálogo, horario y asistencias' },
    { id: 'instructor', label: 'Instructor', icon: UserCheck, desc: 'Gestión de asistencias de tus talleres' },
    { id: 'admin', label: 'Administrador', icon: ShieldCheck, desc: 'Panel de control y administración' },
  ]

  if (step === 'select-role') {
    return (
      <div className="flex flex-col w-full min-h-screen bg-[#050102] relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-60">
          <Iridescence color={[0.5, 0.0, 0.13]} speed={0.6} amplitude={0} mouseReact={false} />
        </div>
        {/* Abstract shapes for background */}
        <div className="absolute top-[0%] left-[0%] w-[50%] h-[50%] bg-[#ff0055]/10 blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] bg-[#800020]/20 blur-[150px] rounded-full pointer-events-none" />

        <div className="relative z-10 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
          <Header />
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <div className="w-full max-w-md relative rounded-[2rem] p-[3px] overflow-hidden shadow-[20px_20px_60px_rgba(0,0,0,0.5),-20px_-20px_60px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center">
            <div className="absolute z-0 top-1/2 left-1/2 w-[150px] h-[150px] rounded-full bg-[#800020] opacity-100 blur-[20px] animate-blob-bounce" />
            <div className="absolute inset-[3px] z-10 bg-[#0a0a0a]/60 backdrop-blur-[24px] border border-white/10 rounded-[calc(2rem-3px)]" />
            <div className="relative z-20 p-8 w-full">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white">Selecciona tu Rol</h2>
                <div className="w-8 h-1 bg-[#ff0055] mx-auto mt-3 rounded-full shadow-[0_0_10px_#ff0055]" />
              </div>
              
              <div className="space-y-3">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => selectRole(r.id)}
                    className="w-full bg-[#141414] p-5 rounded-2xl border border-white/5 hover:border-[#ff0055]/50 hover:bg-[#1a1a1a] transition-all text-left flex items-center gap-4 group relative z-30"
                  >
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/60 group-hover:text-[#ff0055] group-hover:bg-[#ff0055]/10 transition-colors">
                      <r.icon size={24} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-white group-hover:text-[#ff0055] transition-colors">{r.label}</p>
                      <p className="text-[11px] text-white/40 mt-1">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#050102] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-60">
        <Iridescence color={[0.5, 0.0, 0.13]} speed={0.6} amplitude={0} mouseReact={false} />
      </div>
      {/* Abstract shapes for background */}
      <div className="absolute top-[0%] left-[0%] w-[50%] h-[50%] bg-[#ff0055]/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] bg-[#800020]/20 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[440px] relative rounded-[2rem] p-[3px] overflow-hidden shadow-[20px_20px_60px_rgba(0,0,0,0.5),-20px_-20px_60px_rgba(255,255,255,0.05)] flex flex-col items-center justify-center">
          <div className="absolute z-0 top-1/2 left-1/2 w-[200px] h-[200px] rounded-full bg-[#800020] opacity-100 blur-[25px] animate-blob-bounce" />
          <div className="absolute inset-[3px] z-10 bg-[#0a0a0a]/60 backdrop-blur-[24px] border border-white/10 rounded-[calc(2rem-3px)]" />
          
          <div className="relative z-20 p-8 md:p-10 w-full">
            <button onClick={goBack} className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors z-50">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            {/* Top Tabs */}
          <div className="flex items-center justify-center gap-6 mb-10 mt-2">
            <button 
              onClick={() => setAuthMode('login')}
              className={`text-2xl font-bold transition-colors relative ${authMode === 'login' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              Iniciar Sesión
              {authMode === 'login' && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#ff0055] rounded-full shadow-[0_0_10px_#ff0055]" />}
            </button>
            
            {role === 'student' && (
              <button 
                onClick={() => setAuthMode('register')}
                className={`text-2xl font-bold transition-colors relative ${authMode === 'register' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
              >
                Crear Cuenta
                {authMode === 'register' && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#ff0055] rounded-full shadow-[0_0_10px_#ff0055]" />}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 mb-8 bg-[#141414] border border-white/5 rounded-xl p-3 mx-auto w-fit px-4">
             <div className="text-[#ff0055]">
               {role === 'student' ? <GraduationCap size={16} /> : role === 'instructor' ? <UserCheck size={16} /> : <ShieldCheck size={16} />}
             </div>
             <span className="text-white/60 font-medium text-[11px] uppercase tracking-wider">
               {role === 'student' ? 'Acceso de Alumno' : role === 'instructor' ? 'Acceso de Instructor' : 'Acceso de Administrador'}
             </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors text-sm"
                    placeholder="Juan Pérez"
                    required
                    minLength={3}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Turno</label>
                  <select
                    value={turno}
                    onChange={e => setTurno(e.target.value as 'matutino' | 'vespertino')}
                    className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-white/20 transition-colors appearance-none text-sm"
                    required
                  >
                    <option value="matutino" className="bg-[#141414]">Matutino</option>
                    <option value="vespertino" className="bg-[#141414]">Vespertino</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors text-sm"
                placeholder="correo@cbtis61.edu.mx"
                required
              />
            </div>

            {role !== 'admin' && (
              <div>
                <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors text-sm"
                  placeholder="Número de control"
                  required
                />
              </div>
            )}

            {role === 'instructor' && (
              <div>
                <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Taller asignado</label>
                {loadingTalleres ? (
                  <div className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-white/30" />
                    <span className="text-white/30 text-sm">Cargando talleres...</span>
                  </div>
                ) : (
                  <select
                    value={tallerId}
                    onChange={e => setTallerId(e.target.value)}
                    className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-white/20 transition-colors appearance-none text-sm"
                    required
                  >
                    <option value="" className="bg-[#141414]">Seleccionar taller</option>
                    {talleres.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#141414]">{t.nombre} — {t.categoria}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#141414] border border-white/5 rounded-2xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors text-sm pr-12"
                  placeholder="Al menos 6 caracteres..."
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 outline-none ${showPassword ? 'text-[#ff0055] drop-shadow-[0_0_10px_#ff0055] scale-110' : 'text-white/20 hover:text-white/40'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-8 rounded-2xl font-bold bg-[#800020] text-white hover:bg-[#a0002a] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(128,0,32,0.5)] disabled:opacity-50 text-base border border-[#ff0055]/30"
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? 'Procesando...' : (authMode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión')}
            </button>
          </form>

          </div>
        </div>
      </div>
    </div>
  )
}
