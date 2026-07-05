import { useState, useEffect, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { Bot, X } from '@/components/icons'
import { RefreshCw } from '@/components/AnimatedIcons'

const quizQuestions = [
  {
    q: '¿Qué tipo de actividad te llama más?',
    options: [
      { text: 'Arte y cultura', value: 'cultural' },
      { text: 'Deporte y movimiento', value: 'deporte' },
      { text: 'Cívico y disciplina', value: 'civico' },
    ],
  },
  {
    q: '¿Cómo prefieres trabajar?',
    options: [
      { text: 'En equipo', value: 'equipo' },
      { text: 'De forma individual', value: 'individual' },
      { text: 'Ambos me gustan', value: 'ambos' },
    ],
  },
  {
    q: '¿Qué buscas principalmente?',
    options: [
      { text: 'Expresarme y crear', value: 'crear' },
      { text: 'Competir y superarme', value: 'competir' },
      { text: 'Socializar y convivir', value: 'social' },
    ],
  },
]

type Answer = { q: string; a: string }
type Message = { role: 'bot' | 'user'; text: string }

const results: Record<string, { taller: string; desc: string; icon: string }> = {
  cultural_equipo_crear: { taller: 'Teatro', desc: 'El teatro es perfecto para ti: expresión, creatividad y trabajo en equipo sobre el escenario.', icon: '🎭' },
  cultural_equipo_competir: { taller: 'Danza', desc: 'La danza te reta a superarte mientras creas arte en equipo con ritmo y pasión.', icon: '💃' },
  cultural_equipo_social: { taller: 'Rondalla', desc: 'La rondalla es música en equipo. Comparte tu talento y haz amigos mientras tocan juntos.', icon: '🎵' },
  cultural_individual_crear: { taller: 'Dibujo', desc: 'El dibujo te permite crear mundos con tus propias manos. Expresa lo que llevas dentro.', icon: '🎨' },
  cultural_individual_competir: { taller: 'Ajedrez', desc: 'El ajedrez reta tu mente. Estrategia, paciencia y competencia intelectual en cada partida.', icon: '♟️' },
  cultural_individual_social: { taller: 'Fotografía', desc: 'La fotografía conecta con el mundo. Captura momentos y comparte tu visión única.', icon: '📷' },
  cultural_ambos_crear: { taller: 'Artesanías', desc: 'Las artesanías combinan creatividad y tradición. Crea piezas únicas con tus manos.', icon: '✂️' },
  cultural_ambos_competir: { taller: 'Oratoria', desc: 'La oratoria es el arte de la palabra. Convence, inspira y lidera con tu voz.', icon: '🎤' },
  cultural_ambos_social: { taller: 'Canción', desc: 'La canción une voces y corazones. Expresa tus emociones a través de la música.', icon: '🎤' },
  deporte_equipo_crear: { taller: 'Baile', desc: 'El baile combina ritmo, expresión y energía en equipo. Muévete y disfruta.', icon: '🕺' },
  deporte_equipo_competir: { taller: 'Fútbol', desc: 'El fútbol es pasión en equipo. Velocidad, estrategia y competencia en el campo.', icon: '⚽' },
  deporte_equipo_social: { taller: 'Voleibol', desc: 'El voleibol es diversión en equipo. Reflejos, salto y mucha energía positiva.', icon: '🏐' },
  deporte_individual_competir: { taller: 'Atletismo', desc: 'El atletismo te reta a superar tus propias marcas. Velocidad, resistencia y superación personal.', icon: '🏃' },
  deporte_individual_social: { taller: 'Taekwondo', desc: 'Arte marcial, disciplina y respeto. Crece como persona mientras aprendes defensa personal.', icon: '🥋' },
  deporte_ambos_competir: { taller: 'Basquetbol', desc: 'El basquetbol tiene todo: equipo, velocidad y competencia intensa en la cancha.', icon: '🏀' },
  deporte_ambos_social: { taller: 'Handball', desc: 'Acción rápida, trabajo en equipo y mucha diversión.', icon: '🤾' },
  civico_equipo_crear: { taller: 'Banda de Guerra', desc: 'La banda de guerra une música y disciplina. Sé parte de un equipo que marca el ritmo.', icon: '🎺' },
  civico_equipo_competir: { taller: 'Escolta', desc: 'La escolta es compromiso y honor. Representa a tu escuela con orgullo y disciplina.', icon: '🚩' },
  civico_equipo_social: { taller: 'Banderas', desc: 'Protocolo, tradición y trabajo en equipo al servicio de la patria.', icon: '🏳️' },
  civico_individual_competir: { taller: 'Ajedrez', desc: 'El ajedrez desarrolla tu mente estratégica. Cada partida es una batalla de ingenio.', icon: '♟️' },
  civico_individual_social: { taller: 'Oratoria', desc: 'La oratoria te da el poder de la palabra. Habla con confianza y lidera con tu voz.', icon: '🎤' },
  civico_ambos_competir: { taller: 'Escolta', desc: 'La escolta te forma en disciplina, respeto y excelencia.', icon: '🚩' },
  civico_ambos_social: { taller: 'Banda de Guerra', desc: 'La banda de guerra forja carácter y amistad. Música, disciplina y hermandad.', icon: '🎺' },
}

const defaultResult = { taller: 'Teatro', desc: '¡El teatro es para ti! Desarrolla tu creatividad, expresión y trabajo en equipo mientras te diviertes.', icon: '🎭' }

function getResult(answers: Answer[]) {
  const key = answers.map(a => a.a).join('_')
  return results[key] || defaultResult
}

export function QuizBot({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente de talleres. Responde 3 preguntas y te recomendaré el taller perfecto para ti. ¿Comenzamos?' },
  ])
  const [done, setDone] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleAnswer = (value: string) => {
    const q = quizQuestions[step]
    const newAnswers = [...answers, { q: q.q, a: value }]
    setAnswers(newAnswers)
    setMessages(prev => [...prev, { role: 'user', text: q.options.find(o => o.value === value)?.text || value }])

    if (step + 1 < quizQuestions.length) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: quizQuestions[step + 1].q }])
        setStep(step + 1)
      }, 600)
    } else {
      const r = getResult(newAnswers)
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: `🎯 Te recomiendo: **${r.taller}**\n\n${r.desc}\n\n${r.icon} ¿Te gustaría inscribirte? Ve al catálogo para más información.`
        }])
        setDone(true)
      }, 600)
    }
  }

  const reset = () => {
    setStep(0)
    setAnswers([])
    setMessages([{ role: 'bot', text: '¡Hola! Soy tu asistente de talleres. Responde 3 preguntas y te recomendaré el taller perfecto para ti. ¿Comenzamos?' }])
    setDone(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#ff0055] to-[#ff3377] shadow-xl shadow-[#ff0055]/30 flex items-center justify-center hover:scale-110 transition-transform duration-300 animate-pulse-glow"
      >
        <Bot className="w-6 h-6 text-white" />
      </button>

      <div className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl bg-[#0a0205]/95 backdrop-blur-[24px] border border-white/10 shadow-2xl shadow-black/50 transition-all duration-400 ${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff0055]/20 to-[#800020]/20 border border-[#ff0055]/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#ff0055]" />
            </div>
            <div>
              <p className="font-bold text-[13px] text-white">Asistente de Talleres</p>
              <p className="text-[9px] text-white/40 font-medium">IA de recomendaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {done && (
              <button type="button" onClick={reset} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <RefreshCw className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
        </div>

        <div className="p-4 h-[320px] overflow-y-auto custom-scrollbar space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-[#ff0055] to-[#ff3377] text-white font-semibold rounded-tr-md'
                  : 'bg-white/5 text-white/80 rounded-tl-md'
              }`}>
                {m.text}
              </div>
            </div>
          ))}

          {!done && step < quizQuestions.length && (
            <div className="space-y-2 mt-3">
              <p className="text-[11px] font-semibold text-[#ff0055] uppercase tracking-wider">Elige una opción:</p>
              <div className="grid gap-1.5">
                {quizQuestions[step].options.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="text-left px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[12px] font-medium hover:bg-[#ff0055]/20 hover:text-white hover:border-[#ff0055]/40 transition-all duration-200"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {done && (
            <Link to="/catalogo" className="block mt-3 text-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff0055] to-[#ff3377] text-white font-bold text-[12px] hover:shadow-[0_8px_25px_rgba(255,0,85,0.4)] transition-all">
              Ver Catálogo de Talleres
            </Link>
          )}

          <div ref={endRef} />
        </div>
      </div>
    </>
  )
}
