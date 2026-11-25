import { useEffect, useRef, useState } from 'react'
import { soundEngine } from '../audio/soundEngine'

const WHISPERS = [
  'Ph’nglui mglw’nafh...',
  'Le phare veille dans la brume...',
  'Cinq reliques dorment dans la boue...',
  'Ne te retourne pas.',
  'Les pavés se souviennent.',
]

/**
 * Animated roaming chibi/eldritch Cthulhu companion on the Start Menu.
 * Moves smoothly across the screen using requestAnimationFrame without React re-renders.
 */
export function MiniCthulhu({ excited }: { excited: boolean }) {
  const walkerRef = useRef<HTMLDivElement>(null)
  const [whisper, setWhisper] = useState<string | null>(null)
  const [hopBoost, setHopBoost] = useState(0)

  useEffect(() => {
    let raf = 0
    let x = 90
    let dir = 1
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const maxW = Math.max(240, window.innerWidth - 130)
      const speed = excited ? 115 : 58
      x += dir * speed * dt

      if (x >= maxW) {
        x = maxW
        dir = -1
      } else if (x <= 24) {
        x = 24
        dir = 1
      }

      const bob = Math.sin(now * (excited ? 0.009 : 0.0045)) * (excited ? 9 : 6)
      const tilt = Math.sin(now * 0.003) * 4
      if (walkerRef.current) {
        walkerRef.current.style.transform = `translate3d(${x}px, ${bob}px, 0) scaleX(${dir}) rotate(${tilt}deg)`
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [excited])

  const handlePoke = () => {
    soundEngine.initAndResume()
    soundEngine.playUiTick()
    setHopBoost((v) => v + 1)
    const next = WHISPERS[Math.floor(Math.random() * WHISPERS.length)]
    setWhisper(next)
  }

  useEffect(() => {
    if (!whisper) return
    const timer = window.setTimeout(() => setWhisper(null), 2600)
    return () => window.clearTimeout(timer)
  }, [whisper])

  return (
    <div style={styles.track}>
      <div
        ref={walkerRef}
        id="mini-cthulhu"
        role="button"
        tabIndex={0}
        aria-label="Petit Cthulhu errant"
        onClick={handlePoke}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handlePoke()
        }}
        style={{
          ...styles.walker,
          filter: excited
            ? 'drop-shadow(0 0 18px rgba(80, 255, 190, 0.72))'
            : 'drop-shadow(0 6px 14px rgba(20, 120, 88, 0.55))',
        }}
      >
        {whisper && (
          <div style={styles.bubble} key={hopBoost}>
            {whisper}
          </div>
        )}

        <svg width="96" height="96" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Soft eerie aura under feet */}
          <ellipse cx="60" cy="106" rx="28" ry="6" fill="rgba(45, 212, 148, 0.22)" />

          {/* Bat wings */}
          <path
            className="cthulhu-wing-l"
            d="M46 54 C28 36, 14 44, 18 66 C26 62, 34 64, 44 68 Z"
            fill="#143a31"
            stroke="#42b88d"
            strokeWidth="1.6"
          />
          <path
            className="cthulhu-wing-r"
            d="M74 54 C92 36, 106 44, 102 66 C94 62, 86 64, 76 68 Z"
            fill="#143a31"
            stroke="#42b88d"
            strokeWidth="1.6"
          />

          {/* Plump eldritch body & clawed feet */}
          <path
            d="M42 94 C38 80, 42 54, 60 52 C78 54, 82 80, 78 94 L71 101 L65 95 L55 95 L49 101 Z"
            fill="#1b4d41"
            stroke="#5ce0ad"
            strokeWidth="1.8"
          />
          {/* Belly scale lines */}
          <path d="M52 74 Q60 78 68 74" stroke="#368770" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M50 83 Q60 87 70 83" stroke="#368770" strokeWidth="1.5" strokeLinecap="round" />

          {/* Tiny arms */}
          <path d="M44 66 C34 70, 34 79, 41 81" stroke="#5ce0ad" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M76 66 C86 70, 86 79, 79 81" stroke="#5ce0ad" strokeWidth="3.5" strokeLinecap="round" />

          {/* Bulbous Cthulhu Head */}
          <ellipse cx="60" cy="36" rx="22" ry="19" fill="#1f594a" stroke="#6bffc6" strokeWidth="1.8" />
          {/* Brow ridges */}
          <path d="M44 26 Q52 21 58 26" stroke="#3ba884" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M62 26 Q68 21 76 26" stroke="#3ba884" strokeWidth="1.8" strokeLinecap="round" />

          {/* Six glowing eyes */}
          <g className="cthulhu-eyes">
            <circle cx="50" cy="34" r="3.4" fill="#d8ff4d" />
            <circle cx="70" cy="34" r="3.4" fill="#d8ff4d" />
            <circle cx="46" cy="28" r="1.9" fill="#9eff72" />
            <circle cx="74" cy="28" r="1.9" fill="#9eff72" />
            <circle cx="54" cy="27" r="1.7" fill="#9eff72" />
            <circle cx="66" cy="27" r="1.7" fill="#9eff72" />
          </g>

          {/* Writhing face tentacles */}
          <path
            className="cthulhu-tentacle-a"
            d="M49 46 C44 56, 40 65, 45 73"
            stroke="#5ce0ad"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            className="cthulhu-tentacle-b"
            d="M56 48 C54 60, 56 69, 53 77"
            stroke="#75ffca"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            className="cthulhu-tentacle-b"
            d="M64 48 C66 60, 64 69, 67 77"
            stroke="#75ffca"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            className="cthulhu-tentacle-c"
            d="M71 46 C76 56, 80 65, 75 73"
            stroke="#5ce0ad"
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  track: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: '12px',
    height: '110px',
    pointerEvents: 'none',
    zIndex: 35,
    overflow: 'visible',
  },
  walker: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    pointerEvents: 'auto',
    cursor: 'pointer',
    willChange: 'transform',
  },
  bubble: {
    position: 'absolute',
    bottom: '98px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(6, 18, 17, 0.92)',
    border: '1px solid rgba(110, 255, 200, 0.45)',
    color: '#a8ffe0',
    fontSize: '11px',
    fontStyle: 'italic',
    padding: '5px 10px',
    borderRadius: '999px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
}
