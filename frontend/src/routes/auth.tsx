import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { supabase } from '../integrations/supabase/client'
import { verifyIdentity, registerStudent, getRedirectPath } from '../services/authService'
import { toast } from 'sonner'
import type { Role } from '../services/authService'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAuth } from '../hooks/useAuth'
import { RoleSelectionScreen } from './-RoleSelectionScreen'
import LoginSite, { type AuthFormState } from '@/components/LoginSite'

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
    setAuthMode('login')
    setForm(initialForm)
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
        } as any})
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
      } as any})
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
    <LoginSite
      authMode={authMode}
      setAuthMode={setAuthMode}
      role={nav.role!}
      onBack={goBack}
      loading={loadingState.loading}
      form={form}
      setField={setField}
      handleSubmit={handleSubmit}
      talleres={loadingState.talleres}
      loadingTalleres={loadingState.loadingTalleres}
    />
  )
}
