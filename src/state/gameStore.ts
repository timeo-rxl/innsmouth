import { useSyncExternalStore } from 'react'

export type GamePhase = 'menu' | 'playing' | 'paused' | 'lost' | 'won'
export type CreatureState = 'patrol' | 'chase' | 'recoil'
export type KeyboardLayout = 'azerty' | 'qwerty'
export type DifficultyMode = 'exploration' | 'cauchemar' | 'folie'
export type GraphicsQuality = 'high' | 'eco'

export interface GameSettings {
  keyboardLayout: KeyboardLayout
  hideHud: boolean
  mouseSensitivity: number
  invertY: boolean
  difficulty: DifficultyMode
  graphicsQuality: GraphicsQuality
}

const SETTINGS_STORAGE_KEY = 'innsmouth_settings_v1'

const defaultSettings: GameSettings = {
  keyboardLayout: 'azerty',
  hideHud: false,
  mouseSensitivity: 1.0,
  invertY: false,
  difficulty: 'cauchemar',
  graphicsQuality: 'high',
}

function loadSettings(): GameSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    const parsed = JSON.parse(raw) as Partial<GameSettings>
    return {
      keyboardLayout: parsed.keyboardLayout === 'qwerty' ? 'qwerty' : 'azerty',
      hideHud: Boolean(parsed.hideHud),
      mouseSensitivity:
        typeof parsed.mouseSensitivity === 'number' && parsed.mouseSensitivity >= 0.4 && parsed.mouseSensitivity <= 2.2
          ? parsed.mouseSensitivity
          : 1.0,
      invertY: Boolean(parsed.invertY),
      difficulty:
        parsed.difficulty === 'exploration' || parsed.difficulty === 'folie' ? parsed.difficulty : 'cauchemar',
      graphicsQuality: parsed.graphicsQuality === 'eco' ? 'eco' : 'high',
    }
  } catch {
    return { ...defaultSettings }
  }
}

function saveSettings(settings: GameSettings) {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage errors
  }
}

export interface GameSnapshot {
  phase: GamePhase
  sanity: number
  sanityTrend: number // positive = recovering, negative = draining
  stamina: number
  exhausted: boolean
  relicsCollected: number
  collectedMask: boolean[]
  flashlightOn: boolean
  isNearLight: boolean
  creatureState: CreatureState
  creatureDistance: number
  hitFlash: number
  pickupFlash: number
  interactionPrompt: string | null
  toastMessage: string | null
  fps: number
  pointerLocked: boolean
  muted: boolean
  settings: GameSettings
  runId: number
  elapsedSeconds: number
  lossReason: string
}

// Mutable high-frequency telemetry read directly by 60fps R3F loops without React re-renders
export const liveState = {
  playerX: 0,
  playerY: 1.7,
  playerZ: 40,
  playerYaw: 0,
  playerSprinting: false,
  stamina: 100,
  exhausted: false,
  creatureX: 9.5,
  creatureY: 0,
  creatureZ: -18,
  sanity: 100,
  sanityTrend: 0,
  hitFlash: 0,
  pickupFlash: 0,
  thunderFlash: 0,
  isNearLight: true,
  flashlightOn: true,
  creatureState: 'patrol' as CreatureState,
  creatureDistance: 58,
  elapsedSeconds: 0,
}

const initialSnapshot: GameSnapshot = {
  phase: 'menu',
  sanity: 100,
  sanityTrend: 0,
  stamina: 100,
  exhausted: false,
  relicsCollected: 0,
  collectedMask: [false, false, false, false, false],
  flashlightOn: true,
  isNearLight: true,
  creatureState: 'patrol',
  creatureDistance: 58,
  hitFlash: 0,
  pickupFlash: 0,
  interactionPrompt: null,
  toastMessage: null,
  fps: 60,
  pointerLocked: false,
  muted: false,
  settings: loadSettings(),
  runId: 1,
  elapsedSeconds: 0,
  lossReason: 'Votre esprit a cédé à l’appel des profondeurs.',
}

let snapshot: GameSnapshot = { ...initialSnapshot }
const listeners = new Set<() => void>()
let toastTimer: number | null = null

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export const gameStore = {
  getSnapshot: () => snapshot,

  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  showToast: (msg: string, durationMs = 3000) => {
    if (toastTimer !== null) window.clearTimeout(toastTimer)
    snapshot = { ...snapshot, toastMessage: msg }
    emit()
    toastTimer = window.setTimeout(() => {
      toastTimer = null
      snapshot = { ...snapshot, toastMessage: null }
      emit()
    }, durationMs)
  },

  startGame: () => {
    resetLivePositions()
    snapshot = {
      ...initialSnapshot,
      phase: 'playing',
      collectedMask: [false, false, false, false, false],
      runId: snapshot.runId + 1,
      fps: snapshot.fps,
      muted: snapshot.muted,
      settings: snapshot.settings,
    }
    emit()
  },

  restartGame: () => {
    resetLivePositions()
    snapshot = {
      ...initialSnapshot,
      phase: 'playing',
      collectedMask: [false, false, false, false, false],
      runId: snapshot.runId + 1,
      fps: snapshot.fps,
      muted: snapshot.muted,
      settings: snapshot.settings,
    }
    emit()
  },

  pauseGame: () => {
    if (snapshot.phase !== 'playing') return
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
    snapshot = { ...snapshot, phase: 'paused' }
    emit()
  },

  resumeGame: () => {
    if (snapshot.phase !== 'paused') return
    snapshot = { ...snapshot, phase: 'playing' }
    emit()
  },

  returnToMenu: () => {
    resetLivePositions()
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
    snapshot = {
      ...initialSnapshot,
      phase: 'menu',
      collectedMask: [false, false, false, false, false],
      runId: snapshot.runId + 1,
      fps: snapshot.fps,
      muted: snapshot.muted,
      settings: snapshot.settings,
    }
    emit()
  },

  updateSettings: (partial: Partial<GameSettings>) => {
    const nextSettings = { ...snapshot.settings, ...partial }
    saveSettings(nextSettings)
    snapshot = { ...snapshot, settings: nextSettings }
    emit()
  },

  toggleHideHud: () => {
    const nextSettings = { ...snapshot.settings, hideHud: !snapshot.settings.hideHud }
    saveSettings(nextSettings)
    snapshot = { ...snapshot, settings: nextSettings }
    emit()
  },

  toggleFlashlight: () => {
    if (snapshot.phase !== 'playing') return
    liveState.flashlightOn = !liveState.flashlightOn
    snapshot = { ...snapshot, flashlightOn: liveState.flashlightOn }
    emit()
  },

  collectRelic: (index: number, name: string) => {
    if (snapshot.phase !== 'playing' || snapshot.collectedMask[index]) return
    const nextMask = [...snapshot.collectedMask]
    nextMask[index] = true
    const count = nextMask.filter(Boolean).length
    liveState.sanity = Math.min(100, liveState.sanity + 24)
    liveState.pickupFlash = 1.0
    snapshot = {
      ...snapshot,
      collectedMask: nextMask,
      relicsCollected: count,
      sanity: Math.round(liveState.sanity),
      pickupFlash: 1.0,
    }
    emit()
    gameStore.showToast(
      count >= 5
        ? `✦ ${name} (${count}/5) — Le sceau du phare est brisé ! Rejoignez le nord !`
        : `✦ Relique trouvée : ${name} (${count}/5) · +24 Santé mentale`,
      3600
    )
  },

  triggerWin: () => {
    if (snapshot.phase !== 'playing') return
    snapshot = {
      ...snapshot,
      phase: 'won',
      elapsedSeconds: Math.round(liveState.elapsedSeconds),
      interactionPrompt: null,
    }
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
    emit()
  },

  triggerLoss: (reason: string) => {
    if (snapshot.phase !== 'playing') return
    liveState.sanity = 0
    snapshot = {
      ...snapshot,
      phase: 'lost',
      sanity: 0,
      hitFlash: 1,
      elapsedSeconds: Math.round(liveState.elapsedSeconds),
      interactionPrompt: null,
      lossReason: reason,
    }
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
    emit()
  },

  setPointerLocked: (locked: boolean) => {
    if (snapshot.pointerLocked === locked) return
    snapshot = { ...snapshot, pointerLocked: locked }
    emit()
  },

  setMuted: (muted: boolean) => {
    if (snapshot.muted === muted) return
    snapshot = { ...snapshot, muted }
    emit()
  },

  setInteractionPrompt: (prompt: string | null) => {
    if (snapshot.interactionPrompt === prompt) return
    snapshot = { ...snapshot, interactionPrompt: prompt }
    emit()
  },

  setFps: (fps: number) => {
    if (snapshot.fps === fps) return
    snapshot = { ...snapshot, fps }
    emit()
  },

  syncHudTelemetry: () => {
    const roundedSanity = Math.max(0, Math.min(100, Math.round(liveState.sanity)))
    const roundedTrend = Math.round(liveState.sanityTrend * 10) / 10
    const roundedStamina = Math.max(0, Math.min(100, Math.round(liveState.stamina)))
    const roundedDist = Math.round(liveState.creatureDistance * 10) / 10
    const roundedFlash = Math.round(liveState.hitFlash * 100) / 100
    const roundedPickup = Math.round(liveState.pickupFlash * 100) / 100
    const elapsed = Math.floor(liveState.elapsedSeconds)

    if (
      snapshot.sanity !== roundedSanity ||
      Math.abs(snapshot.sanityTrend - roundedTrend) >= 0.4 ||
      Math.abs(snapshot.stamina - roundedStamina) >= 2 ||
      snapshot.exhausted !== liveState.exhausted ||
      snapshot.isNearLight !== liveState.isNearLight ||
      snapshot.creatureState !== liveState.creatureState ||
      Math.abs(snapshot.creatureDistance - roundedDist) >= 0.5 ||
      Math.abs(snapshot.hitFlash - roundedFlash) >= 0.04 ||
      Math.abs(snapshot.pickupFlash - roundedPickup) >= 0.05 ||
      snapshot.elapsedSeconds !== elapsed
    ) {
      snapshot = {
        ...snapshot,
        sanity: roundedSanity,
        sanityTrend: roundedTrend,
        stamina: roundedStamina,
        exhausted: liveState.exhausted,
        isNearLight: liveState.isNearLight,
        creatureState: liveState.creatureState,
        creatureDistance: roundedDist,
        hitFlash: roundedFlash,
        pickupFlash: roundedPickup,
        elapsedSeconds: elapsed,
      }
      emit()
    }
  },
}

function resetLivePositions() {
  liveState.playerX = 0
  liveState.playerY = 1.7
  liveState.playerZ = 40
  liveState.playerYaw = 0
  liveState.playerSprinting = false
  liveState.stamina = 100
  liveState.exhausted = false
  liveState.creatureX = 9.5
  liveState.creatureY = 0
  liveState.creatureZ = -18
  liveState.sanity = 100
  liveState.sanityTrend = 0
  liveState.hitFlash = 0
  liveState.pickupFlash = 0
  liveState.thunderFlash = 0
  liveState.isNearLight = true
  liveState.flashlightOn = true
  liveState.creatureState = 'patrol'
  liveState.creatureDistance = 58
  liveState.elapsedSeconds = 0
}

export function useGameStore(): GameSnapshot {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getSnapshot)
}
