/**
 * 音源接口。合成音色和将来的钢琴采样都实现这个接口，
 * 切换音色时调用方完全不用改。
 */
export interface Instrument {
  trigger(midi: number, when: number, duration: number, velocity?: number): void;
  dispose(): void;
}

/** 合成音色：三角波主体 + 一个八度正弦泛音，带起音与衰减包络 */
export function createSynth(ctx: AudioContext, output: AudioNode): Instrument {
  const voices = new Set<{ osc: OscillatorNode[]; gain: GainNode }>();

  return {
    trigger(midi, when, duration, velocity = 0.7) {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const t0 = Math.max(when, ctx.currentTime + 0.005);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(velocity, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(Math.max(velocity * 0.4, 0.001), t0 + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration + 0.35);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(freq * 8, 12000), t0);
      filter.Q.value = 0.6;

      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const harmonic = ctx.createGain();
      harmonic.gain.value = 0.18;

      osc1.connect(filter);
      osc2.connect(harmonic).connect(filter);
      filter.connect(gain).connect(output);

      const stopAt = t0 + duration + 0.4;
      osc1.start(t0);
      osc2.start(t0);
      osc1.stop(stopAt);
      osc2.stop(stopAt);

      const voice = { osc: [osc1, osc2], gain };
      voices.add(voice);
      osc1.onended = () => {
        voices.delete(voice);
        gain.disconnect();
        filter.disconnect();
        harmonic.disconnect();
      };
    },
    dispose() {
      for (const v of voices) {
        v.osc.forEach((o) => {
          try {
            o.stop();
          } catch {
            /* already stopped */
          }
        });
        v.gain.disconnect();
      }
      voices.clear();
    },
  };
}
