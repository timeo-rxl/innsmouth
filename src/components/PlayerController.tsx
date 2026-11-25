import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { gameStore, liveState, useGameStore } from '../state/gameStore'
import { soundEngine } from '../audio/soundEngine'
import {
  isPointInSafeLight,
  LIGHTHOUSE_ALTAR_POS,
  PLAYER_SPAWN,
  RELICS,
  resolveMovementCollision,
} from '../world/levelData'

const WALK_SPEED = 4.6
const SPRINT_SPEED = 7.6
const PLAYER_RADIUS = 0.55

export function PlayerController() {
  const { runId } = useGameStore()
  const { camera, gl } = useThree()
  const spotRef = useRef<THREE.SpotLight | null>(null)
  const bounceLightRef = useRef<THREE.PointLight | null>(null)
  const spotTarget = useMemo(() => new THREE.Object3D(), [])

  const keysRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    turnLeft: false,
    turnRight: false,
  })

  const velRef = useRef({ x: 0, z: 0 })
  const rollRef = useRef(0)
  const lookRef = useRef({ yaw: 0, pitch: 0 })
  const dragLookRef = useRef({ active: false, lastX: 0, lastY: 0 })
  const bobTimerRef = useRef(0)
  const fpsCounterRef = useRef({ frames: 0, elapsed: 0, warmups: 2 })
  const forwardVec = useMemo(() => new THREE.Vector3(), [])
  const rightVec = useMemo(() => new THREE.Vector3(), [])
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const moveDir = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    soundEngine.setLightningCallback(() => {
      liveState.thunderFlash = 1.0
    })
    return () => soundEngine.setLightningCallback(null)
  }, [])

  useEffect(() => {
    camera.position.set(PLAYER_SPAWN.x, PLAYER_SPAWN.y, PLAYER_SPAWN.z)
    camera.rotation.order = 'YXZ'
    lookRef.current = { yaw: 0, pitch: 0 }
    velRef.current = { x: 0, z: 0 }
    rollRef.current = 0
    camera.rotation.set(0, 0, 0)
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 70
      camera.updateProjectionMatrix()
    }
    bobTimerRef.current = 0
  }, [camera, runId])

  useEffect(() => {
    const canvas = gl.domElement

    const requestSafePointerLock = () => {
      if (gameStore.getSnapshot().phase !== 'playing') return
      if (document.pointerLockElement === canvas || !canvas.requestPointerLock) return
      try {
        const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined
        if (res && typeof res.catch === 'function') {
          res.catch(() => {})
        }
      } catch {
        // Ignore restricted pointer lock environments gracefully
      }
    }

    const onCanvasClick = () => {
      soundEngine.initAndResume()
      requestSafePointerLock()
    }

    const onPointerLockChange = () => {
      gameStore.setPointerLocked(document.pointerLockElement === canvas)
    }

    const onPointerLockError = () => {
      gameStore.setPointerLocked(false)
    }

    const onMouseMove = (e: MouseEvent) => {
      const snap = gameStore.getSnapshot()
      if (snap.phase !== 'playing') return
      if (document.pointerLockElement !== canvas) return
      const sens = 0.0022 * snap.settings.mouseSensitivity
      const ySign = snap.settings.invertY ? -1 : 1
      lookRef.current.yaw -= e.movementX * sens
      lookRef.current.pitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, lookRef.current.pitch - e.movementY * sens * ySign)
      )
    }

    const onPointerDown = (e: PointerEvent) => {
      if (gameStore.getSnapshot().phase !== 'playing') return
      soundEngine.initAndResume()
      if (document.pointerLockElement !== canvas) {
        dragLookRef.current = { active: true, lastX: e.clientX, lastY: e.clientY }
      }
    }

    const onDragMove = (e: PointerEvent) => {
      const snap = gameStore.getSnapshot()
      if (!dragLookRef.current.active || document.pointerLockElement === canvas) return
      if (snap.phase !== 'playing') return
      const dx = e.clientX - dragLookRef.current.lastX
      const dy = e.clientY - dragLookRef.current.lastY
      dragLookRef.current.lastX = e.clientX
      dragLookRef.current.lastY = e.clientY
      const sens = 0.0034 * snap.settings.mouseSensitivity
      const ySign = snap.settings.invertY ? -1 : 1
      lookRef.current.yaw -= dx * sens
      lookRef.current.pitch = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, lookRef.current.pitch - dy * sens * ySign)
      )
    }

    const onPointerUp = () => {
      dragLookRef.current.active = false
    }

    canvas.addEventListener('click', onCanvasClick)
    canvas.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('pointerlockerror', onPointerLockError)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.removeEventListener('click', onCanvasClick)
      canvas.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('pointerlockerror', onPointerLockError)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('pointermove', onDragMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl])

  useEffect(() => {
    const clearKeys = () => {
      keysRef.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
        turnLeft: false,
        turnRight: false,
      }
    }

    const mapMovementKey = (e: KeyboardEvent, pressed: boolean) => {
      const k = e.key.toLowerCase()
      const layout = gameStore.getSnapshot().settings.keyboardLayout
      const fwdKey = layout === 'qwerty' ? 'w' : 'z'
      const leftKey = layout === 'qwerty' ? 'a' : 'q'

      if (k === fwdKey || e.code === 'ArrowUp') keysRef.current.forward = pressed
      if (k === 's' || e.code === 'ArrowDown') keysRef.current.backward = pressed
      if (k === leftKey) keysRef.current.left = pressed
      if (k === 'd') keysRef.current.right = pressed
      if (e.code === 'ArrowLeft') keysRef.current.turnLeft = pressed
      if (e.code === 'ArrowRight') keysRef.current.turnRight = pressed
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        keysRef.current.sprint = pressed
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const current = gameStore.getSnapshot()

      if (!e.repeat && k === 'm') {
        const muted = soundEngine.toggleMute()
        gameStore.setMuted(muted)
      }

      // Pause toggle via P or Escape (when not pointer-locked)
      if (!e.repeat && (k === 'p' || (e.key === 'Escape' && !document.pointerLockElement))) {
        if (current.phase === 'playing') {
          clearKeys()
          gameStore.pauseGame()
          return
        }
        if (current.phase === 'paused') {
          gameStore.resumeGame()
          return
        }
      }

      if (k === 'r' && (current.phase === 'lost' || current.phase === 'won')) {
        e.preventDefault()
        soundEngine.initAndResume()
        gameStore.restartGame()
        return
      }

      if (current.phase !== 'playing') return
      soundEngine.initAndResume()

      mapMovementKey(e, true)

      if (!e.repeat && k === 'h') {
        gameStore.toggleHideHud()
      }

      if (!e.repeat && k === 'f') {
        gameStore.toggleFlashlight()
        soundEngine.playFlashlightClick()
      }

      if (!e.repeat && k === 'e') {
        handleInteract()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      mapMovementKey(e, false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clearKeys)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clearKeys)
    }
  }, [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)

    // Real measured FPS (skips only the first 2 cold-start frames)
    if (fpsCounterRef.current.warmups > 0) {
      fpsCounterRef.current.warmups -= 1
    } else {
      fpsCounterRef.current.frames += 1
      fpsCounterRef.current.elapsed += delta
      if (fpsCounterRef.current.elapsed >= 0.45 && fpsCounterRef.current.frames >= 2) {
        const measured = Math.max(1, Math.round(fpsCounterRef.current.frames / fpsCounterRef.current.elapsed))
        gameStore.setFps(measured)
        fpsCounterRef.current.frames = 0
        fpsCounterRef.current.elapsed = 0
      }
    }

    const snap = gameStore.getSnapshot()
    const time = state.clock.elapsedTime

    if (liveState.thunderFlash > 0) {
      liveState.thunderFlash = Math.max(0, liveState.thunderFlash - dt * 2.8)
    }

    // Freeze simulation cleanly when paused
    if (snap.phase === 'paused') {
      soundEngine.update(dt, {
        playing: false,
        sanity: liveState.sanity,
        creatureDistance: liveState.creatureDistance,
        creatureState: liveState.creatureState,
        isMoving: false,
        isSprinting: false,
      })
      return
    }

    if (snap.phase === 'playing') {
      if (keysRef.current.turnLeft) lookRef.current.yaw += 1.9 * dt
      if (keysRef.current.turnRight) lookRef.current.yaw -= 1.9 * dt

      const strafeTarget = (keysRef.current.left ? 1 : 0) - (keysRef.current.right ? 1 : 0)
      rollRef.current += (strafeTarget * 0.018 - rollRef.current) * Math.min(1, dt * 8)

      const madness = Math.max(0, (44 - liveState.sanity) / 44)
      const tilt =
        rollRef.current +
        (madness > 0 ? Math.sin(time * 2.0) * madness * 0.07 : 0) +
        liveState.hitFlash * 0.055

      camera.rotation.order = 'YXZ'
      camera.rotation.set(lookRef.current.pitch, lookRef.current.yaw, tilt)

      if (camera instanceof THREE.PerspectiveCamera) {
        const targetFov = 70 + madness * 5.5 + liveState.hitFlash * 5 + (liveState.playerSprinting ? 3.2 : 0)
        if (Math.abs(camera.fov - targetFov) > 0.08) {
          camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 7)
          camera.updateProjectionMatrix()
        }
      }
    } else if (snap.phase === 'menu') {
      camera.position.set(Math.sin(time * 0.22) * 0.75, 1.9 + Math.sin(time * 0.4) * 0.06, 40)
      camera.lookAt(Math.sin(time * 0.16) * 1.5, 3.0, -24)
    }

    // Powerful, clearly readable handheld flashlight beam + soft foreground fill
    camera.getWorldDirection(forwardVec)
    rightVec.crossVectors(forwardVec, upVec).normalize()
    const lowSanityFlicker =
      liveState.sanity < 28 ? (Math.sin(time * 29) * Math.sin(time * 13) > 0.76 ? 0.35 : 1) : 1
    const torchActive = snap.phase === 'playing' && liveState.flashlightOn

    if (spotRef.current) {
      spotRef.current.position
        .copy(camera.position)
        .addScaledVector(rightVec, 0.24)
        .addScaledVector(upVec, -0.16)
        .addScaledVector(forwardVec, 0.25)
      spotTarget.position.copy(camera.position).addScaledVector(forwardVec, 16)
      spotTarget.updateMatrixWorld()
      spotRef.current.intensity = torchActive ? 95 * lowSanityFlicker : 0
    }
    if (bounceLightRef.current) {
      bounceLightRef.current.position
        .copy(camera.position)
        .addScaledVector(forwardVec, 1.8)
        .addScaledVector(upVec, -0.25)
      bounceLightRef.current.intensity = torchActive ? 6.2 * lowSanityFlicker : 0
    }

    if (snap.phase !== 'playing') {
      soundEngine.update(dt, {
        playing: false,
        sanity: 100,
        creatureDistance: 58,
        creatureState: 'patrol',
        isMoving: false,
        isSprinting: false,
      })
      return
    }

    liveState.elapsedSeconds += dt

    // Horizontal movement with physical inertia & stamina
    const flatForward = forwardVec.set(forwardVec.x, 0, forwardVec.z)
    if (flatForward.lengthSq() > 1e-6) flatForward.normalize()
    const flatRight = rightVec.crossVectors(flatForward, upVec).normalize()

    moveDir.set(0, 0, 0)
    if (keysRef.current.forward) moveDir.add(flatForward)
    if (keysRef.current.backward) moveDir.sub(flatForward)
    if (keysRef.current.right) moveDir.add(flatRight)
    if (keysRef.current.left) moveDir.sub(flatRight)

    const wantsMove = moveDir.lengthSq() > 0.001
    const canSprint = !liveState.exhausted && liveState.stamina > 2
    const isSprinting = wantsMove && keysRef.current.sprint && canSprint
    liveState.playerSprinting = isSprinting

    if (isSprinting) {
      liveState.stamina = Math.max(0, liveState.stamina - 22 * dt)
      if (liveState.stamina <= 0.5) {
        liveState.exhausted = true
      }
    } else {
      const regen = wantsMove ? 10 : 18
      liveState.stamina = Math.min(100, liveState.stamina + regen * dt)
      if (liveState.exhausted && liveState.stamina >= 25) {
        liveState.exhausted = false
      }
    }

    let targetVx = 0
    let targetVz = 0
    if (wantsMove) {
      moveDir.normalize()
      const targetSpeed = isSprinting ? SPRINT_SPEED : WALK_SPEED
      targetVx = moveDir.x * targetSpeed
      targetVz = moveDir.z * targetSpeed
    }

    const accel = wantsMove ? 13.5 : 9.5
    const blend = Math.min(1, dt * accel)
    velRef.current.x += (targetVx - velRef.current.x) * blend
    velRef.current.z += (targetVz - velRef.current.z) * blend

    const actualSpeed = Math.hypot(velRef.current.x, velRef.current.z)
    const isMoving = actualSpeed > 0.35

    if (actualSpeed > 0.02) {
      const nextX = camera.position.x + velRef.current.x * dt
      const nextZ = camera.position.z + velRef.current.z * dt
      const resolved = resolveMovementCollision(nextX, nextZ, PLAYER_RADIUS)
      camera.position.x = resolved.x
      camera.position.z = resolved.z
      bobTimerRef.current += dt * (actualSpeed * 1.72)
    }

    const bobAmp = Math.min(0.062, actualSpeed * 0.0085)
    camera.position.y = PLAYER_SPAWN.y + (isMoving ? Math.sin(bobTimerRef.current) * bobAmp : 0)
    liveState.playerX = camera.position.x
    liveState.playerY = camera.position.y
    liveState.playerZ = camera.position.z
    liveState.playerYaw = camera.rotation.y

    // Fair, readable sanity economy
    const nearLight = isPointInSafeLight(camera.position.x, camera.position.z)
    liveState.isNearLight = nearLight

    const diffMult =
      snap.settings.difficulty === 'exploration'
        ? 0.6
        : snap.settings.difficulty === 'folie'
          ? 1.35
          : 1.0

    let sanityDelta = 0
    if (nearLight) {
      sanityDelta += 7.5
    } else {
      sanityDelta -= (liveState.flashlightOn ? 0.85 : 2.6) * diffMult
    }

    if (liveState.creatureDistance < 12) {
      const proximity = 1 - liveState.creatureDistance / 12
      sanityDelta -= proximity * 6.0 * diffMult
    }

    liveState.sanityTrend = sanityDelta
    liveState.sanity = Math.max(0, Math.min(100, liveState.sanity + sanityDelta * dt))
    if (liveState.hitFlash > 0) {
      liveState.hitFlash = Math.max(0, liveState.hitFlash - dt * 0.85)
    }
    if (liveState.pickupFlash > 0) {
      liveState.pickupFlash = Math.max(0, liveState.pickupFlash - dt * 1.1)
    }

    soundEngine.update(dt, {
      playing: true,
      sanity: liveState.sanity,
      creatureDistance: liveState.creatureDistance,
      creatureState: liveState.creatureState,
      isMoving,
      isSprinting,
      playerZ: camera.position.z,
    })

    if (liveState.sanity <= 0) {
      soundEngine.playLoss()
      gameStore.triggerLoss("L'obscurité et l'horreur d'Innsmouth ont englouti votre raison.")
      return
    }

    updateInteractionPrompt(snap)
    gameStore.syncHudTelemetry()
  })

  return (
    <>
      <primitive object={spotTarget} />
      <spotLight
        ref={spotRef}
        target={spotTarget}
        color="#e4fff0"
        intensity={95}
        distance={38}
        angle={0.56}
        penumbra={0.55}
        decay={1.1}
      />
      <pointLight ref={bounceLightRef} color="#cdeee0" intensity={6.2} distance={10} decay={1.4} />
    </>
  )
}

function handleInteract() {
  const snap = gameStore.getSnapshot()
  if (snap.phase !== 'playing') return

  const px = liveState.playerX
  const pz = liveState.playerZ

  let closestRelic: (typeof RELICS)[number] | null = null
  let closestDist = 4.6
  for (const relic of RELICS) {
    if (snap.collectedMask[relic.index]) continue
    const d = Math.hypot(px - relic.x, pz - relic.z)
    if (d < closestDist) {
      closestDist = d
      closestRelic = relic
    }
  }

  if (closestRelic) {
    soundEngine.playRelicPickup()
    gameStore.collectRelic(closestRelic.index, closestRelic.name)
    return
  }

  const distAltar = Math.hypot(px - LIGHTHOUSE_ALTAR_POS.x, pz - LIGHTHOUSE_ALTAR_POS.z)
  if (distAltar < 5.5) {
    if (snap.relicsCollected >= 5) {
      soundEngine.playWin()
      gameStore.triggerWin()
    } else {
      const rem = 5 - snap.relicsCollected
      gameStore.showToast(`Autel scellé — il manque encore ${rem} relique${rem > 1 ? 's' : ''}.`, 2400)
    }
  }
}

function updateInteractionPrompt(snap: ReturnType<typeof gameStore.getSnapshot>) {
  const px = liveState.playerX
  const pz = liveState.playerZ

  let closestName: string | null = null
  let closestDist = 9.0
  for (const relic of RELICS) {
    if (snap.collectedMask[relic.index]) continue
    const d = Math.hypot(px - relic.x, pz - relic.z)
    if (d < closestDist) {
      closestDist = d
      closestName = relic.name
    }
  }

  if (closestName) {
    if (closestDist <= 4.6) {
      gameStore.setInteractionPrompt(`[E] Ramasser : ${closestName}`)
    } else {
      gameStore.setInteractionPrompt(`✦ ${closestName} toute proche — approchez (${Math.round(closestDist)}m)`)
    }
    return
  }

  const distAltar = Math.hypot(px - LIGHTHOUSE_ALTAR_POS.x, pz - LIGHTHOUSE_ALTAR_POS.z)
  if (distAltar < 5.5) {
    if (snap.relicsCollected >= 5) {
      gameStore.setInteractionPrompt('[E] Briser le rituel du phare')
    } else {
      const remaining = 5 - snap.relicsCollected
      gameStore.setInteractionPrompt(`Autel scellé — il manque ${remaining} relique${remaining > 1 ? 's' : ''}`)
    }
    return
  }

  gameStore.setInteractionPrompt(null)
}
