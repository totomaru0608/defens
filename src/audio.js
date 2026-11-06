// Web Audio API 기반 절차적 효과음 생성기 (외부 오디오 에셋 불필요)
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playTone(freq, endFreq, duration, type = 'triangle', gainVal = 0.12) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playSlash() {
    this.playTone(340, 110, 0.11, 'sawtooth', 0.09);
  }

  playSkill() {
    this.playTone(220, 680, 0.22, 'sawtooth', 0.14);
    setTimeout(() => this.playTone(520, 160, 0.25, 'triangle', 0.14), 70);
  }

  playCoinPickup() {
    this.playTone(987.77, 1318.51, 0.11, 'sine', 0.11);
  }

  playCoinFeed() {
    this.playTone(640, 880, 0.06, 'sine', 0.07);
  }

  playTowerBuilt() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, n * 1.02, 0.14, 'triangle', 0.13), idx * 55);
    });
  }

  playTowerShot(kind = 'crossbow') {
    if (kind === 'crossbow') {
      this.playTone(540, 220, 0.07, 'triangle', 0.06);
    } else if (kind === 'cannon') {
      this.playTone(150, 45, 0.22, 'sawtooth', 0.13);
    } else {
      this.playTone(760, 480, 0.12, 'sine', 0.07);
    }
  }

  playEnemyDefeat() {
    this.playTone(280, 90, 0.12, 'square', 0.06);
  }

  playCastleHit() {
    this.playTone(130, 50, 0.3, 'sawtooth', 0.18);
  }

  playStageClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(n, n, 0.22, 'triangle', 0.15), i * 95);
    });
  }
}

export const sfx = new SoundEffects();

