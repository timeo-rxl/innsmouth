import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { PlayerController } from './components/PlayerController'
import { Creature } from './components/Creature'
import { InnsmouthWorld } from './components/InnsmouthWorld'
import { Effects } from './components/Effects'
import { HUD } from './components/HUD'
import { Screens } from './components/Screens'
import { useGameStore } from './state/gameStore'

export function App() {
  const snap = useGameStore()
  const warpClass =
    snap.phase === 'lost' || (snap.phase === 'playing' && (snap.sanity < 18 || snap.hitFlash > 0.35))
      ? 'sanity-warp-active'
      : ''

  return (
    <div id="game-click-area" className={warpClass} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 180, position: [0, 1.7, 40] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <InnsmouthWorld />
          <Creature />
          <PlayerController />
          <Effects />
        </Suspense>
      </Canvas>
      <HUD />
      <Screens />
    </div>
  )
}

export default App
