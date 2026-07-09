import { Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { WorkshopParticles } from '@/components/WorkshopDecorations'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const tallerImages = [
  {
    src: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&h=400&fit=crop',
    title: 'Teatro',
    category: 'Difusión Cultural'
  },
  {
    src: 'https://images.unsplash.com/photo-1547153760-18fc86324498?w=600&h=400&fit=crop',
    title: 'Danza',
    category: 'Difusión Cultural'
  },
  {
    src: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600&h=400&fit=crop',
    title: 'Ajedrez',
    category: 'Difusión Cultural'
  },
  {
    src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=400&fit=crop',
    title: 'Futbol',
    category: 'Promoción Deportiva'
  },
  {
    src: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
    title: 'Basquetbol',
    category: 'Promoción Deportiva'
  },
  {
    src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop',
    title: 'Atletismo',
    category: 'Promoción Deportiva'
  },
  {
    src: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop',
    title: 'Taekwondo',
    category: 'Promoción Deportiva'
  },
  {
    src: 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&h=400&fit=crop',
    title: 'Fotografía',
    category: 'Difusión Cultural'
  },
  {
    src: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&h=400&fit=crop',
    title: 'Dibujo',
    category: 'Difusión Cultural'
  },
]

export function HeroSection({ heroRef }: { heroRef: React.RefObject<HTMLDivElement | null> | null }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % tallerImages.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + tallerImages.length) % tallerImages.length)
  }

  useEffect(() => {
    const interval = setInterval(nextSlide, 4000)
    return () => clearInterval(interval)
  }, [])

  const getVisibleImages = () => {
    const prev = (currentIndex - 1 + tallerImages.length) % tallerImages.length
    const next = (currentIndex + 1) % tallerImages.length
    return {
      prev: tallerImages[prev],
      current: tallerImages[currentIndex],
      next: tallerImages[next]
    }
  }

  const { prev, current, next: nextImg } = getVisibleImages()

  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-12 px-4">
      <WorkshopParticles />

      <div className="relative z-30 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="hero-reveal inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 mb-6">
          <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-white/80">Sistema de Talleres Escolares</span>
        </div>

        <h1 className="hero-reveal text-3xl sm:text-4xl md:text-5xl lg:text-[4.5rem] font-bold leading-[1.1] tracking-tight text-white mb-4 sm:mb-6">
          Gestiona talleres escolares{' '}
          <span className="text-[#722F37]">
            sin complicaciones
          </span>
        </h1>
        <p className="hero-reveal text-white/70 text-base sm:text-lg max-w-3xl mx-auto font-medium mb-8 sm:mb-10 leading-relaxed px-2">
          SITE automatiza inscripciones, asistencia y reportes para estudiantes, instructores y administradores.
        </p>

        <div className="hero-reveal flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
          <Link to="/auth" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full bg-gradient-to-r from-[#a85563] to-[#722F37] text-white font-semibold text-[14px] sm:text-[15px] hover:shadow-[0_8px_30px_rgba(114,47,55,0.3)] hover:scale-[1.02] transition-all duration-300 text-center">
            Inicio de sesión
          </Link>
          <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white/80 hover:text-white font-semibold text-[14px] sm:text-[15px] hover:bg-white/5 transition-all duration-300">
            Ver manual de usuario
          </button>
        </div>
      </div>

        <div className="hero-reveal relative w-full max-w-6xl mx-auto flex justify-center items-center mt-6 sm:mt-8 gap-2 md:gap-4 px-2 sm:px-4 md:px-16 z-20">
        <button
          onClick={prevSlide}
          className="absolute left-0 sm:left-2 z-30 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#722F37]/50 transition-all duration-300"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        <div className="relative w-full flex justify-center items-center gap-2 overflow-hidden">
          <div className="hidden md:block w-[32%] aspect-[4/3] rounded-2xl overflow-hidden transform -rotate-2 opacity-50 scale-95 transition-all duration-500 shadow-2xl">
            <img src={prev.src} alt={prev.title} className="w-full h-full object-cover" />
          </div>

          <div className="w-[85%] sm:w-[70%] md:w-[50%] aspect-[4/3] rounded-2xl overflow-hidden transition-all duration-500 shadow-2xl ring-2 ring-[#722F37]/30">
            <div className="relative w-full h-full">
              <img src={current.src} alt={current.title} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4">
                <p className="text-white font-bold text-base sm:text-lg md:text-xl">{current.title}</p>
                <p className="text-white/70 text-xs sm:text-sm">{current.category}</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-[32%] aspect-[4/3] rounded-2xl overflow-hidden transform rotate-2 opacity-50 scale-95 transition-all duration-500 shadow-2xl">
            <img src={nextImg.src} alt={nextImg.title} className="w-full h-full object-cover" />
          </div>
        </div>

        <button
          onClick={nextSlide}
          className="absolute right-0 sm:right-2 z-30 w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-[#722F37]/50 transition-all duration-300"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="flex justify-center gap-2 mt-4 sm:mt-6 z-20">
        {tallerImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-[#722F37] w-6' 
                : 'bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
