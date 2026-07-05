import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

interface WorkshopParticle {
  emoji: string
  size: string
  x: string
  duration: number
  delay: number
  drift: number
}

const workshopParticles: WorkshopParticle[] = [
  { emoji: '🎵', size: 'text-lg', x: '10%', duration: 8, delay: 0, drift: 40 },
  { emoji: '🎨', size: 'text-xl', x: '25%', duration: 10, delay: 2, drift: -30 },
  { emoji: '♟️', size: 'text-lg', x: '45%', duration: 9, delay: 4, drift: 20 },
  { emoji: '⚽', size: 'text-xl', x: '65%', duration: 7, delay: 1, drift: -25 },
  { emoji: '🏀', size: 'text-lg', x: '80%', duration: 11, delay: 3, drift: 35 },
  { emoji: '🎭', size: 'text-xl', x: '15%', duration: 9, delay: 5, drift: -40 },
  { emoji: '💃', size: 'text-lg', x: '55%', duration: 8, delay: 2.5, drift: 30 },
  { emoji: '🎤', size: 'text-lg', x: '75%', duration: 10, delay: 6, drift: -20 },
  { emoji: '🎺', size: 'text-xl', x: '35%', duration: 7, delay: 0.5, drift: 25 },
  { emoji: '🏐', size: 'text-lg', x: '90%', duration: 9, delay: 3.5, drift: -35 },
]

export function WorkshopParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!containerRef.current) return
    const particles = containerRef.current.querySelectorAll('.workshop-particle')
    particles.forEach((p) => {
      const el = p as HTMLElement
      const drift = parseFloat(el.style.getPropertyValue('--drift') || '30')
      const duration = parseFloat(el.style.getPropertyValue('--duration') || '8')
      gsap.fromTo(
        el,
        { y: 0, x: 0, opacity: 0, scale: 0.3 },
        {
          y: -200,
          x: drift,
          opacity: 0,
          scale: 1,
          duration,
          ease: 'power1.out',
          repeat: -1,
          delay: el.style.getPropertyValue('--delay') ? parseFloat(el.style.getPropertyValue('--delay')) : 0,
          repeatDelay: 3,
        }
      )
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {workshopParticles.map((p, i) => (
        <div
          key={i}
          className={`workshop-particle ${p.size}`}
          style={{
            left: p.x,
            bottom: '0%',
            '--duration': `${p.duration}s`,
            '--delay': `${p.delay}s`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  )
}

const workshopIcons = [
  { category: 'Teatro', icon: '🎭', color: '#8B5CF6' },
  { category: 'Danza', icon: '💃', color: '#EC4899' },
  { category: 'Ajedrez', icon: '♟️', color: '#6B7280' },
  { category: 'Música', icon: '🎵', color: '#F59E0B' },
  { category: 'Dibujo', icon: '🎨', color: '#3B82F6' },
  { category: 'Fútbol', icon: '⚽', color: '#22C55E' },
  { category: 'Basquetbol', icon: '🏀', color: '#F97316' },
  { category: 'Voleibol', icon: '🏐', color: '#EAB308' },
  { category: 'Banda', icon: '🥁', color: '#DC2626' },
]

interface FloatingIconsProps {
  count?: number
}

export function FloatingWorkshopIcons({ count = 6 }: FloatingIconsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!containerRef.current) return
    const icons = containerRef.current.querySelectorAll('.floating-icon')
    icons.forEach((icon) => {
      const el = icon as HTMLElement
      const randomX = gsap.utils.random(-30, 30)
      const randomDuration = gsap.utils.random(3, 6)
      const randomY = gsap.utils.random(-20, 20)
      gsap.to(el, {
        y: randomY,
        x: randomX,
        rotation: gsap.utils.random(-15, 15),
        duration: randomDuration,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: gsap.utils.random(0, 2),
      })
    })
  }, { scope: containerRef })

  const selected = workshopIcons.slice(0, count)

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {selected.map((item, i) => (
        <div
          key={i}
          className="floating-icon absolute text-2xl md:text-3xl opacity-20"
          style={{
            left: `${10 + (i * 80) / count}%`,
            top: `${20 + (i % 3) * 30}%`,
          }}
        >
          {item.icon}
        </div>
      ))}
    </div>
  )
}

const rings = [
  { size: 'w-32 h-32', delay: 0, duration: 3 },
  { size: 'w-48 h-48', delay: 0.8, duration: 3.5 },
  { size: 'w-64 h-64', delay: 1.6, duration: 4 },
]

export function PulseRings() {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!containerRef.current) return
    rings.forEach((ring) => {
      const el = containerRef.current!.querySelector(`[data-ring="${ring.delay}"]`)
      if (!el) return
      gsap.fromTo(
        el,
        { scale: 0.8, opacity: 0.6 },
        {
          scale: 1.6,
          opacity: 0,
          duration: ring.duration,
          repeat: -1,
          delay: ring.delay,
          ease: 'power1.out',
        }
      )
    })
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
      {rings.map((r, i) => (
        <div
          key={i}
          data-ring={r.delay}
          className={`absolute ${r.size} rounded-full border border-[#ff0055]/30`}
        />
      ))}
    </div>
  )
}
