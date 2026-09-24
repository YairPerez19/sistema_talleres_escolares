import { GraduationCap } from '@/components/icons'
import { ShieldCheck, UserCheck } from '@/components/AnimatedIcons'
import { BrandLogo } from '@/components/BrandLogo'
import type { Role } from '../services/authService'

import { type ComponentType } from 'react'

const roles: { id: Role; label: string; icon: ComponentType<any>; desc: string; gradient: string }[] = [
  { id: 'student', label: 'Alumno', icon: GraduationCap, desc: 'Acceso a catálogo, horario y asistencias', gradient: 'from-[#8B1A32]/25 to-[#f4d78e]/10' },
  { id: 'instructor', label: 'Instructor', icon: UserCheck, desc: 'Gestión de asistencias de tus talleres', gradient: 'from-[#a82a3e]/25 to-[#f4d78e]/10' },
  { id: 'admin', label: 'Administrador', icon: ShieldCheck, desc: 'Panel de control y administración', gradient: 'from-[#8B1A32]/20 to-[#5C1020]/10' },
]

export function RoleSelectionScreen({ onSelect }: { onSelect: (r: Role) => void }) {
  return (
    <div className="auth-page route-enter relative flex min-h-screen w-full flex-col overflow-hidden bg-[#310018] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(128,25,62,0.34),transparent_58%),linear-gradient(135deg,#3b001d_0%,#210012_55%,#3b001d_100%)]" />
        <div className="absolute -left-[20%] -top-[30%] h-[150%] w-[78%] rotate-[34deg] rounded-[42%] bg-[#6c0030]/35" />
        <div className="absolute -right-[24%] -top-[20%] h-[145%] w-[72%] rotate-[-29deg] rounded-[45%] border border-[#91033e]/25 bg-[#4c0025]/30" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-10 sm:px-6">
        <BrandLogo mode="dark" className="mb-8" markClassName="h-11 w-11 rounded-2xl" />

        <div className="w-full max-w-lg rounded-[28px] border border-[#d47b91]/25 bg-[#4b1027]/65 p-6 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:p-10">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d47b91]/25 bg-[#5b1632]/45">
              <GraduationCap size={26} className="text-[#f4d78e]" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Bienvenido a SITE</h2>
            <p className="mt-2 text-sm font-medium text-white/55">Selecciona tu rol para continuar</p>
          </div>

          <div className="space-y-3.5">
            {roles.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => onSelect(r.id)}
                style={{ '--role-index': roles.indexOf(r) } as React.CSSProperties}
                className="auth-role-card focus-ring-wine group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-[#d47b91]/18 bg-[#260716]/35 p-4 text-left transition-all duration-300 hover:border-[#f4d78e]/40 hover:bg-[#3c0d20]/55 hover:shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${r.gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d47b91]/18 bg-[#5b1632]/45 text-[#f4d78e] transition-all duration-300 group-hover:scale-105 group-hover:border-[#f4d78e]/45">
                  <r.icon size={22} />
                </div>
                <div className="relative z-10">
                  <p className="text-base font-bold text-white transition-colors group-hover:text-[#f4d78e]">{r.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/45">{r.desc}</p>
                </div>
                <div className="relative z-10 ml-auto text-white/25 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#f4d78e]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-8 text-center text-[11px] font-medium text-white/35">
            © {new Date().getFullYear()} Sistema Integral de Talleres Escolares — CBTis No. 61
          </p>
        </div>
      </div>
    </div>
  )
}
