import type { CreatureState } from '../state/gameStore'

/**
 * 100% Procedural Web Audio API Horror Soundscape:
 * - Abyssal sub-bass drone
 * - Bandpass-filtered eldritch whispers
 * - Rolling harbor sea surf (stronger near the docks)
 * - Distant coastal foghorn
 * - Dynamic heartbeat synced to sanity & threat proximity
 * - Distant rolling thunder (with callback for visual sky flash)
 * - Wet cobblestone footsteps, flashlight click, relic chime, UI ping, hit shock, win/loss cues
 */
class InnsmouthSoundEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private droneGain: GainNode | null = null
  private droneFilter: BiquadFilterNode | null = null
  private whisperGain: GainNode | null = null
  private whisperFilterA: BiquadFilterNode | null = null
  private whisperFilterB: BiquadFilterNode | null = null
  private surfGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null

  private initialized = false
  private muted = false
  private heartbeatTimer = 0
  private thunderTimer = 10
  private foghornTimer = 16
  private stepTimer = 0
  private prevCreatureState: CreatureState = 'patrol'
  private lightningCallback: (() => void) | null = null

  public setLightningCallback(cb: (() => void) | null) {
    this.lightningCallback = cb
  }

  public isMuted(): boolean {
    return this.muted
  }

  public toggleMute(): boolean {
    this.muted = !this.muted
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.ctx.currentTime, 0.08)
    }
    return this.muted
  }

  public initAndResume() {
    if (typeof window === 'undefined') return
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return

    if (!this.ctx) {
      this.ctx = new AudioCtx()
      this.buildGraph(this.ctx)
      this.initialized = true
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  private buildGraph(ctx: AudioContext) {
    this.masterGain = ctx.createGain()
    this.masterGain.gain.value = this.muted ? 0 : 0.72
    this.masterGain.connect(ctx.destination)

    // Reusable 3-second pink-weighted noise buffer
    const length = ctx.sampleRate * 3
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = this.noiseBuffer.getChannelData(0)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99765 * b0 + white * 0.099046
      b1 = 0.963 * b1 + white * 0.2965164
      b2 = 0.57 * b2 + white * 1.0526913
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.16
    }

    // 1. Sub-bass Abyssal Drone
    this.droneFilter = ctx.createBiquadFilter()
    this.droneFilter.type = 'lowpass'
    this.droneFilter.frequency.value = 115
    this.droneFilter.Q.value = 3.2

    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.07

    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.value = 41.2

    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.value = 61.7

    const droneLfo = ctx.createOscillator()
    droneLfo.type = 'sine'
    droneLfo.frequency.value = 0.17
    const droneLfoGain = ctx.createGain()
    droneLfoGain.gain.value = 38
    droneLfo.connect(droneLfoGain)
    droneLfoGain.connect(this.droneFilter.frequency)

    osc1.connect(this.droneFilter)
    osc2.connect(this.droneFilter)
    this.droneFilter.connect(this.droneGain)
    this.droneGain.connect(this.masterGain)

    osc1.start()
    osc2.start()
    droneLfo.start()

    // 2. Eldritch Whispers
    const whisperSrc = ctx.createBufferSource()
    whisperSrc.buffer = this.noiseBuffer
    whisperSrc.loop = true

    this.whisperFilterA = ctx.createBiquadFilter()
    this.whisperFilterA.type = 'bandpass'
    this.whisperFilterA.frequency.value = 980
    this.whisperFilterA.Q.value = 8.5

    this.whisperFilterB = ctx.createBiquadFilter()
    this.whisperFilterB.type = 'bandpass'
    this.whisperFilterB.frequency.value = 1620
    this.whisperFilterB.Q.value = 7.5

    this.whisperGain = ctx.createGain()
    this.whisperGain.gain.value = 0.014

    const whisperLfo = ctx.createOscillator()
    whisperLfo.type = 'sine'
    whisperLfo.frequency.value = 0.28
    const whisperLfoGain = ctx.createGain()
    whisperLfoGain.gain.value = 420
    whisperLfo.connect(whisperLfoGain)
    whisperLfoGain.connect(this.whisperFilterA.frequency)
    whisperLfoGain.connect(this.whisperFilterB.frequency)

    whisperSrc.connect(this.whisperFilterA)
    whisperSrc.connect(this.whisperFilterB)
    this.whisperFilterA.connect(this.whisperGain)
    this.whisperFilterB.connect(this.whisperGain)
    this.whisperGain.connect(this.masterGain)

    whisperSrc.start()
    whisperLfo.start()

    // 3. Lapping Black Sea Surf (slow ocean swell LFO)
    const surfSrc = ctx.createBufferSource()
    surfSrc.buffer = this.noiseBuffer
    surfSrc.loop = true

    const surfFilter = ctx.createBiquadFilter()
    surfFilter.type = 'lowpass'
    surfFilter.frequency.value = 380

    const surfLfo = ctx.createOscillator()
    surfLfo.type = 'sine'
    surfLfo.frequency.value = 0.14
    const surfLfoGain = ctx.createGain()
    surfLfoGain.gain.value = 190
    surfLfo.connect(surfLfoGain)
    surfLfoGain.connect(surfFilter.frequency)

    this.surfGain = ctx.createGain()
    this.surfGain.gain.value = 0.045

    surfSrc.connect(surfFilter)
    surfFilter.connect(this.surfGain)
    this.surfGain.connect(this.masterGain)

    surfSrc.start()
    surfLfo.start()
  }

  public update(
    dt: number,
    params: {
      playing: boolean
      sanity: number
      creatureDistance: number
      creatureState: CreatureState
      isMoving: boolean
      isSprinting: boolean
      playerZ?: number
    }
  ) {
    if (!this.initialized || !this.ctx || !this.droneGain || !this.whisperGain || !this.droneFilter) return
    if (this.ctx.state !== 'running') return

    const now = this.ctx.currentTime

    if (!params.playing) {
      this.droneGain.gain.setTargetAtTime(0.048, now, 0.25)
      this.whisperGain.gain.setTargetAtTime(0.008, now, 0.25)
      this.surfGain?.gain.setTargetAtTime(0.035, now, 0.3)
      return
    }

    const madness = 1 - params.sanity / 100
    const proximity = Math.max(0, 1 - params.creatureDistance / 24)
    const threat = Math.max(madness, proximity * 0.95)

    // Drone swells with dread
    const targetDrone = 0.085 + threat * 0.17 + (params.creatureState === 'chase' ? 0.08 : 0)
    this.droneGain.gain.setTargetAtTime(targetDrone, now, 0.18)
    this.droneFilter.frequency.setTargetAtTime(95 + threat * 145, now, 0.2)

    // Whispers intensify when sanity drops or creature hunts nearby
    const targetWhisper = 0.016 + madness * 0.16 + proximity * 0.11
    this.whisperGain.gain.setTargetAtTime(targetWhisper, now, 0.2)

    // Sea surf rises as you approach the harbor pier (z goes from +40 down to -56)
    const pz = params.playerZ ?? 0
    const harborProximity = Math.max(0, Math.min(1, (10 - pz) / 55))
    this.surfGain?.gain.setTargetAtTime(0.04 + harborProximity * 0.12, now, 0.3)

    // Chase warning horn when creature spots player
    if (params.creatureState === 'chase' && this.prevCreatureState !== 'chase') {
      this.playChaseStinger()
    }
    this.prevCreatureState = params.creatureState

    // Heartbeat based on threat / low sanity
    const heartStress = Math.max(madness * 1.1, proximity)
    if (heartStress > 0.26) {
      const bpm = 64 + heartStress * 74
      const interval = 60 / bpm
      this.heartbeatTimer += dt
      if (this.heartbeatTimer >= interval) {
        this.heartbeatTimer = 0
        this.playHeartbeat(0.18 + heartStress * 0.34)
      }
    } else {
      this.heartbeatTimer = 0
    }

    // Distant rolling thunder every 16..28s
    this.thunderTimer -= dt
    if (this.thunderTimer <= 0) {
      this.thunderTimer = 16 + Math.random() * 12
      this.playThunder()
      this.lightningCallback?.()
    }

    // Distant haunted harbor foghorn every 24..38s
    this.foghornTimer -= dt
    if (this.foghornTimer <= 0) {
      this.foghornTimer = 24 + Math.random() * 14
      this.playFoghorn()
    }

    // Wet cobblestone footsteps
    if (params.isMoving) {
      const stepInterval = params.isSprinting ? 0.3 : 0.47
      this.stepTimer += dt
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0
        this.playFootstep(params.isSprinting)
      }
    } else {
      this.stepTimer = 0.24
    }
  }

  private playFoghorn() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 260

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.13, t + 0.85)
    gain.gain.setValueAtTime(0.12, t + 2.4)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 4.4)

    filter.connect(gain)
    gain.connect(this.masterGain)

    ;[73.42, 110.0, 146.83].forEach((freq, idx) => {
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      osc.type = idx === 0 ? 'sawtooth' : 'triangle'
      osc.frequency.setValueAtTime(freq, t)
      osc.frequency.linearRampToValueAtTime(freq * 0.985, t + 4.2)
      osc.connect(filter)
      osc.start(t)
      osc.stop(t + 4.5)
    })
  }

  private playHeartbeat(volume: number) {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.pulseLow(t, 76, 34, 0.13, volume)
    this.pulseLow(t + 0.19, 64, 30, 0.16, volume * 0.78)
  }

  private pulseLow(startTime: number, f0: number, f1: number, dur: number, vol: number) {
    if (!this.ctx || !this.masterGain) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f0, startTime)
    osc.frequency.exponentialRampToValueAtTime(f1, startTime + dur)

    gain.gain.setValueAtTime(0.001, startTime)
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur)

    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(startTime)
    osc.stop(startTime + dur + 0.02)
  }

  private playThunder() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(240, t)
    filter.frequency.exponentialRampToValueAtTime(48, t + 3.4)

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.35, t + 0.22)
    gain.gain.linearRampToValueAtTime(0.16, t + 1.1)
    gain.gain.linearRampToValueAtTime(0.24, t + 1.5)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3.6)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    src.start(t)
    src.stop(t + 3.7)
  }

  private playFootstep(sprinting: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 520 + Math.random() * 240
    filter.Q.value = 1.6

    const gain = this.ctx.createGain()
    const vol = sprinting ? 0.14 : 0.08
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    src.start(t, Math.random() * 1.5, 0.1)
  }

  public playUiTick() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(340, t)
    osc.frequency.exponentialRampToValueAtTime(190, t + 0.06)
    gain.gain.setValueAtTime(0.09, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.08)
  }

  public playFlashlightClick() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 1800

    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.24, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045)

    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    src.start(t, 0.2, 0.05)
  }

  public playRelicPickup() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const freqs = [220, 277.18, 329.63, 466.16]
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, t + idx * 0.06)
      gain.gain.setValueAtTime(0.001, t + idx * 0.06)
      gain.gain.linearRampToValueAtTime(0.14, t + idx * 0.06 + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 1.35)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(t + idx * 0.06)
      osc.stop(t + idx * 0.06 + 1.4)
    })
  }

  public playCreatureHit() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.pulseLow(t, 120, 28, 0.45, 0.55)
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(480, t)
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.55)
    gain.gain.setValueAtTime(0.24, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 0.62)
  }

  private playChaseStinger() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(82, t)
    osc.frequency.linearRampToValueAtTime(73, t + 1.1)
    filter.type = 'lowpass'
    filter.frequency.value = 340
    gain.gain.setValueAtTime(0.001, t)
    gain.gain.linearRampToValueAtTime(0.19, t + 0.14)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.masterGain)
    osc.start(t)
    osc.stop(t + 1.4)
  }

  public playWin() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    const chord = [261.63, 329.63, 392.0, 523.25]
    chord.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(f, t + idx * 0.08)
      gain.gain.setValueAtTime(0.001, t + idx * 0.08)
      gain.gain.linearRampToValueAtTime(0.14, t + idx * 0.08 + 0.15)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.8)
      osc.connect(gain)
      gain.connect(this.masterGain)
      osc.start(t + idx * 0.08)
      osc.stop(t + 2.9)
    })
  }

  public playLoss() {
    if (!this.ctx || !this.masterGain) return
    const t = this.ctx.currentTime
    this.pulseLow(t, 92, 24, 2.2, 0.52)
  }
}

export const soundEngine = new InnsmouthSoundEngine()
