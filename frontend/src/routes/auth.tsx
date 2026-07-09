import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { supabase } from '../integrations/supabase/client'
import Iridescence from '../components/Iridescence'
import { ShieldCheck, UserCheck } from '@/components/AnimatedIcons'
import { GraduationCap } from '@/components/icons'
import { useAuth } from '../hooks/useAuth'
import { verifyIdentity, registerStudent, getRedirectPath } from '../services/authService'
import { toast } from 'sonner'
import type { Role } from '../services/authService'
import { usePageMeta } from '../hooks/usePageMeta'
import { RoleSelectionScreen } from './-RoleSelectionScreen'
import { AuthForm } from './-AuthForm'
import type { AuthFormState } from './-AuthForm'

export const Route = createFileRoute('/auth')({
  component: LoginPage,
})

export type TallerOption = { id: string; nombre: string; categoria: string }

const initialForm: AuthFormState = {
  nombre: '', email: '', password: '', matricula: '', tallerId: '',
  turno: 'matutino', showPassword: false,
}

function LoginPage() {
  usePageMeta({
    title: 'Iniciar Sesión',
    description: 'Accede al Sistema Integral de Talleres Escolares del CBTis No. 61. Inicia sesión con tu matrícula o regístrate para inscribirte a talleres.',
    canonicalPath: '/auth',
  })
  const { user } = useAuth()
  const navigate = useNavigate()

  const [nav, setNav] = useState<{ role: Role | null; step: 'select-role' | 'credentials' }>({
    role: null, step: 'select-role',
  })
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [loadingState, setLoadingState] = useState({ loading: false, loadingTalleres: false, talleres: [] as TallerOption[] })
  const [form, setForm] = useState<AuthFormState>(initialForm)

  useEffect(() => {
    if (user) {
      navigate({ to: '/admin' })
    }
  }, [user, navigate])

  const selectRole = (r: Role) => {
    setNav({ role: r, step: 'credentials' })
    setAuthMode('login')
    setForm(initialForm)
    if (r === 'instructor') {
      setLoadingState(s => ({ ...s, loadingTalleres: true }))
      supabase.from('talleres').select('id, nombre, categoria').then(({ data }) => {
        setLoadingState(s => ({ ...s, loadingTalleres: false, talleres: (data as TallerOption[]) || [] }))
      })
    }
  }

  const goBack = () => {
    setNav({ role: null, step: 'select-role' })
  }

  const setField = (field: keyof AuthFormState, value: string | boolean) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nav.role) return

    setLoadingState(s => ({ ...s, loading: true }))

    if (authMode === 'register' && nav.role === 'student') {
      try {
        const result = await registerStudent({
          email: form.email, password: form.password, nombre: form.nombre,
          matricula: form.matricula, turno: form.turno,
        })

        navigate({ to: '/verify-otp', state: {
          pendingToken: result.pending_token,
          emailMasked: result.email_masked,
          nombre: result.nombre,
          role: 'student' as Role,
          email: form.email,
          password: form.password,
          isRegistration: true,
        }})
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al crear la cuenta.'
        toast.error(message)
      } finally {
        setLoadingState(s => ({ ...s, loading: false }))
      }
      return
    }

    try {
      const result = await verifyIdentity({
        email: form.email,
        password: form.password,
        role: nav.role,
        ...(nav.role !== 'admin' ? { matricula: form.matricula } : {}),
        ...(nav.role === 'instructor' ? { taller_id: form.tallerId } : {}),
      })

      if (!result.needs_otp) {
        await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
        toast.success(`¡Bienvenido${result.nombre ? ', ' + result.nombre : ''}!`)
        navigate({ to: getRedirectPath(result.role) })
        return
      }

      navigate({ to: '/verify-otp', state: {
        pendingToken: result.pending_token,
        emailMasked: result.email_masked,
        nombre: result.nombre,
        role: nav.role,
        email: form.email,
        password: form.password,
        isRegistration: false,
      }})
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Credenciales inválidas.'
      toast.error(message)
    } finally {
      setLoadingState(s => ({ ...s, loading: false }))
    }
  }

  if (nav.step === 'select-role') {
    return <RoleSelectionScreen onSelect={selectRole} />
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0C0810] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-50">
        <Iridescence color={[0.5, 0.0, 0.13]} speed={0.6} amplitude={0} mouseReact={false} />
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#8B1A32]/5 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#800020]/15 blur-[180px] rounded-full pointer-events-none" />

      <div className="relative z-10 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[440px]">
          <div className="bg-[#150D18]/80 backdrop-blur-[24px] border border-white/[0.06] rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between mb-8">
              <button type="button" aria-label="Volver" onClick={goBack} className="text-white/30 hover:text-white hover:bg-white/5 p-2 rounded-xl transition-all duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button type="button" aria-label="Cerrar" onClick={goBack} className="text-white/30 hover:text-white p-2 rounded-xl transition-all duration-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className={`text-xl font-bold transition-all duration-300 relative pb-2 ${authMode === 'login' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
              >
                Iniciar Sesión
                {authMode === 'login' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gradient-to-r from-[#8B1A32] to-[#B8354D] rounded-full" />}
              </button>

              {nav.role === 'student' && (
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`text-xl font-bold transition-all duration-300 relative pb-2 ${authMode === 'register' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Crear Cuenta
                  {authMode === 'register' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gradient-to-r from-[#8B1A32] to-[#B8354D] rounded-full" />}
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 mb-8 bg-white/[0.03] border border-white/[0.05] rounded-xl p-2.5 w-fit mx-auto px-4">
              <div className="text-[#8B1A32]">
                {nav.role === 'student' ? <GraduationCap size={14} /> : nav.role === 'instructor' ? <UserCheck size={14} /> : <ShieldCheck size={14} />}
              </div>
              <span className="text-white/50 font-medium text-[10px] uppercase tracking-wider">
                {nav.role === 'student' ? 'Alumno' : nav.role === 'instructor' ? 'Instructor' : 'Administrador'}
              </span>
            </div>

            <AuthForm
              authMode={authMode}
              role={nav.role}
              loading={loadingState.loading}
              form={form}
              setField={setField}
              handleSubmit={handleSubmit}
              talleres={loadingState.talleres}
              loadingTalleres={loadingState.loadingTalleres}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
