import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

export const StickmanSports = () => {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Continuous running cycle (doesn't conflict because we animate the wrapper's X/Y for movement)
    gsap.to('.leg-front', { rotation: 50, transformOrigin: '60px 100px', yoyo: true, repeat: -1, duration: 0.15, ease: 'sine.inOut' })
    gsap.to('.leg-back', { rotation: -50, transformOrigin: '60px 100px', yoyo: true, repeat: -1, duration: 0.15, ease: 'sine.inOut' })
    gsap.to('.arm-front', { rotation: -50, transformOrigin: '60px 60px', yoyo: true, repeat: -1, duration: 0.15, ease: 'sine.inOut' })
    gsap.to('.arm-back', { rotation: 50, transformOrigin: '60px 60px', yoyo: true, repeat: -1, duration: 0.15, ease: 'sine.inOut' })

    const tl = gsap.timeline({ repeat: -1 })
    
    // Reset all scenes to invisible
    gsap.set('.stickman-scene', { opacity: 0 })

    // --------- SCENE 1: BASKETBALL ---------
    tl.set('.scene-1', { opacity: 1 })
    tl.set('.p1-wrapper', { x: -400, y: 0 })
    tl.set('.p2-wrapper', { x: 300, y: 0 })
    tl.set('.bball', { x: -310, y: 0 })

    // P1 runs in dribbling
    tl.to('.p1-wrapper', { x: -50, duration: 1.5, ease: 'none' })
    tl.to('.bball', { x: 40, duration: 1.5, ease: 'none' }, "<")
    tl.to('.bball', { y: -80, yoyo: true, repeat: 5, duration: 0.25 }, "<") // Dribbling bounce
    
    // P2 runs in
    tl.to('.p2-wrapper', { x: 100, duration: 1.5, ease: 'none' }, "<")

    // P1 Jumps and Throws
    tl.to('.p1-wrapper', { y: -200, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.out' }, ">")
    // P2 Jumps to Block
    tl.to('.p2-wrapper', { y: -220, duration: 0.5, yoyo: true, repeat: 1, ease: 'power1.out' }, "<0.1")

    // Ball flies to hoop
    tl.to('.bball', { x: 440, y: -280, duration: 0.6, ease: 'power1.out' }, "<0.2")
    tl.to('.bball', { y: 100, duration: 0.8, ease: 'bounce.out' }, ">")
    
    tl.to('.scene-1', { opacity: 0, duration: 0.5 }, "+=0.5")


    // --------- SCENE 2: SOCCER ---------
    tl.set('.scene-2', { opacity: 1 })
    tl.set('.s-p1-wrapper', { x: -400, y: 0 })
    tl.set('.s-p2-wrapper', { x: 250, y: 0, rotation: 0 })
    tl.set('.sball', { x: -200, y: 0, rotation: 0 })

    // P1 runs to ball
    tl.to('.s-p1-wrapper', { x: -100, duration: 1.2, ease: 'none' })

    // P1 kicks ball
    tl.to('.sball', { x: 400, y: -150, rotation: 1080, duration: 0.8, ease: 'power1.out' }, ">")
    
    // P2 dives
    tl.to('.s-p2-wrapper', { x: 400, y: -80, rotation: 70, duration: 0.6, ease: 'power1.out' }, "<0.1")

    // Ball bounces in goal
    tl.to('.sball', { y: 20, duration: 0.5, ease: 'bounce.out' }, ">")

    tl.to('.scene-2', { opacity: 0, duration: 0.5 }, "+=0.5")


    // --------- SCENE 3: VOLLEYBALL ---------
    tl.set('.scene-3', { opacity: 1 })
    tl.set('.v-p1-wrapper', { x: -350, y: 0 })
    tl.set('.v-p2-wrapper', { x: 350, y: 0, rotation: 0 })
    tl.set('.vball', { x: -200, y: -400 }) // Ball falling

    // P1 runs in
    tl.to('.v-p1-wrapper', { x: -100, duration: 1, ease: 'none' })
    tl.to('.v-p2-wrapper', { x: 150, duration: 1, ease: 'none' }, "<")
    tl.to('.vball', { x: -100, y: -200, duration: 1, ease: 'power1.in' }, "<") // Toss

    // P1 jumps and spikes
    tl.to('.v-p1-wrapper', { y: -250, duration: 0.4, yoyo: true, repeat: 1, ease: 'power1.out' }, ">")
    
    // Ball flies to P2
    tl.to('.vball', { x: 250, y: 50, duration: 0.4, ease: 'none' }, "<0.2")

    // P2 dives
    tl.to('.v-p2-wrapper', { x: 300, y: 50, rotation: -80, duration: 0.4 }, "<0.1")

    // Ball bounces up
    tl.to('.vball', { x: 100, y: -300, duration: 0.6, ease: 'power1.out' }, ">")

    tl.to('.scene-3', { opacity: 0, duration: 0.5 }, "+=0.5")

  }, { scope: container })

  const StickmanSVG = ({ flip = false, className = '' }: { flip?: boolean, className?: string }) => (
    <div className={`absolute w-[120px] h-[180px] origin-center ${className}`}>
      <svg width="120" height="180" viewBox="0 0 120 180" 
           className={`stroke-[#ff0055] stroke-[4px] fill-none overflow-visible drop-shadow-[0_0_10px_#ff0055] ${flip ? '-scale-x-100' : ''}`}>
        {/* Head */}
        <circle cx="60" cy="30" r="18" />
        {/* Torso */}
        <line x1="60" y1="48" x2="60" y2="100" />
        {/* Arms */}
        <line className="arm-front" x1="60" y1="60" x2="30" y2="95" />
        <line className="arm-back" x1="60" y1="60" x2="90" y2="95" />
        {/* Legs */}
        <line className="leg-front" x1="60" y1="100" x2="40" y2="160" />
        <line className="leg-back" x1="60" y1="100" x2="80" y2="160" />
      </svg>
    </div>
  )

  return (
    <div ref={container} className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0 opacity-[0.35]">
      
      {/* SCENE 1: BASKETBALL */}
      <div className="stickman-scene scene-1 absolute inset-0 flex items-center justify-center scale-[0.6] md:scale-90">
        {/* Floor Line */}
        <div className="absolute bottom-[20%] w-[150%] h-[4px] bg-[#ff0055]/30 drop-shadow-[0_0_8px_#ff0055]" />
        
        <StickmanSVG className="p1-wrapper bottom-[20%]" />
        <div className="bball absolute bottom-[20%] ml-20 text-[4rem] drop-shadow-[0_0_15px_rgba(255,0,85,1)] z-10">🏀</div>
        <StickmanSVG flip className="p2-wrapper bottom-[20%]" />
        
        {/* Basketball Hoop */}
        <div className="absolute right-[5%] bottom-[20%] w-32 h-[350px] border-l-8 border-[#ff0055]/60 flex flex-col items-start drop-shadow-[0_0_10px_#ff0055]">
          <div className="w-28 h-5 bg-[#ff0055] mt-[60px] rounded-r-full" />
          <div className="w-20 h-20 border-[6px] border-[#ff0055] ml-4 rounded-b-3xl border-t-0 opacity-100" />
        </div>
      </div>

      {/* SCENE 2: SOCCER */}
      <div className="stickman-scene scene-2 absolute inset-0 flex items-center justify-center scale-[0.6] md:scale-90">
        {/* Floor Line */}
        <div className="absolute bottom-[20%] w-[150%] h-[4px] bg-[#ff0055]/30 drop-shadow-[0_0_8px_#ff0055]" />

        <StickmanSVG className="s-p1-wrapper bottom-[20%]" />
        <div className="sball absolute bottom-[20%] ml-20 text-[4rem] drop-shadow-[0_0_15px_rgba(255,0,85,1)] z-10">⚽</div>
        <StickmanSVG flip className="s-p2-wrapper bottom-[20%]" />
        
        {/* Soccer Goal */}
        <div className="absolute right-[5%] bottom-[20%] w-48 h-[250px] border-[8px] border-[#ff0055] drop-shadow-[0_0_12px_#ff0055] border-r-0 border-b-0 rounded-tl-3xl opacity-100">
          <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(45deg,transparent,transparent_15px,#ff0055_15px,#ff0055_18px)]" />
        </div>
      </div>

      {/* SCENE 3: VOLLEYBALL */}
      <div className="stickman-scene scene-3 absolute inset-0 flex items-center justify-center scale-[0.6] md:scale-90">
        {/* Floor Line */}
        <div className="absolute bottom-[20%] w-[150%] h-[4px] bg-[#ff0055]/30 drop-shadow-[0_0_8px_#ff0055]" />

        <StickmanSVG className="v-p1-wrapper bottom-[20%]" />
        <div className="vball absolute bottom-[20%] text-[4rem] drop-shadow-[0_0_15px_rgba(255,0,85,1)] z-10">🏐</div>
        <StickmanSVG flip className="v-p2-wrapper bottom-[20%]" />
        
        {/* Volleyball Net */}
        <div className="absolute left-[50%] -translate-x-1/2 bottom-[20%] w-4 h-[300px] bg-[#ff0055] drop-shadow-[0_0_12px_#ff0055] opacity-100 rounded-t-full">
           <div className="w-[160px] h-[120px] bg-[repeating-linear-gradient(90deg,transparent,transparent_12px,#ff0055_12px,#ff0055_15px)] opacity-50 absolute top-0 left-1/2 -translate-x-1/2" />
        </div>
      </div>

    </div>
  )
}
