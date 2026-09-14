import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePageMeta } from '../hooks/usePageMeta'
import { HeroSection } from './-HeroSection'
import { ArrowUpRight, CheckCircle2, Shield, Users, Plus, Twitter, Instagram, Facebook, Menu, X } from 'lucide-react'

gsap.registerPlugin(ScrollTrigger)

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const features = [
  {
    title: 'Inscripción a Talleres',
    image: '/feature_students.png',
    footerLeft: 'Alumnos',
    footerRight: 'Eligen taller',
  },
  {
    title: 'Control de Asistencia',
    image: '/feature_keyboard.png',
    footerLeft: 'Instructores',
    footerRight: 'Marcan lista',
  },
  {
    title: 'Reportes de Talleres',
    image: '/feature_sync.png',
    footerLeft: 'Admin',
    footerRight: 'Supervisa',
  },
]

const stats = [
  { value: '1,200+', label: 'Alumnos Activos', icon: <Users className="w-4 h-4 text-[#a85563]" />, iconBg: 'bg-[#722F37]/30' },
  { value: '45', label: 'Talleres Disponibles', icon: <svg className="w-4 h-4 text-[#a85563]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>, iconBg: 'bg-[#722F37]/30' },
  { value: '98%', label: 'Asistencia Registrada', icon: <CheckCircle2 className="w-4 h-4 text-[#a85563]" />, iconBg: 'bg-[#722F37]/30' },
]

const team = [
  {
    name: 'Admin Jefe',
    role: 'Líder de Proyecto',
    desc: 'Supervisión general de la plataforma y estrategia.',
    image: '/team-1.png',
  },
  {
    name: 'Instructor',
    role: 'Coordinador Académico',
    desc: 'Asegurando la calidad en cada taller gestionado.',
    image: '/team-2.png',
  },
  {
    name: 'Desarrollador Lead',
    role: 'Tech Architect',
    desc: 'Manteniendo el sistema a la vanguardia tecnológica.',
    image: '/team-3.png',
  },
]

const testimonials = [
  {
    quote: 'Inscribirme a mis talleres ahora es increíblemente rápido y fácil.',
    name: 'Carlos M.',
    role: 'Alumno',
    image: '/avatar-carlos.png'
  },
  {
    quote: 'La asistencia ahora se marca en segundos, adiós a las hojas de papel.',
    name: 'Laura R.',
    role: 'Instructora',
    image: '/avatar-laura.png'
  },
  {
    quote: 'La visibilidad que obtengo con los reportes en tiempo real es incomparable.',
    name: 'Director P.',
    role: 'Administrador',
    image: '/avatar-director.png'
  },
  {
    quote: 'Me encanta poder ver mis calificaciones y asistencia en un solo lugar.',
    name: 'Sofía G.',
    role: 'Alumna',
    image: '/avatar-sofia.png'
  },
  {
    quote: 'Administrar mis talleres nunca fue tan fácil y organizado.',
    name: 'Juan A.',
    role: 'Instructor',
    image: '/avatar-juan.png'
  }
]

const faqs = [
  {
    q: '¿Cómo ingreso por primera vez?',
    a: 'Puedes iniciar sesión solicitando un código OTP enviado a tu correo o teléfono registrado.'
  },
  {
    q: '¿Puedo cambiar de taller?',
    a: 'Sí, durante las dos primeras semanas del semestre si hay disponibilidad de cupo en el otro taller.'
  }
]

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  usePageMeta({
    title: 'Inicio',
    description: 'Sistema Integral de Talleres Escolares del CBTis No. 61.',
    canonicalPath: '/',
  })

  useGSAP(() => {
    // Hero animations
    gsap.fromTo('.hero-reveal', 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
    )

    // Sections fade up
    gsap.utils.toArray('.fade-up-section').forEach((section: any) => {
      gsap.fromTo(section,
        { opacity: 0, y: 50 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.8, 
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
          }
        }
      )
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="flex flex-col overflow-x-hidden min-h-screen bg-black">
      {/* === NAVBAR === */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold text-lg text-white tracking-tight">SITE</span>
          </Link>

          <div className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-white/60">
            <Link to="/" className="text-white">Inicio</Link>
            <a href="#funciones" className="hover:text-white transition-colors">Funciones</a>
            <a href="#estadisticas" className="hover:text-white transition-colors">Estadísticas</a>
            <a href="#about" className="hover:text-white transition-colors">Nosotros</a>
            <a href="#team" className="hover:text-white transition-colors">Equipo</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonios</a>
          </div>

          <Link to="/auth" className="btn-wine-glow hidden sm:block px-5 py-2.5 text-[13px]">
            Inicio de sesión
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <Menu className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-md border-b border-white/10 py-6 px-4">
            <div className="flex flex-col gap-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-white text-lg font-medium py-2">Inicio</Link>
              <a href="#funciones" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white text-lg font-medium py-2 transition-colors">Funciones</a>
              <a href="#estadisticas" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white text-lg font-medium py-2 transition-colors">Estadísticas</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white text-lg font-medium py-2 transition-colors">Nosotros</a>
              <a href="#team" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white text-lg font-medium py-2 transition-colors">Equipo</a>
              <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white text-lg font-medium py-2 transition-colors">Testimonios</a>
              <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="btn-wine-glow sm:hidden mt-2 px-5 py-3 text-[15px] text-center">
                Inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </nav>

      <HeroSection heroRef={null} />

      {/* === FUNCIONALIDADES === */}
      <section id="funciones" className="fade-up-section mt-12 sm:mt-16 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/60">Funcionalidades Clave</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Potencia tu{' '}
            <span className="text-wine-glow">Experiencia</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base px-2">Herramientas diseñadas para facilitar cada proceso del ciclo de vida de un taller escolar.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-[#0f0f11] rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-4 flex flex-col h-[350px] sm:h-[400px] group border border-white/5 relative overflow-hidden">
              <div className="w-full h-[60%] sm:h-[65%] rounded-xl sm:rounded-2xl overflow-hidden bg-white/5 mb-4 sm:mb-6 relative">
                <img src={f.image} alt={f.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-3 sm:top-4 right-3 sm:right-4 w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                  <ArrowUpRight className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
                </div>
              </div>
              <div className="px-1 sm:px-2">
                <h3 className="text-base sm:text-lg font-bold text-white mb-auto">{f.title}</h3>
                <div className="flex justify-between items-center mt-4 sm:mt-6">
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/40">{f.footerLeft}</span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-white/40">{f.footerRight}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === PLATAFORMA === */}
      <section id="about" className="fade-up-section mt-20 sm:mt-28 md:mt-40 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/60">Nuestra Plataforma</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4 leading-tight">
            Una Solución Integral para{' '}
            <span className="text-wine-glow">CBTis No 61</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base px-2">SITE ha sido desarrollado para optimizar la organización escolar, permitiendo a todos los actores del ecosistema educativo enfocarse en lo que realmente importa.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          <div className="lg:w-[40%] bg-[#0f0f11] rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 flex flex-col justify-center border border-white/5">
            <div className="flex flex-col gap-6 sm:gap-10">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-[#722F37]/20 flex items-center justify-center shrink-0 mt-1">
                  <Users className="w-4 sm:w-5 h-4 sm:h-5 text-[#a85563]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">Gestión Basada en Roles</h4>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed">Acceso diferenciado para alumnos, instructores y administradores.</p>
                </div>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-[#722F37]/20 flex items-center justify-center shrink-0 mt-1">
                  <svg className="w-4 sm:w-5 h-4 sm:h-5 text-[#a85563]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">Seguimiento en Tiempo Real</h4>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed">Monitoreo constante de asistencia y desempeño académico.</p>
                </div>
              </div>

              <div className="w-full h-px bg-white/5" />

              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-[#722F37]/20 flex items-center justify-center shrink-0 mt-1">
                  <Shield className="w-4 sm:w-5 h-4 sm:h-5 text-[#a85563]" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">Seguridad Avanzada</h4>
                  <p className="text-xs sm:text-sm text-white/50 leading-relaxed">Autenticación OTP para proteger toda la información escolar.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-[60%] bg-[#0f0f11] rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden h-[250px] sm:h-[350px] md:h-[500px]">
            <img src="/platform_tablet.svg" alt="Panel de control SITE mostrando métricas de talleres" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-500" />
          </div>
        </div>
      </section>

      {/* === ESTADÍSTICAS === */}
      <section id="estadisticas" className="fade-up-section mt-20 sm:mt-28 md:mt-40 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/60">Resultados en Números</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Impacto SITE <span className="text-wine-glow">en la Comunidad</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base">Estamos transformando la eficiencia operativa del CBTis No 61.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#0f0f11] rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 flex flex-col items-center justify-center border border-white/5 group hover:border-[#722F37]/30 transition-colors">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className={`w-7 sm:w-8 h-7 sm:h-8 rounded-full ${s.iconBg} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <span className="text-xs sm:text-sm font-medium text-white/80">{s.label}</span>
              </div>
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* === TEAM === */}
      <section id="team" className="fade-up-section mt-20 sm:mt-28 md:mt-40 mb-16 sm:mb-24 md:mb-32 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/60">Nuestro Equipo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Arquitectos de la <span className="text-wine-glow">Solución</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base px-2">Profesionales comprometidos con la innovación tecnológica en el CBTis No 61.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {team.map((t, i) => (
            <div key={i} className="relative rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden aspect-[3/4] group border border-white/5">
              <img src={t.image} alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

              <div className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 bg-[#111111] border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 sm:mb-3">
                  <h4 className="text-base sm:text-lg font-bold text-white">{t.name}</h4>
                  <span className="text-[9px] sm:text-[10px] font-medium text-white/60 bg-white/5 px-2 py-1 rounded-md">{t.role}</span>
                </div>
                <p className="text-[10px] sm:text-xs text-white/50 leading-relaxed mb-3 sm:mb-4">{t.desc}</p>
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-3 sm:w-4 h-3 sm:h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section id="testimonials" className="fade-up-section mt-20 sm:mt-28 md:mt-40 px-4 sm:px-6 max-w-[1400px] mx-auto w-full overflow-hidden">
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-4 sm:mb-6">
            <span className="text-[10px] sm:text-[11px] font-medium text-white/60">Voces de Nuestra Comunidad</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Lo que dicen <span className="text-wine-glow">de nosotros</span>
          </h2>
          <p className="text-white/60 text-sm sm:text-base px-2">La satisfacci&oacute;n de quienes ya gestionan sus talleres con SITE.</p>
        </div>

        <div className="testimonials-3d-scene">
          <div className="relative overflow-hidden py-6">
            <div className="flex gap-5 sm:gap-7 animate-scroll-left-3d">
              {[...testimonials, ...testimonials].map((t, i) => (
                <div key={`a-${i}`} className="testimonial-3d-card flex-shrink-0 w-[290px] sm:w-[360px]">
                  <div className="testimonial-3d-inner">
                    <div className="testimonial-3d-reflection" />
                    <p className="text-white/80 font-medium leading-relaxed text-xs sm:text-sm relative z-10">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 mt-4 relative z-10">
                      <div className="testimonial-3d-avatar">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-white">{t.name}</span>
                        <span className="text-[10px] sm:text-xs text-white/40 font-medium">{t.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden py-6">
            <div className="flex gap-5 sm:gap-7 animate-scroll-right-3d">
              {[...testimonials.slice().reverse(), ...testimonials.slice().reverse()].map((t, i) => (
                <div key={`b-${i}`} className="testimonial-3d-card flex-shrink-0 w-[290px] sm:w-[360px]">
                  <div className="testimonial-3d-inner">
                    <div className="testimonial-3d-reflection" />
                    <p className="text-white/80 font-medium leading-relaxed text-xs sm:text-sm relative z-10">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3 mt-4 relative z-10">
                      <div className="testimonial-3d-avatar">
                        <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-white">{t.name}</span>
                        <span className="text-[10px] sm:text-xs text-white/40 font-medium">{t.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === FAQ === */}
      <section className="fade-up-section mt-20 sm:mt-28 md:mt-40 px-4 sm:px-6 max-w-[1000px] mx-auto w-full bg-[#0a0a0a] rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 p-6 sm:p-8 md:p-16">
        <div className="text-center mb-8 sm:mb-12">
          <span className="text-[10px] sm:text-[11px] font-medium text-white/60 mb-4 sm:mb-6 block">Preguntas Frecuentes</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
            Todo lo que necesitas <span className="text-wine-glow">saber</span>
          </h2>
          <p className="text-white/60 mb-6 sm:mb-8 text-sm sm:text-base">Resolvemos tus dudas sobre el uso de la plataforma.</p>
          <button className="px-5 sm:px-6 py-2 rounded-full bg-gradient-to-r from-[#a85563]/80 to-[#722F37]/80 text-white font-medium text-xs sm:text-sm">
            General
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/5 last:border-0 pb-3 sm:pb-4">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-3 sm:py-4 text-left group"
              >
                <span className="text-white font-medium text-sm sm:text-base group-hover:text-wine-glow transition-colors">{faq.q}</span>
                <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#722F37]/20 transition-colors shrink-0 ml-3 sm:ml-4">
                  <Plus className={`w-3 sm:w-4 h-3 sm:h-4 text-white transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`} />
                </div>
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-white/50 text-xs sm:text-sm pb-3 sm:pb-4">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === CTA === */}
      <section className="fade-up-section mt-16 sm:mt-24 md:mt-32 px-4 sm:px-6 max-w-[1200px] mx-auto w-full">
        <div className="bg-[#0f0f11] rounded-[2rem] sm:rounded-[3rem] border border-white/5 p-8 sm:p-12 md:p-24 text-center flex flex-col items-center">
          <span className="text-[10px] sm:text-[11px] font-medium text-white/60 mb-4 sm:mb-6 block">Comienza Ahora</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 sm:mb-10 max-w-3xl leading-tight">
            ¿Listo para optimizar la gestión de tu taller? Únete a <span className="text-wine-glow">SITE hoy.</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/auth" className="btn-wine-glow px-6 sm:px-8 py-3 sm:py-3.5 text-sm">
              Inicio de sesión
            </Link>
            <button className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-full bg-black border border-white/10 text-white hover:bg-white/5 transition-colors font-medium text-sm">
              Soporte Técnico
            </button>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="mt-16 sm:mt-24 md:mt-32 px-4 sm:px-6 max-w-[1200px] mx-auto w-full mb-8 sm:mb-12">
        <div className="bg-[#0a0a0a] rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 sm:p-8 md:p-16 pb-4 sm:pb-8">
            <h1 className="text-[15vw] sm:text-[12vw] md:text-[8rem] font-black tracking-tighter text-white leading-none whitespace-nowrap overflow-hidden">
              SITE CBTis No 61
            </h1>
          </div>

          <div className="px-6 sm:px-8 md:px-16 pb-6 sm:pb-8">
            <div className="w-full h-px bg-white/10 mb-4 sm:mb-6"></div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
              <span className="text-white/40 text-xs sm:text-sm text-center md:text-left">© 2024 CBTis No 61. Todos los derechos reservados.</span>
              <div className="flex items-center gap-3 sm:gap-4">
                <a href="#" className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-white/5 hover:bg-[#722F37]/20 text-white/60 hover:text-wine-glow flex items-center justify-center transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-white/5 hover:bg-[#722F37]/20 text-white/60 hover:text-wine-glow flex items-center justify-center transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 sm:w-10 h-9 sm:h-10 rounded-full bg-white/5 hover:bg-[#722F37]/20 text-white/60 hover:text-wine-glow flex items-center justify-center transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }
        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }
        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }

        .testimonials-3d-scene {
          perspective: 1200px;
          perspective-origin: 50% 50%;
        }

        .testimonial-3d-card {
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }

        .testimonial-3d-card:hover {
          transform: translateZ(30px) rotateY(-4deg) rotateX(2deg) scale(1.03);
          z-index: 10;
        }

        .testimonial-3d-inner {
          position: relative;
          padding: 1.5rem;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border-radius: 1.5rem;
          background: linear-gradient(145deg, rgba(20, 12, 16, 0.9) 0%, rgba(10, 5, 8, 0.95) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.4),
            0 12px 48px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transform-style: preserve-3d;
          overflow: hidden;
          transition: box-shadow 0.6s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.4s ease;
        }

        .testimonial-3d-card:hover .testimonial-3d-inner {
          border-color: rgba(139, 26, 50, 0.25);
          box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 24px 64px rgba(0, 0, 0, 0.4),
            0 0 40px rgba(139, 26, 50, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }

        .testimonial-3d-reflection {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
          border-radius: 1.5rem 1.5rem 0 0;
          pointer-events: none;
          transition: opacity 0.4s ease;
        }

        .testimonial-3d-card:hover .testimonial-3d-reflection {
          opacity: 0.6;
        }

        .testimonial-3d-avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid rgba(139, 26, 50, 0.3);
          box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          transform: translateZ(15px);
          transition: transform 0.4s ease, border-color 0.4s ease;
        }

        .testimonial-3d-card:hover .testimonial-3d-avatar {
          transform: translateZ(25px);
          border-color: rgba(139, 26, 50, 0.5);
        }

        @keyframes scroll-left-3d {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes scroll-right-3d {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-scroll-left-3d {
          animation: scroll-left-3d 45s linear infinite;
        }
        .animate-scroll-right-3d {
          animation: scroll-right-3d 45s linear infinite;
        }
        .animate-scroll-left-3d:hover,
        .animate-scroll-right-3d:hover {
          animation-play-state: paused;
        }

        @media (min-width: 640px) {
          .testimonial-3d-inner {
            padding: 1.75rem;
            min-height: 200px;
            border-radius: 2rem;
          }
          .testimonial-3d-reflection {
            border-radius: 2rem 2rem 0 0;
          }
          .testimonial-3d-avatar {
            width: 52px;
            height: 52px;
            border-radius: 16px;
          }
        }

        @media (max-width: 640px) {
          .animate-scroll-left-3d {
            animation-duration: 35s;
          }
          .animate-scroll-right-3d {
            animation-duration: 35s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-scroll-left-3d,
          .animate-scroll-right-3d {
            animation-duration: 120s;
          }
          .testimonial-3d-card {
            transition: none;
          }
          .testimonial-3d-card:hover {
            transform: none;
          }
        }
      `}</style>

    </div>
  )
}
