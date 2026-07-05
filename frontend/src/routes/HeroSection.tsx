import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@/components/icons'
import { WorkshopParticles } from '@/components/WorkshopDecorations'

export function HeroSection({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-10">
      <WorkshopParticles />

      <div className="relative z-30 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <div className="hero-reveal inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff0055]/10 border border-[#ff0055]/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#ff0055] animate-pulse" />
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff0055]">Sistema Integral de Talleres Escolares</span>
        </div>

        <h1 className="hero-reveal text-[3.5rem] md:text-[6.5rem] font-extrabold leading-[1.05] tracking-tight text-white mb-6">
          Descubre tu{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0055] via-[#ff3377] to-[#800020]">
            talento
          </span>
        </h1>
        <p className="hero-reveal text-white/60 text-lg md:text-xl max-w-2xl mx-auto font-medium mb-10 leading-relaxed">
          El ecosistema digital más avanzado del <span className="text-white/80 font-semibold">CBTis No. 61</span> para explorar, inscribirte y brillar en talleres culturales, cívicos y deportivos.
        </p>

        <div className="hero-reveal flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/catalogo" className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#ff0055] to-[#ff3377] text-white font-bold text-base hover:shadow-[0_10px_40px_rgba(255,0,85,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2 group">
            Explorar Talleres
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/auth" className="px-8 py-4 rounded-2xl text-white/70 hover:text-white font-semibold text-base border border-white/10 hover:border-[#ff0055]/30 hover:bg-[#ff0055]/5 transition-all duration-300">
            Comenzar Ahora
          </Link>
        </div>
      </div>

      <div className="relative w-full flex justify-center items-center h-[350px] md:h-[550px] lg:h-[600px] mt-4">
        <div className="carousel-wrapper z-20">
          <div className="carousel-inner" style={{ '--quantity': 10 } as React.CSSProperties}>
            {[
              { icon: '🎭', label: 'Teatro', color: '139, 92, 246' },
              { icon: '♟️', label: 'Ajedrez', color: '107, 114, 128' },
              { icon: '🥁', label: 'Banda', color: '220, 38, 38' },
              { icon: '🚩', label: 'Escolta', color: '249, 115, 22' },
              { icon: '⚽', label: 'Fútbol', color: '34, 197, 94' },
              { icon: '🏀', label: 'Basquet', color: '249, 115, 22' },
              { icon: '🏃', label: 'Atletismo', color: '6, 182, 212' },
              { icon: '🏐', label: 'Voleibol', color: '234, 179, 8' },
              { icon: '🥋', label: 'Taekwondo', color: '236, 72, 153' },
              { icon: '💃', label: 'Danza', color: '236, 72, 153' },
            ].map((item, idx) => (
              <div key={idx} className="carousel-card" style={{ '--index': idx, '--color-card': item.color } as React.CSSProperties}>
                <div className="carousel-img" />
                <div className="z-10 text-white text-[3rem] md:text-[4rem] leading-none drop-shadow-lg">
                  {item.icon}
                </div>
                <p className="z-10 text-[10px] md:text-sm font-bold uppercase tracking-wider text-white/90">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
        <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-[#ff0055] animate-bounce" />
        </div>
      </div>
    </section>
  )
}
