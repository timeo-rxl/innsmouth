import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { gameStore, liveState, useGameStore } from '../state/gameStore'
import { soundEngine } from '../audio/soundEngine'
import { hasLineOfSight, PATROL_WAYPOINTS, resolveMovementCollision } from '../world/levelData'

const PATROL_SPEED = 2.55
const CHASE_SPEED = 4.95
const RECOIL_SPEED = 3.4
const CREATURE_RADIUS = 0.68

export function Creature() {
  const { runId } = useGameStore()
  const groupRef = useRef<THREE.Group>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)
  const leftLegRef = useRef<THREE.Mesh>(null)
  const rightLegRef = useRef<THREE.Mesh>(null)
  const tentaclesRef = useRef<THREE.Group>(null)
  const eyeLightRef = useRef<THREE.PointLight>(null)

  const aiRef = useRef({
    waypointIndex: 4,
    lostSightTimer: 0,
    recoilTimer: 0,
    hitCooldown: 0,
  })

  useEffect(() => {
    liveState.creatureX = 9.5
    liveState.creatureY = 0
    liveState.creatureZ = -18
    liveState.creatureState = 'patrol'
    aiRef.current = {
      waypointIndex: 4,
      lostSightTimer: 0,
      recoilTimer: 0,
      hitCooldown: 0,
    }
    if (groupRef.current) {
      groupRef.current.position.set(9.5, 0, -18)
    }
  }, [runId])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const snap = gameStore.getSnapshot()
    const group = groupRef.current
    if (!group) return

    if (snap.phase === 'paused') return

    const t = state.clock.elapsedTime
    let cx = liveState.creatureX
    let cz = liveState.creatureZ

    if (snap.phase === 'playing') {
      const px = liveState.playerX
      const pz = liveState.playerZ
      const dx = px - cx
      const dz = pz - cz
      const dist = Math.hypot(dx, dz)
      liveState.creatureDistance = dist

      if (aiRef.current.hitCooldown > 0) aiRef.current.hitCooldown -= dt
      if (aiRef.current.recoilTimer > 0) aiRef.current.recoilTimer -= dt

      // 4-second spawn grace so the player can orient themselves fairly
      const graceOver = liveState.elapsedSeconds > 4.0
      const sightRange = liveState.flashlightOn || liveState.playerSprinting ? 21 : 13
      const canSeePlayer = graceOver && dist < sightRange && hasLineOfSight(cx, cz, px, pz)
      const sensesLowSanity = graceOver && liveState.sanity < 30 && dist < 34

      if (aiRef.current.recoilTimer > 0) {
        liveState.creatureState = 'recoil'
      } else if (liveState.isNearLight && dist > 4.8 && liveState.sanity >= 30) {
        liveState.creatureState = 'patrol'
        aiRef.current.lostSightTimer = 0
      } else if (canSeePlayer || sensesLowSanity) {
        liveState.creatureState = 'chase'
        aiRef.current.lostSightTimer = 0
      } else if (liveState.creatureState === 'chase') {
        aiRef.current.lostSightTimer += dt
        if (aiRef.current.lostSightTimer > 3.0) {
          liveState.creatureState = 'patrol'
        }
      }

      const diffSpeed =
        snap.settings.difficulty === 'exploration'
          ? 0.8
          : snap.settings.difficulty === 'folie'
            ? 1.15
            : 1.0
      let targetX = cx
      let targetZ = cz
      let speed = PATROL_SPEED * diffSpeed

      if (liveState.creatureState === 'recoil') {
        targetX = cx - dx
        targetZ = cz - dz
        speed = RECOIL_SPEED
      } else if (liveState.creatureState === 'chase') {
        targetX = px
        targetZ = pz
        speed = CHASE_SPEED * diffSpeed
      } else {
        const wp = PATROL_WAYPOINTS[aiRef.current.waypointIndex]
        targetX = wp.x
        targetZ = wp.z
        if (Math.hypot(targetX - cx, targetZ - cz) < 1.8) {
          aiRef.current.waypointIndex = (aiRef.current.waypointIndex + 1) % PATROL_WAYPOINTS.length
        }
      }

      const mdx = targetX - cx
      const mdz = targetZ - cz
      const mlen = Math.hypot(mdx, mdz)
      if (mlen > 0.05) {
        const stepX = (mdx / mlen) * speed * dt
        const stepZ = (mdz / mlen) * speed * dt
        const resolved = resolveMovementCollision(cx + stepX, cz + stepZ, CREATURE_RADIUS)

        if (Math.hypot(resolved.x - cx, resolved.z - cz) < speed * dt * 0.2) {
          const perpX = (-mdz / mlen) * speed * dt
          const perpZ = (mdx / mlen) * speed * dt
          const alt = resolveMovementCollision(cx + perpX, cz + perpZ, CREATURE_RADIUS)
          cx = alt.x
          cz = alt.z
        } else {
          cx = resolved.x
          cz = resolved.z
        }

        const desiredYaw = Math.atan2(mdx, mdz)
        group.rotation.y = lerpAngle(group.rotation.y, desiredYaw, Math.min(1, dt * 6))
      }

      const newDist = Math.hypot(px - cx, pz - cz)
      liveState.creatureDistance = newDist
      if (newDist < 1.85 && aiRef.current.hitCooldown <= 0) {
        liveState.sanity = Math.max(0, liveState.sanity - 22)
        liveState.hitFlash = 1.0
        aiRef.current.hitCooldown = 3.2
        aiRef.current.recoilTimer = 2.6
        liveState.creatureState = 'recoil'
        soundEngine.playCreatureHit()
        gameStore.showToast('⚠ La Chose vous a effleuré ! Fuyez vers la lumière !', 2400)
        if (liveState.sanity <= 0) {
          soundEngine.playLoss()
          gameStore.triggerLoss("La créature d'Innsmouth vous a happé dans la brume.")
        }
      }

      liveState.creatureX = cx
      liveState.creatureZ = cz
    } else {
      const wp = PATROL_WAYPOINTS[aiRef.current.waypointIndex]
      const mdx = wp.x - cx
      const mdz = wp.z - cz
      const mlen = Math.hypot(mdx, mdz)
      if (mlen < 1.8) {
        aiRef.current.waypointIndex = (aiRef.current.waypointIndex + 1) % PATROL_WAYPOINTS.length
      } else {
        cx += (mdx / mlen) * 1.5 * dt
        cz += (mdz / mlen) * 1.5 * dt
        liveState.creatureX = cx
        liveState.creatureZ = cz
        group.rotation.y = lerpAngle(group.rotation.y, Math.atan2(mdx, mdz), dt * 4)
      }
    }

    const isChasing = liveState.creatureState === 'chase'
    const animFreq = isChasing ? 9.5 : 4.5
    group.position.set(cx, Math.abs(Math.sin(t * animFreq)) * 0.1, cz)
    group.rotation.z = Math.sin(t * animFreq * 0.5) * (isChasing ? 0.1 : 0.05)

    if (eyeLightRef.current) {
      eyeLightRef.current.intensity = isChasing ? 4.2 : 2.1
      eyeLightRef.current.color.set(isChasing ? '#ff8b3d' : '#9eff47')
    }

    if (leftArmRef.current && rightArmRef.current && leftLegRef.current && rightLegRef.current) {
      const swing = Math.sin(t * animFreq) * (isChasing ? 0.65 : 0.42)
      leftArmRef.current.rotation.x = (isChasing ? -1.05 : -0.45) + swing
      rightArmRef.current.rotation.x = (isChasing ? -1.05 : -0.45) - swing
      leftLegRef.current.rotation.x = -swing * 0.78
      rightLegRef.current.rotation.x = swing * 0.78
    }

    if (tentaclesRef.current) {
      tentaclesRef.current.children.forEach((child, idx) => {
        child.rotation.z = Math.sin(t * (isChasing ? 7 : 4) + idx * 1.2) * 0.26
        child.rotation.x = 0.25 + Math.cos(t * 3.8 + idx) * 0.16
      })
    }
  })

  return (
    <group ref={groupRef} position={[9.5, 0, -18]}>
      {/* Tall hunched Star-Spawn / Deep One stalker torso */}
      <mesh position={[0, 1.62, 0.12]} rotation={[0.36, 0, 0]} castShadow>
        <capsuleGeometry args={[0.42, 1.0, 8, 12]} />
        <meshStandardMaterial color="#10211d" roughness={0.32} metalness={0.28} />
      </mesh>

      {/* Broad hunched shoulder mantle */}
      <mesh position={[0, 2.08, 0.2]} rotation={[0.25, 0, 0]} scale={[1.38, 0.75, 0.9]} castShadow>
        <dodecahedronGeometry args={[0.44, 1]} />
        <meshStandardMaterial color="#0d1b18" roughness={0.38} metalness={0.22} />
      </mesh>

      {/* Jagged dorsal spine fins */}
      {[2.22, 1.92, 1.62, 1.32].map((sy, idx) => (
        <mesh key={idx} position={[0, sy, -0.22 - idx * 0.04]} rotation={[-0.52, 0, 0]}>
          <coneGeometry args={[0.13 - idx * 0.018, 0.62, 4]} />
          <meshStandardMaterial color="#091513" roughness={0.26} metalness={0.28} />
        </mesh>
      ))}

      {/* Cranium + Glowing Abyssal Eyes + Writhing Beard Tentacles */}
      <group position={[0, 2.46, 0.44]}>
        <mesh scale={[0.92, 1.08, 1.15]} castShadow>
          <dodecahedronGeometry args={[0.34, 1]} />
          <meshStandardMaterial color="#142924" roughness={0.36} metalness={0.24} />
        </mesh>

        {/* Primary Glowing Eyes */}
        <mesh position={[-0.13, 0.05, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#e0ff54" emissive="#c6ff29" emissiveIntensity={3.6} toneMapped={false} />
        </mesh>
        <mesh position={[0.13, 0.05, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#e0ff54" emissive="#c6ff29" emissiveIntensity={3.6} toneMapped={false} />
        </mesh>
        {/* Secondary smaller eldritch eyes */}
        <mesh position={[-0.2, 0.14, 0.24]}>
          <sphereGeometry args={[0.032, 6, 6]} />
          <meshStandardMaterial color="#a6ff4d" emissive="#8cff29" emissiveIntensity={2.8} toneMapped={false} />
        </mesh>
        <mesh position={[0.2, 0.14, 0.24]}>
          <sphereGeometry args={[0.032, 6, 6]} />
          <meshStandardMaterial color="#a6ff4d" emissive="#8cff29" emissiveIntensity={2.8} toneMapped={false} />
        </mesh>

        <pointLight ref={eyeLightRef} position={[0, 0.06, 0.5]} color="#9eff47" intensity={2.1} distance={9} decay={2} />

        {/* 6 Writhing Cranial Tentacles */}
        <group ref={tentaclesRef} position={[0, -0.14, 0.22]}>
          {[-0.2, -0.12, -0.04, 0.04, 0.12, 0.2].map((tx, i) => (
            <mesh key={i} position={[tx, -0.22 - (i % 2) * 0.06, 0.04]}>
              <coneGeometry args={[0.048, 0.56, 6]} />
              <meshStandardMaterial color="#122721" roughness={0.34} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Long Clawed Arms */}
      <group ref={leftArmRef} position={[-0.58, 1.98, 0.24]}>
        <mesh position={[0, -0.45, 0.08]} rotation={[0.1, 0, 0.14]} castShadow>
          <capsuleGeometry args={[0.1, 0.92, 4, 8]} />
          <meshStandardMaterial color="#11221e" roughness={0.36} />
        </mesh>
        {/* Claws */}
        {[-0.06, 0, 0.06].map((cx, i) => (
          <mesh key={i} position={[cx, -1.02, 0.16]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.028, 0.28, 4]} />
            <meshStandardMaterial color="#2b3d37" roughness={0.3} metalness={0.5} />
          </mesh>
        ))}
      </group>
      <group ref={rightArmRef} position={[0.58, 1.98, 0.24]}>
        <mesh position={[0, -0.45, 0.08]} rotation={[0.1, 0, -0.14]} castShadow>
          <capsuleGeometry args={[0.1, 0.92, 4, 8]} />
          <meshStandardMaterial color="#11221e" roughness={0.36} />
        </mesh>
        {[-0.06, 0, 0.06].map((cx, i) => (
          <mesh key={i} position={[cx, -1.02, 0.16]} rotation={[0.4, 0, 0]}>
            <coneGeometry args={[0.028, 0.28, 4]} />
            <meshStandardMaterial color="#2b3d37" roughness={0.3} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.24, 0.58, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.88, 4, 8]} />
        <meshStandardMaterial color="#0e1c19" roughness={0.48} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.24, 0.58, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.88, 4, 8]} />
        <meshStandardMaterial color="#0e1c19" roughness={0.48} />
      </mesh>
    </group>
  )
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (diff < -Math.PI) diff += Math.PI * 2
  return a + diff * t
}
