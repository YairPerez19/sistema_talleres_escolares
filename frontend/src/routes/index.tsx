import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight, LogIn, Dumbbell, Trophy,
  ChevronRight, ChevronLeft, Heart, Zap, Target, Shield, Activity, Footprints,
  Swords, Users, X, RefreshCw,
  Bot, CheckCircle2, Theater, Music, Mic, Music2, Mic2, Palette, Camera,
  PenTool, Flag, FlagTriangleRight, Hand
} from '@/components/AnimatedIcons'
import { useState, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const quotes = [
  {
    category: 'Cultural',
    text: 'El arte es la expresión de los más profundos pensamientos por el camino más sencillo. Cada trazo, cada color, cada forma tiene una historia que contar. No pintas lo que ves, pintas lo que sientes. Y cuando el arte se vuelve tu lenguaje, el mundo entero te entiende.',
    author: 'Frida Kahlo',
    sport: 'Pintura / Artes Plásticas',
    bio: 'Frida Kahlo fue una de las artistas más influyentes del siglo XX. Su obra refleja su vida, su dolor y su pasión por México. Con más de 200 obras, se convirtió en un ícono del arte, la resiliencia y la expresión cultural a nivel mundial.',
    gradient: 'from-blue-600/30 to-indigo-600/10',
    initial: 'FK',
  },
  {
    category: 'Musical',
    text: 'La música es el lenguaje universal que todos podemos entender. No importa de dónde vengas, una canción puede hacerte sentir alegría, tristeza, esperanza. Donde las palabras fallan, la música habla. Y cuando cantas, el alma se conecta con el mundo.',
    author: 'Vicente Fernández',
    sport: 'Música / Canción / Rondalla',
    bio: 'Vicente Fernández fue una leyenda de la música mexicana. Con más de 50 años de carrera, 100 millones de discos vendidos y múltiples premios, su voz y carisma lo convirtieron en un símbolo cultural que trascendió fronteras y generaciones.',
    gradient: 'from-green-600/30 to-emerald-600/10',
    initial: 'VF',
  },
  {
    category: 'Cultural',
    text: 'El ajedrez es como la vida misma: cada movimiento cuenta, cada decisión importa. A veces sacrificas una pieza para ganar la partida. La paciencia, la estrategia y la perseverancia son las claves. No importa cuántas veces pierdas, sino cuántas aprendas de cada partida.',
    author: 'Garry Kasparov',
    sport: 'Ajedrez',
    bio: 'Garry Kasparov es considerado el mejor ajedrecista de la historia. Fue campeón mundial durante 15 años. Su pensamiento estratégico, memoria prodigiosa y capacidad de análisis lo convirtieron en una leyenda del juego ciencia y un referente de la inteligencia humana.',
    gradient: 'from-slate-600/30 to-gray-600/10',
    initial: 'GK',
  },
  {
    category: 'Deportes',
    text: 'Nunca digas nunca, porque los límites, como los miedos, a menudo son solo una ilusión. He fallado una y otra vez a lo largo de mi vida. Y es por eso que he tenido éxito. El talento gana partidos, pero el trabajo en equipo y la inteligencia ganan campeonatos.',
    author: 'Michael Jordan',
    sport: 'Baloncesto / Basquetbol',
    bio: 'Considerado el mejor jugador de baloncesto de todos los tiempos. Ganó 6 campeonatos de la NBA con los Chicago Bulls y 2 medallas de oro olímpicas. Su ética de trabajo y mentalidad competitiva lo convirtieron en un ícono global del deporte.',
    gradient: 'from-orange-600/30 to-red-600/10',
    initial: 'MJ',
  },
  {
    category: 'Deportes',
    text: 'El éxito no es la clave de la felicidad. La felicidad es la clave del éxito. Si amas lo que haces, tendrás éxito. He descubierto que mientras más duro trabajo, más suerte tengo. No se trata de ser el mejor. Se trata de ser mejor de lo que eras ayer.',
    author: 'Pelé',
    sport: 'Fútbol',
    bio: 'Edson Arantes do Nascimento, conocido como Pelé, es el futbolista más legendario de la historia. Ganó 3 Copas del Mundo con Brasil y anotó más de 1,200 goles en su carrera. Es símbolo de excelencia, humildad y pasión por el deporte.',
    gradient: 'from-green-600/30 to-emerald-600/10',
    initial: '10',
  },
  {
    category: 'Cultural',
    text: 'El teatro es el arte de mirar el alma humana. En el escenario, cada emoción se vuelve real, cada historia cobra vida. No necesitas ser perfecto para actuar, necesitas ser auténtico. La actuación no es fingir, es recordar lo que significa ser humano.',
    author: 'William Shakespeare',
    sport: 'Teatro / Actuación',
    bio: 'William Shakespeare es el escritor más importante de la literatura universal. Sus obras teatrales, como Hamlet, Romeo y Julieta y Macbeth, han sido representadas durante más de 400 años. Su legado cultural es una fuente inagotable de inspiración artística.',
    gradient: 'from-rose-600/30 to-pink-600/10',
    initial: 'WS',
  },
  {
    category: 'Deportes',
    text: 'Flota como una mariposa, pica como una abeja. El hombre que no tiene imaginación no tiene alas. No es la cantidad de veces que te derriban lo que importa, es la cantidad de veces que te levantas. Imposible es solo una palabra para los que temen soñar.',
    author: 'Muhammad Ali',
    sport: 'Boxeo / Taekwondo',
    bio: 'Muhammad Ali fue el boxeador más icónico de la historia. Campeón mundial de peso pesado en tres ocasiones, su carisma, convicción y lucha por la justicia social lo elevaron a la categoría de leyenda dentro y fuera del ring.',
    gradient: 'from-yellow-600/30 to-amber-600/10',
    initial: 'MA',
  },
  {
    category: 'Cívica',
    text: 'La disciplina es el puente entre tus metas y tus logros. El orden, el respeto y la lealtad no son solo valores, son la base de toda gran nación. Un equipo unido es imparable. Marchar juntos al mismo ritmo es más poderoso que marchar solo.',
    author: 'Benito Juárez',
    sport: 'Cívica / Escolta / Banda de Guerra',
    bio: 'Benito Juárez, Benemérito de las Américas, fue presidente de México y símbolo de la soberanía nacional. Su frase "Entre los individuos como entre las naciones, el respeto al derecho ajeno es la paz" es un pilar del civismo mexicano.',
    gradient: 'from-amber-600/30 to-yellow-600/10',
    initial: 'BJ',
  },
  {
    category: 'Deportes',
    text: 'Nunca te rindas. Los sueños no funcionan a menos que tú lo hagas. El deporte no construye el carácter, lo revela. Cuando quieres ganar tanto como quieres respirar, entonces tendrás éxito. No hay atajos para llegar a un lugar que vale la pena.',
    author: 'Usain Bolt',
    sport: 'Atletismo',
    bio: 'Usain Bolt es el hombre más rápido de la historia. Posee los récords mundiales en 100m, 200m y 4x100m, y ha ganado 8 medallas de oro olímpicas. Su carisma y dominio absoluto en la pista lo convirtieron en una superestrella global.',
    gradient: 'from-sky-600/30 to-blue-600/10',
    initial: 'UB',
  },
  {
    category: 'Cultural',
    text: 'La fotografía es el arte de congelar el tiempo. Cada imagen cuenta una historia que las palabras no pueden expresar. Una buena foto no solo se ve, se siente. Capturar un instante único es tener el poder de emocionar a quienes lo miran.',
    author: 'Ansel Adams',
    sport: 'Fotografía',
    bio: 'Ansel Adams fue un fotógrafo estadounidense conocido por sus impresionantes fotografías en blanco y negro de la naturaleza. Su técnica y visión artística revolucionaron la fotografía y lo convirtieron en un referente mundial del arte visual.',
    gradient: 'from-stone-600/30 to-neutral-600/10',
    initial: 'AA',
  },
  {
    category: 'Deportes',
    text: 'La vida no se trata de esperar a que pase la tormenta, se trata de aprender a bailar bajo la lluvia. No importa cuántas veces te caigas, sino cuántas veces te levantes. La perseverancia es la clave. Cada campeón fue alguna vez un contendiente que se negó a rendirse.',
    author: 'Simone Biles',
    sport: 'Gimnasia / Baile',
    bio: 'Simone Biles es la gimnasta más condecorada de la historia. Con 7 medallas olímpicas y 25 medallas mundiales, ha redefinido los límites de su deporte. Su valentía al priorizar su salud mental inspiró a millones alrededor del mundo.',
    gradient: 'from-pink-600/30 to-rose-600/10',
    initial: 'SB',
  },
  {
    category: 'Deportes',
    text: 'El único límite es el que tú mismo te pones. Los sueños no se hacen realidad por arte de magia, se hacen realidad con sudor, determinación y trabajo duro. Cada día es una nueva oportunidad para ser mejor que ayer. Levántate y lucha por lo que quieres.',
    author: 'Rafa Nadal',
    sport: 'Tenis / Deporte en General',
    bio: 'Rafael Nadal es considerado uno de los mejores tenistas de la historia. Con 22 títulos de Grand Slam, su garra, humildad y capacidad de superación lo han convertido en un ejemplo de perseverancia para el mundo entero.',
    gradient: 'from-yellow-600/30 to-orange-600/10',
    initial: 'RN',
  },
  {
    category: 'Cultural',
    text: 'Las palabras tienen el poder de construir mundos. La oratoria no es solo hablar, es conmover, inspirar y transformar. Una voz firme y clara puede mover montañas. El arte de la palabra bien dicha es el arma más poderosa que existe.',
    author: 'Cicerón',
    sport: 'Oratoria / Declamación',
    bio: 'Marco Tulio Cicerón fue el más grande orador de la antigua Roma. Sus discursos y escritos sentaron las bases de la retórica occidental. Su legado demuestra que la palabra bien empleada es la herramienta más poderosa para influir en el mundo.',
    gradient: 'from-teal-600/30 to-cyan-600/10',
    initial: 'CT',
  },
  {
    category: 'Cívica',
    text: 'La patria no es el suelo donde nacimos, es el lugar donde podemos ser libres. El honor de portar una bandera es defender con orgullo los valores que representa. Ser escolta es compromiso, es lealtad, es amor por nuestra nación.',
    author: 'José María Morelos',
    sport: 'Escolta / Banderas / Cívica',
    bio: 'José María Morelos fue uno de los líderes más importantes de la Independencia de México. Su visión de justicia, libertad y soberanía lo convirtió en un símbolo del civismo y el amor por la patria que inspira a las nuevas generaciones.',
    gradient: 'from-red-600/30 to-rose-600/10',
    initial: 'JM',
  },
  {
    category: 'Deportes',
    text: 'Disfruta las pequeñas cosas, porque un día mirarás atrás y te darás cuenta de que eran las grandes cosas. El éxito no es un accidente. Es trabajo duro, perseverancia, aprendizaje, estudio, sacrificio y, sobre todo, amor por lo que haces.',
    author: 'Serena Williams',
    sport: 'Tenis / Deporte Femenil',
    bio: 'Serena Williams es una de las atletas más dominantes de la historia. Con 23 títulos de Grand Slam, ha sido una fuerza imparable en el tenis femenino. Su poder, determinación y lucha por la igualdad la convierten en un ícono dentro y fuera de la cancha.',
    gradient: 'from-purple-600/30 to-violet-600/10',
    initial: 'SW',
  },
]

const categoriaTalleres = [
  {
    categoria: 'Difusión Cultural',
    color: 'from-[#ff0055] to-rose-600',
    bg: 'bg-[#ff0055]/10',
    border: 'border-[#ff0055]/20',
    text: 'text-[#ff0055]',
    glow: 'rgba(255,0,85,0.15)',
    items: [
      { icon: <Theater className="w-5 h-5" />, title: 'Teatro', desc: 'Actuación, expresión y creación escénica.', color: '#8B5CF6', bg: 'bg-violet-500/15', border: 'border-violet-500/25' },
      { icon: <Music className="w-5 h-5" />, title: 'Danza', desc: 'Ritmo, movimiento y expresión corporal.', color: '#EC4899', bg: 'bg-pink-500/15', border: 'border-pink-500/25' },
      { icon: <Swords className="w-5 h-5" />, title: 'Ajedrez', desc: 'Estrategia, paciencia y mente fría.', color: '#6B7280', bg: 'bg-gray-500/15', border: 'border-gray-500/25' },
      { icon: <Mic className="w-5 h-5" />, title: 'Oratoria', desc: 'El arte de hablar con elocuencia.', color: '#14B8A6', bg: 'bg-teal-500/15', border: 'border-teal-500/25' },
      { icon: <Music2 className="w-5 h-5" />, title: 'Rondalla', desc: 'Música tradicional en conjunto.', color: '#F59E0B', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
      { icon: <Mic2 className="w-5 h-5" />, title: 'Canción', desc: 'Voz, interpretación y sentimiento.', color: '#EF4444', bg: 'bg-red-500/15', border: 'border-red-500/25' },
      { icon: <Palette className="w-5 h-5" />, title: 'Dibujo', desc: 'Trazo, creatividad y composición visual.', color: '#3B82F6', bg: 'bg-blue-500/15', border: 'border-blue-500/25' },
      { icon: <Camera className="w-5 h-5" />, title: 'Fotografía', desc: 'Captura momentos que cuentan historias.', color: '#10B981', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
      { icon: <PenTool className="w-5 h-5" />, title: 'Artesanías', desc: 'Creación manual con identidad cultural.', color: '#D97706', bg: 'bg-yellow-600/15', border: 'border-yellow-600/25' },
    ],
  },
  {
    categoria: 'Actividades Cívicas',
    color: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
    glow: 'rgba(245,158,11,0.15)',
    items: [
      { icon: <Shield className="w-5 h-5" />, title: 'Banda de Guerra', desc: 'Disciplina, ritmo y tradición militar.', color: '#DC2626', bg: 'bg-red-500/15', border: 'border-red-500/25' },
      { icon: <Flag className="w-5 h-5" />, title: 'Escolta', desc: 'Honor, respeto y compromiso cívico.', color: '#F97316', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
      { icon: <FlagTriangleRight className="w-5 h-5" />, title: 'Banderas', desc: 'Protocolo y amor por la patria.', color: '#EAB308', bg: 'bg-yellow-500/15', border: 'border-yellow-500/25' },
    ],
  },
  {
    categoria: 'Promoción Deportiva',
    color: 'from-fuchsia-500 to-purple-600',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
    text: 'text-fuchsia-400',
    glow: 'rgba(217,70,239,0.15)',
    items: [
      { icon: <Dumbbell className="w-5 h-5" />, title: 'Fútbol', desc: 'Técnica, táctica y trabajo en equipo.', color: '#22C55E', bg: 'bg-green-500/15', border: 'border-green-500/25' },
      { icon: <Activity className="w-5 h-5" />, title: 'Basquetbol', desc: 'Velocidad, precisión y coordinación.', color: '#F97316', bg: 'bg-orange-500/15', border: 'border-orange-500/25' },
      { icon: <Zap className="w-5 h-5" />, title: 'Atletismo', desc: 'Supera tus marcas en pista y campo.', color: '#06B6D4', bg: 'bg-cyan-500/15', border: 'border-cyan-500/25' },
      { icon: <Target className="w-5 h-5" />, title: 'Voleibol', desc: 'Reflejos, salto y comunicación.', color: '#EAB308', bg: 'bg-yellow-500/15', border: 'border-yellow-500/25' },
      { icon: <Hand className="w-5 h-5" />, title: 'Handball', desc: 'Agilidad, fuerza y estrategia rápida.', color: '#A855F7', bg: 'bg-purple-500/15', border: 'border-purple-500/25' },
      { icon: <Footprints className="w-5 h-5" />, title: 'Taekwondo', desc: 'Arte marcial, disciplina y respeto.', color: '#EC4899', bg: 'bg-pink-500/15', border: 'border-pink-500/25' },
      { icon: <Heart className="w-5 h-5" />, title: 'Baile', desc: 'Ritmo, expresión y energía positiva.', color: '#F43F5E', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
    ],
  },
]

const features = [
  { icon: <Users className="w-5 h-5" />, title: 'Instructores Capacitados', desc: 'Profesores expertos en cada disciplina, apasionados por enseñar.' },
  { icon: <Shield className="w-5 h-5" />, title: 'Instalaciones de Calidad', desc: 'Aulas, talleres, canchas y gimnasio equipados para tu desarrollo.' },
  { icon: <Trophy className="w-5 h-5" />, title: 'Eventos y Competencias', desc: 'Participa en muestras culturales, cívicas y torneos deportivos.' },
  { icon: <Heart className="w-5 h-5" />, title: 'Formación Integral', desc: 'Desarrolla habilidades artísticas, cívicas y deportivas para la vida.' },
]

// Quiz questions for recommendation
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
  deporte_individual_crear: { taller: 'Baile', desc: 'El baile es expresión libre. Ritmo, movimiento y creatividad sin límites.', icon: '🕺' },
  deporte_individual_competir: { taller: 'Atletismo', desc: 'El atletismo te reta a superar tus propias marcas. Velocidad, resistencia y superación personal.', icon: '🏃' },
  deporte_individual_social: { taller: 'Taekwondo', desc: 'Taekwondo: arte marcial, disciplina y respeto. Crece como persona mientras aprendes defensa personal.', icon: '🥋' },
  deporte_ambos_crear: { taller: 'Baile', desc: 'El baile es la combinación perfecta de arte y deporte. Ritmo, expresión y energía en movimiento.', icon: '🕺' },
  deporte_ambos_competir: { taller: 'Basquetbol', desc: 'El basquetbol tiene todo: equipo, velocidad y competencia intensa en la cancha.', icon: '🏀' },
  deporte_ambos_social: { taller: 'Handball', desc: 'Handball: acción rápida, trabajo en equipo y mucha diversión.', icon: '🤾' },
  civico_equipo_crear: { taller: 'Banda de Guerra', desc: 'La banda de guerra une música y disciplina. Sé parte de un equipo que marca el ritmo.', icon: '🎺' },
  civico_equipo_competir: { taller: 'Escolta', desc: 'La escolta es compromiso y honor. Representa a tu escuela con orgullo y disciplina.', icon: '🚩' },
  civico_equipo_social: { taller: 'Banderas', desc: 'Banderas: protocolo, tradición y trabajo en equipo al servicio de la patria.', icon: '🏳️' },
  civico_individual_crear: { taller: 'Artesanías', desc: 'Crea con tus manos piezas únicas que reflejen tu identidad y cultura.', icon: '✂️' },
  civico_individual_competir: { taller: 'Ajedrez', desc: 'El ajedrez desarrolla tu mente estratégica. Cada partida es una batalla de ingenio.', icon: '♟️' },
  civico_individual_social: { taller: 'Oratoria', desc: 'La oratoria te da el poder de la palabra. Habla con confianza y lidera con tu voz.', icon: '🎤' },
  civico_ambos_crear: { taller: 'Teatro', desc: 'El teatro es creación colectiva. Actúa, crea y transforma junto a tu equipo.', icon: '🎭' },
  civico_ambos_competir: { taller: 'Escolta', desc: 'La escolta te forma en disciplina, respeto y excelencia. Un honor que te acompañará siempre.', icon: '🚩' },
  civico_ambos_social: { taller: 'Banda de Guerra', desc: 'La banda de guerra forja carácter y amistad. Música, disciplina y hermandad.', icon: '🎺' },
}

const defaultResult = { taller: 'Teatro', desc: '¡El teatro es para ti! Desarrolla tu creatividad, expresión y trabajo en equipo mientras te diviertes.', icon: '🎭' }

function getResult(answers: Answer[]) {
  const key = answers.map(a => a.a).join('_')
  return results[key] || defaultResult
}

type Message = {
  role: 'bot' | 'user'
  text: string
}

function QuizBot({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente de talleres. Responde 3 preguntas y te recomendaré el taller perfecto para ti, ya sea cultural, cívico o deportivo. ¿Comenzamos?' },
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
      const nextStep = step + 1
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text: quizQuestions[nextStep].q }])
        setStep(nextStep)
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
    setMessages([{ role: 'bot', text: '¡Hola! Soy tu asistente de talleres. Responde 3 preguntas y te recomendaré el taller perfecto para ti, ya sea cultural, cívico o deportivo. ¿Comenzamos?' }])
    setDone(false)
  }

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary-glow to-primary shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform duration-300"
      >
        <Bot className="w-6 h-6 text-black" />
      </button>

      {/* Chat Panel */}
      <div className={`fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] rounded-2xl bg-background/95 backdrop-blur-[24px] border border-white/10 shadow-2xl transition-all duration-400 ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="font-bold text-[13px] text-white">Asistente de Talleres</p>
              <p className="text-[9px] text-white/40 font-medium">IA de recomendaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {done && (
              <button onClick={reset} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <RefreshCw className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>
        </div>

        <div className="p-4 h-[320px] overflow-y-auto custom-scrollbar space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary-glow text-black font-semibold rounded-tr-md'
                  : 'bg-white/5 text-white/80 rounded-tl-md'
              }`}>
                {m.text}
              </div>
            </div>
          ))}

          {!done && step < quizQuestions.length && (
            <div className="space-y-2 mt-3">
              <p className="text-[11px] font-semibold text-primary-glow uppercase tracking-wider">Elige una opción:</p>
              <div className="grid gap-1.5">
                {quizQuestions[step].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value)}
                    className="text-left px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-[12px] font-medium hover:bg-primary-glow hover:text-black hover:border-primary-glow transition-all duration-200"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {done && (
            <Link to="/catalogo" className="block mt-3 text-center px-4 py-2.5 rounded-xl bg-primary-glow text-black font-bold text-[12px] hover:bg-primary-glow/80 transition-all">
              Ver Catálogo de Talleres
            </Link>
          )}

          <div ref={endRef} />
        </div>
      </div>
    </>
  )
}

function LandingPage() {
  const [currentQuote, setCurrentQuote] = useState(0)
  const [botOpen, setBotOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // 3D Carousel animation is handled entirely by CSS keyframes
  }, { scope: container })

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuote(prev => (prev + 1) % quotes.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col overflow-x-hidden max-w-[1400px] mx-auto px-4 md:px-8 min-h-screen">

      {/* === NAVBAR === */}
      <nav className="fixed top-4 left-0 right-0 z-50 mx-auto px-4 md:px-8 w-full max-w-[1400px]">
        <div className="mx-auto max-w-[1320px] bg-[#050102]/80 backdrop-blur-md border border-white/10 rounded-[2rem] px-6 py-3 flex items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_15px_rgba(255,0,85,0.2)]">
              <Trophy className="w-5 h-5 text-[#ff0055]" />
            </div>
            <div>
              <p className="font-bold text-[16px] text-white leading-none">SITE Talleres</p>
              <p className="text-[9px] text-white/40 font-semibold tracking-[0.15em]">CBTIS 61</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/catalogo" className="hidden sm:flex px-4 py-2 rounded-xl text-[13px] font-semibold border border-primary-glow/30 text-primary-glow hover:bg-primary-glow hover:text-black transition-all [&.active]:bg-primary-glow [&.active]:text-black">
              Catálogo
            </Link>
            <Link to="/auth" className="px-5 py-2 rounded-xl text-[13px] font-bold border border-primary-glow/30 text-primary-glow hover:bg-primary-glow hover:text-black transition-all [&.active]:bg-primary-glow [&.active]:text-black">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* === HERO ANIMATED (FINEO STYLE) === */}
      <section ref={container} className="relative mt-8 min-h-[550px] md:min-h-[800px] flex flex-col items-center justify-center pt-10">

        {/* Text Content */}
        <div className="relative z-40 text-center px-4 max-w-4xl mx-auto flex flex-col items-center mb-8">
          <h1 className="text-[3.5rem] md:text-[6rem] font-extrabold leading-[1.05] tracking-tight text-white mb-6 drop-shadow-2xl">
            Una nueva era de <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#ff0055] drop-shadow-[0_0_20px_rgba(255,0,85,0.3)]">
              talleres escolares
            </span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto font-medium drop-shadow-lg">
            El ecosistema digital más avanzado para ayudarte a potenciar tu talento, competir al más alto nivel y dar tu mejor versión.
          </p>
        </div>

        {/* Action Button & Carousel Container */}
        <div className="relative w-full flex justify-center items-center h-[350px] md:h-[600px] lg:h-[700px] mt-8">
          {/* 3D Sports Carousel */}
          <div className="carousel-wrapper z-20 pointer-events-none">
            <div className="carousel-inner" style={{ '--quantity': 10 } as React.CSSProperties}>
              {[
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🎭</span>, label: 'Teatro', color: '139, 92, 246' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">♟️</span>, label: 'Ajedrez', color: '107, 114, 128' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🥁</span>, label: 'Banda', color: '220, 38, 38' },
                { icon: (
                  <svg viewBox="0 0 90 60" className="w-[3rem] h-[2rem] md:w-[4rem] md:h-[2.66rem] rounded-[4px]">
                    <rect width="30" height="60" fill="#006847" />
                    <rect x="30" width="30" height="60" fill="#FFFFFF" />
                    <rect x="60" width="30" height="60" fill="#CE1126" />
                    <circle cx="45" cy="30" r="5" fill="#8B4513" />
                  </svg>
                ), label: 'Escolta', color: '249, 115, 22' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">⚽</span>, label: 'Fútbol', color: '34, 197, 94' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🏀</span>, label: 'Basquet', color: '249, 115, 22' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🏃</span>, label: 'Atletismo', color: '6, 182, 212' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🏐</span>, label: 'Voleibol', color: '234, 179, 8' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">🥋</span>, label: 'Taekwondo', color: '236, 72, 153' },
                { icon: <span className="text-[3rem] md:text-[4rem] leading-none">💃</span>, label: 'Danza', color: '236, 72, 153' },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="carousel-card" 
                  style={{ '--index': idx, '--color-card': item.color } as React.CSSProperties}
                >
                  <div className="carousel-img backdrop-blur-[2px]"></div>
                  <div className="z-10 text-white">
                    {item.icon}
                  </div>
                  <p className="z-10 text-[8px] sm:text-[10px] md:text-sm font-bold uppercase tracking-tight md:tracking-wider text-white drop-shadow-md">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === STATS === */}
      <section className="mt-32 md:mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
        {[
          { value: '20+', label: 'Talleres Disponibles' },
          { value: '1000+', label: 'Alumnos Activos' },
          { value: '3', label: 'Áreas de Formación' },
          { value: '97%', label: 'Participación' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-6 text-center group">
            <p className="text-3xl md:text-4xl font-extrabold text-[#ff0055] drop-shadow-[0_0_15px_rgba(255,0,85,0.4)] transition-all group-hover:scale-110">
              {s.value}
            </p>
            <p className="text-[11px] text-white/40 font-semibold tracking-wider uppercase mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* === CATÁLOGO COMPLETO DE TALLERES === */}
      <section className="mt-20" id="talleres">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-primary-glow">Catálogo</span>
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
              <div className={`w-1 h-10 rounded-full bg-gradient-to-b ${cat.color}`} />
              <div>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">{cat.categoria}</h3>
                <p className={`text-[11px] font-semibold tracking-wider uppercase ${cat.text}`}>{cat.items.length} talleres</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cat.items.map((t) => (
                <Link
                  key={t.title}
                  to="/catalogo"
                  className="glass-card group relative p-5 overflow-hidden"
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.borderColor = `${t.color}50`;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div
                    className="absolute -inset-20 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${t.color}25 0%, transparent 70%)`,
                    }}
                  />
                  <div className="relative z-10 flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all duration-400"
                      style={{ borderColor: `${t.color}50`, color: t.color }}
                    >
                      {t.icon}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h4 className="font-bold text-[15px] text-white mb-1">{t.title}</h4>
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
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-primary-glow">Ventajas</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-center text-white mb-3">
          ¿Por qué elegirnos?
        </h2>
        <p className="text-white/40 text-center max-w-xl mx-auto mb-14 text-sm">
          Instalaciones, entrenadores y programas diseñados para tu desarrollo integral.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6 group">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-[#ff0055] mb-4 shadow-[0_0_15px_rgba(255,0,85,0.2)] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(255,0,85,0.4)] transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="font-bold text-[15px] text-white mb-2 group-hover:text-primary-glow transition-colors">{f.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* === CTA FINAL === */}
      <section className="mt-20 mb-16 relative rounded-[3rem] overflow-hidden border border-white/5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[#050102]" />
        
        {/* Pink Glow Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#ff0055] opacity-[0.15] blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 px-8 md:px-20 py-20 md:py-28 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,85,0.3)] mb-8">
            <Trophy className="w-8 h-8 text-[#ff0055]" />
          </div>
          <h2 className="text-[3rem] md:text-[4.5rem] font-extrabold text-white mb-6 leading-none tracking-tight">
            Comienza tu <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#ff0055] drop-shadow-[0_0_15px_rgba(255,0,85,0.3)]">
              nueva historia
            </span>
          </h2>
          <p className="text-white/60 text-lg md:text-xl max-w-lg mx-auto mb-12 font-medium">
            Únete a la nueva era de talleres escolares y descubre de lo que eres capaz. ¡Tu futuro empieza aquí!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/catalogo" className="bg-white text-black font-bold text-base md:text-lg px-8 py-4 rounded-full hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all flex items-center gap-2">
              Ver Catálogo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/auth" className="text-white/80 hover:text-white font-bold text-base px-8 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-all flex items-center gap-2">
              Crear Cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="pb-8 border-t border-white/[0.04] pt-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#ff0055]" />
            <span className="text-[13px] font-semibold text-white/60">
              SITE Talleres — CBTIS No. 61
            </span>
          </div>
          <p className="text-[11px] text-white/30 font-medium tracking-wide">
            Sistema Integral de Talleres Escolares &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>

      {/* === AI QUIZ BOT === */}
      <QuizBot open={botOpen} setOpen={setBotOpen} />

    </div>
  )
}
