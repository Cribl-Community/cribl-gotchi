let audio: AudioContext | null = null;

function context(): AudioContext | null {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audio ??= new Ctx();
  return audio;
}

export function beep(kind: 'tap' | 'happy' | 'alert' | 'dead', muted: boolean): void {
  if (muted) return;
  const ctx = context();
  if (!ctx) return;
  void ctx.resume().catch(() => undefined);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  const start = kind === 'dead' ? 420 : kind === 'alert' ? 680 : kind === 'happy' ? 520 : 240;
  const end = kind === 'dead' ? 90 : kind === 'happy' ? 880 : start + 80;
  osc.frequency.setValueAtTime(start, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), now + 0.18);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.start(now);
  osc.stop(now + 0.24);
}
