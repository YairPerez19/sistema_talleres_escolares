import { createFileRoute, Link } from '@tanstack/react-router'
import { RefreshCw } from '@/components/AnimatedIcons'
import {
  ArrowRight, Dumbbell, Trophy,
  Heart, Zap, Target, Shield, Activity, Footprints,
  Swords, Users, X,
  Bot, Theater, Music, Mic, Music2, Mic2, Palette, Camera,
  PenTool, Flag, FlagTriangleRight, Hand
} from '@/components/icons'
import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { usePageMeta } from '../hooks/usePageMeta'
import { HeroSection } from './-HeroSection'
import { QuizBot } from './-QuizBot'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const quotes = [
  {
    id: 'kahlo',
    category: 'Cultural',
    text: 'El arte es la expresión de los más profundos pensamientos por el camino más sencillo. Cada trazo, cada color, cada forma tiene una historia que contar.',
    author: 'Frida Kahlo',
    sport: 'Pintura / Artes Plásticas',
    gradient: 'from-violet-600/30 to-indigo-600/10',
    accent: 'border-violet-500/30',
  },
  {
    id: 'vicente',
    category: 'Musical',
    text: 'La música es el lenguaje universal que todos podemos entender. Donde las palabras fallan, la música habla.',
    author: 'Vicente Fernández',
    sport: 'Música / Canción / Rondalla',
    gradient: 'from-emerald-600/30 to-teal-600/10',
    accent: 'border-emerald-500/30',
  },
  {
    id: 'kasparov',
    category: 'Cultural',
    text: 'El ajedrez es como la vida misma: cada movimiento cuenta, cada decisión importa. La paciencia y la estrategia son las claves.',
    author: 'Garry Kasparov',
    sport: 'Ajedrez',
    gradient: 'from-slate-600/30 to-gray-600/10',
    accent: 'border-slate-500/30',
  },
  {
    id: 'jordan',
    category: 'Deportes',
    text: 'He fallado una y otra vez a lo largo de mi vida. Y es por eso que he tenido éxito. El talento gana partidos, pero el trabajo en equipo gana campeonatos.',
    author: 'Michael Jordan',
    sport: 'Baloncesto / Basquetbol',
    gradient: 'from-orange-600/30 to-red-600/10',
    accent: 'border-orange-500/30',
  },
  {
    id: 'pele',
    category: 'Deportes',
    text: 'El éxito no es la clave de la felicidad. La felicidad es la clave del éxito. Si amas lo que haces, tendrás éxito.',
    author: 'Pelé',
    sport: 'Fútbol',
    gradient: 'from-green-600/30 to-emerald-600/10',
    accent: 'border-green-500/30',
  },
  {
    id: 'shakespeare',
    category: 'Cultural',
    text: 'El teatro es el arte de mirar el alma humana. En el escenario, cada emoción se vuelve real, cada historia cobra vida.',
    author: 'William Shakespeare',
    sport: 'Teatro / Actuación',
    gradient: 'from-rose-600/30 to-pink-600/10',
    accent: 'border-rose-500/30',
  },
]

const categoriaTalleres = [
  {
    categoria: 'Difusión Cultural',
    emoji: '🎭',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    text: 'text-violet-400',
    glow: 'rgba(139, 92, 246, 0.15)',
    items: [
      { icon: <Theater className="w-5 h-5" />, title: 'Teatro', desc: 'Actuación, expresión y creación escénica.', color: '#8B5CF6' },
      { icon: <Music className="w-5 h-5" />, title: 'Danza', desc: 'Ritmo, movimiento y expresión corporal.', color: '#EC4899' },
      { icon: <Swords className="w-5 h-5" />, title: 'Ajedrez', desc: 'Estrategia, paciencia y mente fría.', color: '#6B7280' },
      { icon: <Mic className="w-5 h-5" />, title: 'Oratoria', desc: 'El arte de hablar con elocuencia.', color: '#14B8A6' },
      { icon: <Music2 className="w-5 h-5" />, title: 'Rondalla', desc: 'Música tradicional en conjunto.', color: '#F59E0B' },
      { icon: <Mic2 className="w-5 h-5" />, title: 'Canción', desc: 'Voz, interpretación y sentimiento.', color: '#EF4444' },
      { icon: <Palette className="w-5 h-5" />, title: 'Dibujo', desc: 'Trazo, creatividad y composición visual.', color: '#3B82F6' },
      { icon: <Camera className="w-5 h-5" />, title: 'Fotografía', desc: 'Captura momentos que cuentan historias.', color: '#10B981' },
      { icon: <PenTool className="w-5 h-5" />, title: 'Artesanías', desc: 'Creación manual con identidad cultural.', color: '#D97706' },
    ],
  },
  {
    categoria: 'Actividades Cívicas',
    emoji: '🇲🇽',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'rgba(245, 158, 11, 0.15)',
    items: [
      { icon: <Shield className="w-5 h-5" />, title: 'Banda de Guerra', desc: 'Disciplina, ritmo y tradición militar.', color: '#DC2626' },
      { icon: <Flag className="w-5 h-5" />, title: 'Escolta', desc: 'Honor, respeto y compromiso cívico.', color: '#F97316' },
      { icon: <FlagTriangleRight className="w-5 h-5" />, title: 'Banderas', desc: 'Protocolo y amor por la patria.', color: '#EAB308' },
    ],
  },
  {
    categoria: 'Promoción Deportiva',
    emoji: '⚽',
    color: 'from-emerald-400 to-green-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
    glow: 'rgba(52, 211, 153, 0.15)',
    items: [
      { icon: <Dumbbell className="w-5 h-5" />, title: 'Fútbol', desc: 'Técnica, táctica y trabajo en equipo.', color: '#22C55E' },
      { icon: <Activity className="w-5 h-5" />, title: 'Basquetbol', desc: 'Velocidad, precisión y coordinación.', color: '#F97316' },
      { icon: <Zap className="w-5 h-5" />, title: 'Atletismo', desc: 'Supera tus marcas en pista y campo.', color: '#06B6D4' },
      { icon: <Target className="w-5 h-5" />, title: 'Voleibol', desc: 'Reflejos, salto y comunicación.', color: '#EAB308' },
      { icon: <Hand className="w-5 h-5" />, title: 'Handball', desc: 'Agilidad, fuerza y estrategia rápida.', color: '#A855F7' },
      { icon: <Footprints className="w-5 h-5" />, title: 'Taekwondo', desc: 'Arte marcial, disciplina y respeto.', color: '#EC4899' },
      { icon: <Heart className="w-5 h-5" />, title: 'Baile', desc: 'Ritmo, expresión y energía positiva.', color: '#F43F5E' },
    ],
  },
]

const features = [
  { icon: <Users className="w-5 h-5" />, title: 'Instructores Capacitados', desc: 'Profesores expertos en cada disciplina, apasionados por enseñar y guiar tu desarrollo.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Instalaciones de Calidad', desc: 'Aulas, talleres, canchas y gimnasio equipados para tu máximo desempeño.' },
  { icon: <Trophy className="w-5 h-5" />, title: 'Eventos y Competencias', desc: 'Participa en muestras culturales, cívicas y torneos deportivos interescolares.' },
  { icon: <Heart className="w-5 h-5" />, title: 'Formación Integral', desc: 'Desarrolla habilidades artísticas, cívicas y deportivas que te acompañarán toda la vida.' },
]

function LandingPage() {
  const [currentQuote, setCurrentQuote] = useState(0)
  const [botOpen, setBotOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)

  usePageMeta({
    title: 'Inicio',
    description: 'Sistema Integral de Talleres Escolares del CBTis No. 61. Descubre talleres culturales, cívicos y deportivos. Inscríbete y desarrolla tu talento.',
    canonicalPath: '/',
  })

  useGSAP(() => {
    if (heroRef.current) {
      gsap.fromTo('.hero-reveal', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.3 })
    }
    if (statsRef.current) {
      gsap.fromTo('.stat-item', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', scrollTrigger: { trigger: statsRef.current, start: 'top 85%' } })
    }
  }, { scope: heroRef })

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col overflow-x-hidden max-w-[1400px] mx-auto min-h-screen">
      {/* === NAVBAR === */}
      <nav className="fixed top-4 left-0 right-0 z-50 px-4 md:px-8 w-full max-w-[1480px] mx-auto">
        <div className="mx-auto bg-[#050102]/85 backdrop-blur-xl border border-white/[0.08] rounded-[2rem] px-6 py-3.5 flex items-center justify-between shadow-[0_8px_40px_rgba(0,0,0,0.6)] shadow-[#ff0055]/5">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff0055]/20 to-[#800020]/20 border border-[#ff0055]/20 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(255,0,85,0.3)] transition-all duration-500">
              <Trophy className="w-5 h-5 text-[#ff0055]" />
            </div>
            <div>
              <p className="font-bold text-[16px] text-white leading-none tracking-tight">SITE</p>
              <p className="text-[9px] text-white/40 font-semibold tracking-[0.15em]">CBTIS 61</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/catalogo" className="hidden sm:flex px-5 py-2.5 rounded-xl text-[13px] font-semibold border border-white/10 text-white/70 hover:text-white hover:border-[#ff0055]/30 hover:bg-[#ff0055]/10 transition-all duration-300">
              Catálogo
            </Link>
            <Link to="/auth" className="px-5 py-2.5 rounded-xl text-[13px] font-bold bg-gradient-to-r from-[#ff0055] to-[#ff3377] text-white hover:shadow-[0_8px_25px_rgba(255,0,85,0.4)] hover:scale-105 transition-all duration-300">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      <HeroSection heroRef={heroRef} />

      {/* === STATS === */}
      <section ref={statsRef} className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        {[
          { value: '20+', label: 'Talleres Disponibles' },
          { value: '1,000+', label: 'Alumnos Activos' },
          { value: '3', label: 'Áreas de Formación' },
          { value: '97%', label: 'Participación' },
        ].map((s) => (
          <div key={s.label} className="stat-item glass-card p-6 text-center group rounded-2xl">
            <p className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#ff0055] to-[#ff3377] group-hover:scale-110 transition-transform duration-300">
              {s.value}
            </p>
            <p className="text-[11px] text-white/40 font-semibold tracking-wider uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* === QUOTES CAROUSEL === */}
      <section className="mt-16 relative z-10">
        <hr className="section-divider mb-12" />
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff0055]/70">Inspiración</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-8">Voces que inspiran</h2>
        <div className="relative overflow-hidden rounded-[3rem] bg-white/[0.01] border border-white/[0.04] p-1">
          {quotes.map((q, i) => (
            <div
              key={q.id}
              className={`transition-all duration-700 ${i === currentQuote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 absolute inset-0'}`}
              style={{ display: i === currentQuote ? 'block' : 'none' }}
            >
              <div className={`p-8 md:p-12 rounded-[2.5rem] bg-gradient-to-br ${q.gradient}`}>
                <div className={`inline-block px-3 py-1 rounded-full border ${q.accent} bg-white/[0.02] text-[10px] font-bold tracking-widest uppercase text-white/60 mb-6`}>
                  {q.category}
                </div>
                <blockquote className="text-xl md:text-2xl lg:text-3xl font-medium text-white/90 leading-relaxed mb-6 italic">
                  "{q.text}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff0055]/30 to-[#800020]/30 flex items-center justify-center text-lg font-bold text-white">
                    {q.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{q.author}</p>
                    <p className="text-[11px] text-white/40 font-medium">{q.sport}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-center gap-2 mt-4 pb-2">
            {quotes.map((q, i) => (
              <button
                type="button"
                key={q.id}
                aria-label={`Ir a la frase ${i + 1}`}
                onClick={() => setCurrentQuote(i)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentQuote ? 'bg-[#ff0055] w-6' : 'bg-white/20 hover:bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* === CATÁLOGO DE TALLERES === */}
      <section className="mt-20" id="talleres">
        <hr className="section-divider mb-12" />
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff0055]/70">Catálogo</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-3">
          Todos los Talleres
        </h2>
        <p className="text-white/40 text-center max-w-xl mx-auto mb-14 text-sm">
          Explora nuestra oferta completa de talleres culturales, cívicos y deportivos. Hay algo para cada talento.
        </p>

        {categoriaTalleres.map((cat) => (
          <div key={cat.categoria} className="mb-16 last:mb-0">
            <div className="flex items-center gap-4 mb-8">
              <span className="text-2xl">{cat.emoji}</span>
              <div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">{cat.categoria}</h3>
                <p className={`text-[11px] font-semibold tracking-wider uppercase ${cat.text}`}>{cat.items.length} talleres</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cat.items.map((t, idx) => (
                <Link
                  key={t.title}
                  to="/catalogo"
                  className="glass-card group relative p-5 overflow-hidden rounded-2xl"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className="absolute -inset-20 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${t.color}20 0%, transparent 70%)` }}
                  />
                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 workshop-icon-spin"
                      style={{ borderColor: `${t.color}40`, color: t.color, backgroundColor: `${t.color}10` }}
                    >
                      {t.icon}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h4 className="font-bold text-[15px] text-white mb-1 group-hover:text-[#ff0055] transition-colors duration-300">{t.title}</h4>
                      <p className="text-[12px] text-white/40 font-medium leading-relaxed">{t.desc}</p>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                    style={{ backgroundColor: t.color }}
                  />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* === FEATURES === */}
      <section className="mt-20 relative z-10">
        <hr className="section-divider mb-12" />
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-[#ff0055]/70">Ventajas</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-3">
          ¿Por qué elegirnos?
        </h2>
        <p className="text-white/40 text-center max-w-xl mx-auto mb-14 text-sm">
          Instalaciones, instructores y programas diseñados para tu desarrollo integral.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6 group rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff0055]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff0055]/10 to-[#800020]/10 border border-[#ff0055]/20 flex items-center justify-center text-[#ff0055] mb-5 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,0,85,0.3)] transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-bold text-[15px] text-white mb-2 group-hover:text-[#ff0055] transition-colors">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="mt-20 mb-16 relative rounded-[3rem] overflow-hidden border border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050102] via-[#0a0205] to-[#050102]" />
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-[#ff0055] opacity-[0.06] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-[#800020] opacity-[0.08] blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 px-8 md:px-20 py-20 md:py-28 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff0055]/20 to-[#800020]/20 border border-[#ff0055]/20 flex items-center justify-center mb-8 group hover:scale-110 transition-transform duration-500">
            <Trophy className="w-8 h-8 text-[#ff0055]" />
          </div>
          <h2 className="text-[3rem] md:text-[4.5rem] font-extrabold text-white mb-6 leading-none tracking-tight">
            Comienza tu{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff0055] to-[#ff3377]">
              nueva historia
            </span>
          </h2>
          <p className="text-white/50 text-lg md:text-xl max-w-lg mx-auto mb-12 font-medium">
            Únete a la nueva era de talleres escolares y descubre de lo que eres capaz. ¡Tu futuro empieza aquí!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/catalogo" className="px-8 py-4 rounded-2xl bg-white text-black font-bold text-base hover:scale-105 hover:shadow-[0_10px_40px_rgba(255,255,255,0.3)] transition-all flex items-center gap-2 group">
              Ver Catálogo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/auth" className="px-8 py-4 rounded-2xl text-white/70 hover:text-white font-bold text-base border border-white/10 hover:border-[#ff0055]/30 hover:bg-[#ff0055]/5 transition-all duration-300">
              Crear Cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="pb-10 pt-8">
        <hr className="section-divider mb-8" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ff0055]" />
            <span className="text-[13px] font-semibold text-white/60">SITE Talleres — CBTIS No. 61</span>
          </div>
          <p suppressHydrationWarning className="text-[11px] text-white/30 font-medium tracking-wide">
            Sistema Integral de Talleres Escolares &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      <QuizBot open={botOpen} setOpen={setBotOpen} />
    </div>
  )
}
