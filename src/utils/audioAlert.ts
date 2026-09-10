// Web Audio API synthesized sounds - zero external audio files needed

let audioCtx: AudioContext | null = null;
let activeSirenNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
let sirenStopTimer: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a high-urgency oscillating security siren (650Hz - 1350Hz sweep).
 * Used for critical security threats, knives, and dangerous weapons in public spaces.
 */
export function playSecuritySiren(durationMs = 3200) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Silence any running siren before starting fresh
    stopSecuritySiren();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    // Repeating high-urgency siren sweeps: 650Hz -> 1350Hz -> 650Hz
    const sweepDuration = 0.32; // 3.1 Hz cycle frequency
    const cycles = Math.max(3, Math.floor(durationMs / 1000 / sweepDuration));

    for (let i = 0; i < cycles; i++) {
      const t = now + i * sweepDuration;
      const mid = t + sweepDuration * 0.5;
      const end = t + sweepDuration;

      osc1.frequency.setValueAtTime(650, t);
      osc1.frequency.exponentialRampToValueAtTime(1350, mid);
      osc1.frequency.exponentialRampToValueAtTime(650, end);

      osc2.frequency.setValueAtTime(656, t); // Slight detune for phasing urgency
      osc2.frequency.exponentialRampToValueAtTime(1362, mid);
      osc2.frequency.exponentialRampToValueAtTime(656, end);
    }

    const totalDuration = cycles * sweepDuration;

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + totalDuration - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + totalDuration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + totalDuration);
    osc2.stop(now + totalDuration);

    activeSirenNodes = { osc1, osc2, gain };
    sirenStopTimer = setTimeout(() => {
      activeSirenNodes = null;
    }, totalDuration * 1000);
  } catch (err) {
    console.warn('[Audio Alert] Security siren playback error:', err);
  }
}

/**
 * Stops any actively sounding security alarm siren.
 */
export function stopSecuritySiren() {
  if (sirenStopTimer) {
    clearTimeout(sirenStopTimer);
    sirenStopTimer = null;
  }
  if (activeSirenNodes) {
    try {
      activeSirenNodes.gain.gain.setValueAtTime(0, audioCtx?.currentTime || 0);
      activeSirenNodes.osc1.stop();
      activeSirenNodes.osc2.stop();
    } catch {
      // Ignore if already stopped
    }
    activeSirenNodes = null;
  }
}

export function playAlertTone(type: 'CRITICAL' | 'WARNING' | 'ACKNOWLEDGE' | 'CHIME' | 'SECURITY_SIREN') {
  if (type === 'SECURITY_SIREN') {
    playSecuritySiren();
    return;
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'CRITICAL') {
      // 2-tone urgent alarm (880Hz -> 660Hz -> 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.3);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'WARNING') {
      // Dual beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';

      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.12); // G5

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'ACKNOWLEDGE') {
      // Smooth confirmation chord
      const freqs = [523.25, 659.25, 783.99]; // C Major
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.04, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + 0.45);
      });
    } else {
      // Gentle chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Audio may be blocked until first user gesture
  }
}
