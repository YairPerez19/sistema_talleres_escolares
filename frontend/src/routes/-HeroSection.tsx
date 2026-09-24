import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { WorkshopParticles } from '@/components/WorkshopDecorations'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import ajedrezImg from '@/assets/talleres/generated/ajedrez.jpg'
import danzaImg from '@/assets/talleres/generated/danza.jpg'
import futbolImg from '@/assets/talleres/generated/futbol.jpg'
import basquetbolImg from '@/assets/talleres/generated/basquetbol.jpg'
import taekwondoImg from '@/assets/talleres/generated/taekwondo.jpg'
import teatroImg from '@/assets/talleres/generated/teatro.jpg'
import fotografiaImg from '@/assets/talleres/generated/fotografia.jpg'
import dibujoImg from '@/assets/talleres/generated/dibujo.jpg'
import atletismoImg from '@/assets/talleres/generated/atletismo.jpg'

interface TallerTheme {
  icon: string
  accentColor: string
  accentBg: string
  pattern: string
  decorativeElements: string
  label: string
}

const tallerThemes: Record<string, TallerTheme> = {
  'Teatro': {
    icon: '🎭',
    accentColor: '#d4849a',
    accentBg: 'rgba(212, 132, 154, 0.15)',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(212,132,154,0.2) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(212,132,154,0.15) 0%, transparent 40%)',
    decorativeElements: '✦ ',
    label: 'Escénico'
  },
  'Danza': {
    icon: '💃',
    accentColor: '#c084fc',
    accentBg: 'rgba(192, 132, 252, 0.12)',
    pattern: 'radial-gradient(ellipse at 10% 90%, rgba(192,132,252,0.25) 0%, transparent 60%)',
    decorativeElements: ' ～',
    label: 'Rítmico'
  },
  'Ajedrez': {
    icon: '♟',
    accentColor: '#94a3b8',
    accentBg: 'rgba(148, 163, 184, 0.12)',
    pattern: 'repeating-conic-gradient(rgba(148,163,184,0.06) 0% 25%, transparent 0% 50%) 0 0 / 30px 30px',
    decorativeElements: '♔ ♕',
    label: 'Estratégico'
  },
  'Fútbol': {
    icon: '⚽',
    accentColor: '#4ade80',
    accentBg: 'rgba(74, 222, 128, 0.12)',
    pattern: 'radial-gradient(circle at 50% 100%, rgba(74,222,128,0.15) 0%, transparent 50%)',
    decorativeElements: '▭ ◯',
    label: 'Deportivo'
  },
  'Basquetbol': {
    icon: '🏀',
    accentColor: '#fb923c',
    accentBg: 'rgba(251, 146, 60, 0.12)',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(251,146,60,0.2) 0%, transparent 50%)',
    decorativeElements: ' ⊙',
    label: 'Deportivo'
  },
  'Atletismo': {
    icon: '🏃',
    accentColor: '#38bdf8',
    accentBg: 'rgba(56, 189, 248, 0.1)',
    pattern: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(56,189,248,0.04) 40px, rgba(56,189,248,0.04) 42px)',
    decorativeElements: '↗ ⟩',
    label: 'Deportivo'
  },
  'Taekwondo': {
    icon: '🥋',
    accentColor: '#f87171',
    accentBg: 'rgba(248, 113, 113, 0.12)',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(248,113,113,0.03) 20px, rgba(248,113,113,0.03) 22px), repeating-linear-gradient(-45deg, transparent, transparent 20px, rgba(248,113,113,0.03) 20px, rgba(248,113,113,0.03) 22px)',
    decorativeElements: ' ◆',
    label: 'Marcial'
  },
  'Fotografía': {
    icon: '📷',
    accentColor: '#a78bfa',
    accentBg: 'rgba(167, 139, 250, 0.1)',
    pattern: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, transparent 50%)',
    decorativeElements: '◻ ',
    label: 'Visual'
  },
  'Dibujo': {
    icon: '🎨',
    accentColor: '#fbbf24',
    accentBg: 'rgba(251, 191, 36, 0.1)',
    pattern: 'radial-gradient(circle at 30% 70%, rgba(251,191,36,0.15) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(251,191,36,0.1) 0%, transparent 30%)',
    decorativeElements: '✎ ✐',
    label: 'Artístico'
  },
}

const tallerImages = [
  { src: teatroImg, title: 'Teatro', category: 'Difusión Cultural' },
  { src: danzaImg, title: 'Danza', category: 'Difusión Cultural' },
  { src: ajedrezImg, title: 'Ajedrez', category: 'Difusión Cultural' },
  { src: futbolImg, title: 'Fútbol', category: 'Promoción Deportiva' },
  { src: basquetbolImg, title: 'Basquetbol', category: 'Promoción Deportiva' },
  { src: atletismoImg, title: 'Atletismo', category: 'Promoción Deportiva' },
  { src: taekwondoImg, title: 'Taekwondo', category: 'Promoción Deportiva' },
  { src: fotografiaImg, title: 'Fotografía', category: 'Difusión Cultural' },
  { src: dibujoImg, title: 'Dibujo', category: 'Difusión Cultural' },
]

export function HeroSection({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> | null }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goToSlide = (index: number) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => setIsAnimating(false), 600)
  }

  const nextSlide = () => goToSlide((currentIndex + 1) % tallerImages.length)
  const prevSlide = () => goToSlide((currentIndex - 1 + tallerImages.length) % tallerImages.length)

  useEffect(() => {
    let resetAnimation: number | undefined
    const interval = window.setInterval(() => {
      setIsAnimating(true)
      setCurrentIndex(index => (index + 1) % tallerImages.length)
      resetAnimation = window.setTimeout(() => setIsAnimating(false), 600)
    }, 5000)

    return () => {
      window.clearInterval(interval)
      if (resetAnimation) window.clearTimeout(resetAnimation)
    }
  }, [])

  const current = tallerImages[currentIndex]
  const theme = tallerThemes[current.title] || tallerThemes['Teatro']

  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-12 overflow-hidden">
      <WorkshopParticles />

      {/* Contenido superior */}
      <div className="relative z-30 text-center max-w-4xl mx-auto flex flex-col items-center px-4">
        <div className="hero-reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 mb-6">
          <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-white/80">Sistema de Talleres Escolares</span>
        </div>

        <h1 className="hero-reveal text-3xl sm:text-4xl md:text-5xl lg:text-[4.5rem] font-bold leading-[1.1] tracking-tight text-white mb-4 sm:mb-6">
          Gestiona talleres escolares{' '}
          <span className="text-wine-glow">sin complicaciones</span>
        </h1>
        <p className="hero-reveal text-white/70 text-base sm:text-lg max-w-3xl mx-auto font-medium mb-8 sm:mb-10 leading-relaxed px-2">
          SITE automatiza inscripciones, asistencia y reportes para estudiantes, instructores y administradores.
        </p>

        <div className="hero-reveal flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link to="/auth" className="btn-wine-glow w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[15px] text-center">
            Inicio de sesión
          </Link>
          <a
            href="#funciones"
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white/80 hover:text-white font-semibold text-[14px] sm:text-[15px] hover:bg-white/5 transition-all duration-300 text-center"
          >
            Explorar funciones
          </a>
        </div>
      </div>

      {/* Carrusel temático */}
      <div className="hero-reveal relative w-full max-w-7xl mx-auto mt-8 sm:mt-12 px-4 z-20">
        {/* Fondo temático del slide activo */}
        <div
          className="absolute inset-0 rounded-3xl transition-all duration-700"
          style={{ background: theme.pattern }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#260711] via-[#4d0e18]/90 to-[#721422]/55" />
        </div>

        {/* Líneas decorativas laterales temáticas */}
        <div
          className="absolute top-0 bottom-0 left-8 w-px opacity-20 transition-all duration-700 hidden md:block"
          style={{ background: `linear-gradient(to bottom, transparent, ${theme.accentColor}, transparent)` }}
        />
        <div
          className="absolute top-0 bottom-0 right-8 w-px opacity-20 transition-all duration-700 hidden md:block"
          style={{ background: `linear-gradient(to bottom, transparent, ${theme.accentColor}, transparent)` }}
        />

        {/* Contenedor principal */}
        <div className="relative flex items-center justify-center gap-4 sm:gap-6">
          {/* Botón anterior */}
          <button
            onClick={prevSlide}
            aria-label="Taller anterior"
            className="absolute left-0 sm:left-4 z-30 w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-[#721422]/15 shadow-[0_10px_24px_rgba(114,20,34,0.16)] flex items-center justify-center hover:bg-[#721422] transition-all duration-300 group"
          >
            <ChevronLeft className="w-6 h-6 text-[#721422] group-hover:text-white group-hover:scale-110 transition-transform" />
          </button>

          {/* Slides con diseño temático */}
          <div className="relative w-full flex justify-center items-center h-[300px] sm:h-[380px] md:h-[440px]">
            {tallerImages.map((taller, index) => {
              const offset = index - currentIndex
              const isActive = offset === 0
              const slideTheme = tallerThemes[taller.title] || tallerThemes['Teatro']
              const isPrev = offset === -1 || (currentIndex === 0 && index === tallerImages.length - 1)
              const isNext = offset === 1 || (currentIndex === tallerImages.length - 1 && index === 0)

              let transform = ''
              let opacity = 0
              let scale = 0.7
              let zIndex = 0

              if (isActive) {
                transform = 'translateX(0)'
                opacity = 1
                scale = 1
                zIndex = 30
              } else if (isPrev) {
                transform = 'translateX(-65%) scale(0.88)'
                opacity = 0.45
                scale = 0.88
                zIndex = 20
              } else if (isNext) {
                transform = 'translateX(65%) scale(0.88)'
                opacity = 0.45
                scale = 0.88
                zIndex = 20
              } else {
                transform = `translateX(${offset > 0 ? '140%' : '-140%'})`
                opacity = 0
                zIndex = 10
              }

              return (
                <div
                  key={index}
                  className="absolute w-[65%] sm:w-[52%] md:w-[42%] aspect-[4/3] transition-all duration-600 ease-out"
                  style={{
                    transform: `${transform} scale(${scale})`,
                    opacity,
                    zIndex,
                  }}
                >
                  <div
                    className={`hero-carousel-card relative w-full h-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
                      isActive ? 'border-2' : 'border border-transparent'
                    }`}
                    style={isActive ? { borderColor: slideTheme.accentColor + '60' } : {}}
                  >
                    {/* Imagen del taller */}
                    <img
                      src={taller.src}
                      alt={taller.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay temático con color del taller */}
                    <div
                      className="absolute inset-0 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(180deg, transparent 30%, ${slideTheme.accentColor}15 70%, ${slideTheme.accentColor}30 100%)`,
                        opacity: isActive ? 1 : 0.5,
                      }}
                    />

                    {/* Patrón decorativo temático */}
                    <div
                      className="absolute inset-0 opacity-30 transition-opacity duration-500"
                      style={{
                        background: slideTheme.pattern,
                        opacity: isActive ? 0.4 : 0.1,
                      }}
                    />

                    {/* Ícono temático grande decorativo */}
                    <div
                      className="absolute top-3 right-3 sm:top-4 sm:right-4 text-3xl sm:text-4xl opacity-20 transition-all duration-500"
                      style={{
                        opacity: isActive ? 0.3 : 0.1,
                        filter: `drop-shadow(0 0 8px ${slideTheme.accentColor})`,
                      }}
                    >
                      {slideTheme.icon}
                    </div>

                    {/* Elementos decorativos tipo "tags" */}
                    {isActive && (
                      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm"
                          style={{
                            background: slideTheme.accentBg,
                            color: slideTheme.accentColor,
                            border: `1px solid ${slideTheme.accentColor}30`,
                          }}
                        >
                          {slideTheme.label}
                        </span>
                      </div>
                    )}

                    {/* Contenido inferior */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#351019]/95 via-[#351019]/65 to-transparent p-4 sm:p-6">
                      {isActive ? (
                        <div className="animate-theme-slide-up">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{slideTheme.icon}</span>
                            <span
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                              style={{
                                background: slideTheme.accentBg,
                                color: slideTheme.accentColor,
                                border: `1px solid ${slideTheme.accentColor}25`,
                              }}
                            >
                              {taller.category}
                            </span>
                          </div>
                          <h3 className="text-white font-bold text-xl sm:text-2xl md:text-3xl tracking-tight">
                            {taller.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className="h-0.5 rounded-full w-8"
                              style={{ background: slideTheme.accentColor }}
                            />
                            <span className="text-white/50 text-xs">CBTis No. 61</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-lg opacity-50">{slideTheme.icon}</span>
                          <span className="text-white/60 font-semibold text-sm">{taller.title}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botón siguiente */}
          <button
            onClick={nextSlide}
            aria-label="Siguiente taller"
            className="absolute right-0 sm:right-4 z-30 w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-[#721422]/15 shadow-[0_10px_24px_rgba(114,20,34,0.16)] flex items-center justify-center hover:bg-[#721422] transition-all duration-300 group"
          >
            <ChevronRight className="w-6 h-6 text-[#721422] group-hover:text-white group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* Indicadores temáticos */}
        <div className="flex justify-center gap-2 mt-6 sm:mt-8 z-20">
          {tallerImages.map((taller, index) => {
            const slideTheme = tallerThemes[taller.title] || tallerThemes['Teatro']
            return (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? 'w-8'
                    : 'w-1.5 bg-white/30 hover:bg-white/50'
                }`}
                style={index === currentIndex ? { background: slideTheme.accentColor } : {}}
              />
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes theme-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-theme-slide-up {
          animation: theme-slide-up 0.5s ease-out;
        }
      `}</style>
    </section>
  )
}
