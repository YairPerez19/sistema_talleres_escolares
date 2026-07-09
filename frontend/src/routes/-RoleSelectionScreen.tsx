import { Header } from '../components/Header'
import Iridescence from '../components/Iridescence'
import { GraduationCap } from '@/components/icons'
import { ShieldCheck, UserCheck } from '@/components/AnimatedIcons'
import type { Role } from '../services/authService'

const roles: { id: Role; label: string; icon: typeof GraduationCap; desc: string; gradient: string }[] = [
  { id: 'student', label: 'Alumno', icon: GraduationCap, desc: 'Acceso a catálogo, horario y asistencias', gradient: 'from-emerald-500/20 to-green-600/10' },
  { id: 'instructor', label: 'Instructor', icon: UserCheck, desc: 'Gestión de asistencias de tus talleres', gradient: 'from-amber-500/20 to-orange-600/10' },
  { id: 'admin', label: 'Administrador', icon: ShieldCheck, desc: 'Panel de control y administración', gradient: 'from-[#8B1A32]/20 to-[#5C1020]/10' },
]

export function RoleSelectionScreen({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0C0810] relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-50">
        <Iridescence color={[0.5, 0.0, 0.13]} speed={0.6} amplitude={0} mouseReact={false} />
      </div>
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#8B1A32]/5 blur-[180px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#5C1020]/15 blur-[180px] rounded-full pointer-events-none" />

      <div className="relative z-10 p-4 md:p-6 w-full max-w-[1400px] mx-auto">
        <Header />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/20 border border-[#8B1A32]/20 flex items-center justify-center mx-auto mb-6">
              <GraduationCap size={28} className="text-[#8B1A32]" />
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2">Bienvenido a SITE</h2>
            <p className="text-white/40 text-sm font-medium">Selecciona tu rol para continuar</p>
          </div>

          <div className="space-y-3">
            {roles.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => onSelect(r.id)}
                className="w-full p-5 rounded-2xl border border-white/[0.06] hover:border-[#8B1A32]/30 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 text-left flex items-center gap-4 group relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${r.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/50 group-hover:text-[#8B1A32] group-hover:border-[#8B1A32]/30 group-hover:scale-110 transition-all duration-300 relative z-10">
                  <r.icon size={22} />
                </div>
                <div className="relative z-10">
                  <p className="text-base font-bold text-white group-hover:text-[#8B1A32] transition-colors">{r.label}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{r.desc}</p>
                </div>
                <div className="ml-auto text-white/20 group-hover:text-[#8B1A32] group-hover:translate-x-1 transition-all duration-300 relative z-10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
