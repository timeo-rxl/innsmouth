import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction, type ChromaticAberrationEffect, type VignetteEffect } from 'postprocessing'
import * as THREE from 'three'
import { liveState, useGameStore } from '../state/gameStore'

const BASE_OFFSET = new THREE.Vector2(0, 0)

export function Effects() {
  const { settings } = useGameStore()
  const chromaticRef = useRef<ChromaticAberrationEffect>(null)
  const vignetteRef = useRef<VignetteEffect>(null)

  useFrame((state) => {
    const madness = Math.max(0, (44 - liveState.sanity) / 44) // crisp vision above 44 sanity
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 4.8)
    const aberration = madness * 0.0026 + liveState.hitFlash * 0.011

    if (chromaticRef.current) {
      chromaticRef.current.offset.set(aberration, aberration * (0.55 + 0.45 * pulse))
    }
    if (vignetteRef.current) {
      vignetteRef.current.darkness = 0.46 + madness * 0.36 + liveState.hitFlash * 0.24
    }
  })

  if (settings.graphicsQuality === 'eco') {
    return null
  }

  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur luminanceThreshold={1.08} luminanceSmoothing={0.28} intensity={0.55} />
      <ChromaticAberration ref={chromaticRef} offset={BASE_OFFSET} radialModulation={false} />
      <Noise opacity={0.032} blendFunction={BlendFunction.OVERLAY} />
      <Vignette ref={vignetteRef} offset={0.26} darkness={0.5} />
    </EffectComposer>
  )
}
