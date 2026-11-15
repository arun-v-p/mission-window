// Web Audio API Synthesizer for NASA Telemetry & Orbital SFX
// Zero external file dependencies - synthesized directly in the browser!

class AudioTelemetryService {
  private ctx: AudioContext | null = null
  private isMuted: boolean = false

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('mission-window-muted')
        this.isMuted = saved === 'true'
      }
    } catch {
      this.isMuted = false
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (this.isMuted) return null
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mission-window-muted', String(this.isMuted))
      }
    } catch {
      // ignore
    }
    return this.isMuted
  }

  public getMuted(): boolean {
    return this.isMuted
  }

  // Iconic NASA Apollo Quindar Tone (1250 Hz sine burst)
  public playQuindarTone() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(1250, ctx.currentTime)

      gain.gain.setValueAtTime(0.001, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.23)
    } catch {
      // ignore
    }
  }

  // Micro-interaction button click
  public playClick() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05)

      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.05)
    } catch {
      // ignore
    }
  }

  // Anomaly warning alert
  public playWarningAlert() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(660, now + 0.12)
      osc.frequency.setValueAtTime(880, now + 0.24)

      gain.gain.setValueAtTime(0.1, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.42)
    } catch {
      // ignore
    }
  }

  // Thruster burn sound effect (low frequency rumble)
  public playThrusterManeuver() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(80, now)
      osc.frequency.linearRampToValueAtTime(140, now + 0.2)
      osc.frequency.linearRampToValueAtTime(60, now + 0.5)

      gain.gain.setValueAtTime(0.01, now)
      gain.gain.linearRampToValueAtTime(0.15, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.6)
    } catch {
      // ignore
    }
  }

  // Sci-fi Laser Blaster Shot
  public playLaserShot() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(1100, now)
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12)

      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.13)
    } catch {
      // ignore
    }
  }

  // Asteroid / Alien Ship Explosion
  public playExplosion() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const bufferSize = ctx.sampleRate * 0.4
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(450, now)
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.38)

      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(now)
      noise.stop(now + 0.4)
    } catch {
      // ignore
    }
  }

  // Ship impact / damage crash
  public playDamageHit() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(180, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.25)

      gain.gain.setValueAtTime(0.3, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.26)
    } catch {
      // ignore
    }
  }

  // Checkpoint reached fanfare
  public playCheckpoint() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = [587.33, 880, 1174.66] // D5, A5, D6
      notes.forEach((freq, idx) => {
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)

        gain.gain.setValueAtTime(0.1, now + idx * 0.08)
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 0.36)
      })
    } catch {
      // ignore
    }
  }

  // Light-speed hyperdrive warp sound
  public playWarpJump() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(220, now)
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.6)

      gain.gain.setValueAtTime(0.05, now)
      gain.gain.linearRampToValueAtTime(0.18, now + 0.4)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.75)
    } catch {
      // ignore
    }
  }

  // Mission success chord (celestial triad)
  public playMissionSuccess() {
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        if (!ctx) return
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now + idx * 0.08)

        gain.gain.setValueAtTime(0.001, now + idx * 0.08)
        gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.08 + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.08)
        osc.stop(now + idx * 0.08 + 1.25)
      })
    } catch {
      // ignore
    }
  }
}

export const audioTelemetry = new AudioTelemetryService()
