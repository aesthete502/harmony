import { createSynth, type Instrument } from './synth';

export type PlayMode = 'block' | 'up' | 'down';

export interface PlayOptions {
  mode?: PlayMode;
  /** 每个音的持续时长（毫秒） */
  noteMs?: number;
  /** 琶音相邻音的间隔（毫秒） */
  gapMs?: number;
}

/**
 * 音频引擎。所有播放都是「提前一次性排进 AudioContext 时间轴」的，
 * 不用 setTimeout，避免手机上节奏抖动（L9 的和声进行会依赖这一点）。
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private instrument: Instrument | null = null;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;

    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 6;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.2;

    const master = ctx.createGain();
    master.gain.value = 0.55;

    master.connect(compressor).connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.instrument = createSynth(ctx, master);
    return ctx;
  }

  /** 必须在用户手势里调用一次（Android Chrome / 移动端自动播放策略） */
  async unlock(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        /* 用户还没交互，忽略 */
      }
    }
  }

  get state(): 'idle' | 'running' | 'suspended' {
    if (!this.ctx) return 'idle';
    return this.ctx.state === 'running' ? 'running' : 'suspended';
  }

  async playNote(midi: number, durationMs = 900): Promise<void> {
    await this.play([midi], { mode: 'block', noteMs: durationMs });
  }

  async play(midis: number[], options: PlayOptions = {}): Promise<number> {
    if (midis.length === 0) return 0;
    const ctx = this.ensure();
    await this.unlock();

    const { mode = 'block', noteMs, gapMs } = options;
    const isArp = mode !== 'block';
    const gap = gapMs ?? (isArp ? 300 : 0);
    const duration = noteMs ?? (isArp ? 800 : 1400);

    const start = ctx.currentTime + 0.06;
    const ordered = mode === 'down' ? [...midis].sort((a, b) => b - a) : [...midis].sort((a, b) => a - b);

    ordered.forEach((midi, i) => {
      this.instrument?.trigger(midi, start + i * gap / 1000, duration / 1000, 0.62);
    });

    return duration + gap * Math.max(0, ordered.length - 1);
  }

  /** 播放一串和弦（每个和弦一组 MIDI），供和声进行使用 */
  async playSequence(
    chords: number[][],
    { bpm = 96, beatsPerChord = 2 }: { bpm?: number; beatsPerChord?: number } = {},
  ): Promise<number> {
    const ctx = this.ensure();
    await this.unlock();

    const beatMs = 60000 / bpm;
    const chordMs = beatMs * beatsPerChord;
    const start = ctx.currentTime + 0.06;

    chords.forEach((chord, i) => {
      const when = start + (i * chordMs) / 1000;
      chord.forEach((midi) => {
        this.instrument?.trigger(midi, when, (chordMs / 1000) * 0.92, 0.6);
      });
    });

    return chords.length * chordMs;
  }

  stop(): void {
    this.instrument?.dispose();
    if (this.ctx && this.master) {
      this.instrument = createSynth(this.ctx, this.master);
    }
  }
}

export const audio = new AudioEngine();
