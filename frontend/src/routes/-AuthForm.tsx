import { Loader2 } from '@/components/AnimatedIcons'
import type { Role } from '../services/authService'
import type { TallerOption } from './auth'

export interface AuthFormState {
  nombre: string
  email: string
  password: string
  matricula: string
  tallerId: string
  turno: 'matutino' | 'vespertino'
  showPassword: boolean
}

export interface AuthFormProps {
  authMode: 'login' | 'register'
  role: Role | null
  loading: boolean
  form: AuthFormState
  setField: (field: keyof AuthFormState, value: string | boolean) => void
  handleSubmit: (e: React.FormEvent) => void
  talleres: TallerOption[]
  loadingTalleres: boolean
}

export function AuthForm({
  authMode, role, loading,
  form, setField, handleSubmit, talleres, loadingTalleres,
}: AuthFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {authMode === 'register' && (
        <>
          <div>
            <label htmlFor="input-nombre" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Nombre Completo</label>
            <input
              id="input-nombre"
              type="text"
              value={form.nombre}
              onChange={e => setField('nombre', e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white placeholder-white/15 focus:outline-none focus:border-[#8B1A32]/30 focus:bg-white/[0.05] transition-all duration-200 text-sm"
              placeholder="Juan Pérez"
              required
              minLength={3}
            />
          </div>
          <div>
            <label htmlFor="input-turno" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Turno</label>
            <div className="relative">
              <select
                id="input-turno"
                value={form.turno}
                onChange={e => setField('turno', e.target.value as 'matutino' | 'vespertino')}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#8B1A32]/30 transition-all duration-200 appearance-none text-sm"
                required
              >
                <option value="matutino" className="bg-[#141414]">Matutino</option>
                <option value="vespertino" className="bg-[#141414]">Vespertino</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        </>
      )}

      <div>
        <label htmlFor="input-email" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Email</label>
        <input
          id="input-email"
          type="email"
          value={form.email}
          onChange={e => setField('email', e.target.value)}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white placeholder-white/15 focus:outline-none focus:border-[#8B1A32]/30 focus:bg-white/[0.05] transition-all duration-200 text-sm"
          placeholder="correo@cbtis61.edu.mx"
          required
        />
      </div>

      {role !== 'admin' && (
        <div>
          <label htmlFor="input-matricula" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Matrícula</label>
          <input
            id="input-matricula"
            type="text"
            value={form.matricula}
            onChange={e => setField('matricula', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white placeholder-white/15 focus:outline-none focus:border-[#8B1A32]/30 focus:bg-white/[0.05] transition-all duration-200 text-sm"
            placeholder="Número de control"
            required
          />
        </div>
      )}

      {role === 'instructor' && (
        <div>
          <label htmlFor="input-taller" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Taller asignado</label>
          {loadingTalleres ? (
            <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-white/30" />
              <span className="text-white/30 text-sm">Cargando talleres...</span>
            </div>
          ) : (
            <div className="relative">
              <select
                id="input-taller"
                value={form.tallerId}
                onChange={e => setField('tallerId', e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-[#8B1A32]/30 transition-all duration-200 appearance-none text-sm"
                required
              >
                <option value="" className="bg-[#141414]">Seleccionar taller</option>
                {talleres.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#141414]">{t.nombre} — {t.categoria}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label htmlFor="input-password" className="text-[11px] font-medium text-white/40 mb-1.5 block ml-1">Contraseña</label>
        <div className="relative">
          <input
            id="input-password"
            type={form.showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => setField('password', e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3.5 text-white placeholder-white/15 focus:outline-none focus:border-[#8B1A32]/30 focus:bg-white/[0.05] transition-all duration-200 text-sm pr-12"
            placeholder="Al menos 6 caracteres"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setField('showPassword', !form.showPassword)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${form.showPassword ? 'text-[#8B1A32]' : 'text-white/20 hover:text-white/40'}`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {form.showPassword ? (
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
        className="w-full py-4 mt-8 rounded-2xl font-bold bg-gradient-to-r from-[#8B1A32] to-[#B8354D] text-white hover:shadow-[0_10px_35px_rgba(255,0,85,0.4)] hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none text-base"
      >
        {loading && <Loader2 className="animate-spin" size={18} />}
        {loading ? 'Procesando...' : (authMode === 'register' ? 'Crear Cuenta' : 'Iniciar Sesión')}
      </button>
    </form>
  )
}
