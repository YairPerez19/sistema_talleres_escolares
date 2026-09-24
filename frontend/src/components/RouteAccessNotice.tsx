import { Link } from '@tanstack/react-router'
import { ArrowLeft, LockKeyhole } from 'lucide-react'
import { BrandLogo } from '@/components/BrandLogo'

type RouteAccessNoticeProps = {
  title: string
  description: string
  tone?: 'light' | 'dark'
}

export function RouteAccessNotice({ title, description, tone = 'light' }: RouteAccessNoticeProps) {
  const dark = tone === 'dark'

  return (
    <main className={dark ? 'admin-shell flex min-h-screen items-center justify-center px-4' : 'surface-page flex min-h-screen items-center justify-center px-4'}>
      <section className={dark ? 'admin-card route-enter w-full max-w-md rounded-[2rem] border border-white/10 bg-[#14050b]/80 p-8 text-center shadow-2xl backdrop-blur-xl' : 'surface-panel route-enter w-full max-w-md rounded-[2rem] p-8 text-center'}>
        <BrandLogo mode="dark" className="mx-auto mb-7" markClassName="size-12 rounded-2xl brand-mark-glow" />
        <div className={dark ? 'mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[#f4d78e]/20 bg-[#f4d78e]/10 text-[#f4d78e]' : 'mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-[#f4d78e]/20 bg-[#f4d78e]/10 text-[#f4d78e]'}>
          <LockKeyhole size={25} />
        </div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/60">{description}</p>
        <Link
          to="/auth"
          className={dark ? 'focus-ring-wine mt-7 inline-flex items-center gap-2 rounded-xl bg-[#8B1A32] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#B8354D]' : 'focus-ring-wine mt-7 inline-flex items-center gap-2 rounded-xl bg-[#8B1A32] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#B8354D]'}
        >
          <ArrowLeft size={16} />
          Ir a iniciar sesión
        </Link>
      </section>
    </main>
  )
}
