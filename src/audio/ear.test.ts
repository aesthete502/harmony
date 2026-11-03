import { describe, expect, it } from 'vitest';
import type { EarSpec } from '../quiz/types';
import { buildEarTimeline } from './ear';

const scaleEar: EarSpec = {
  reference: 60,
  midis: [60, 62, 64, 65, 67, 69, 71, 72],
  style: 'melodic',
  note: '先播主音',
};

const chordEar: EarSpec = {
  reference: 60,
  midis: [60, 64, 67],
  style: 'setting',
  note: '先播根音',
};

describe('听辨播放时间轴', () => {
  it('参照音最先播，题目材料往后错开', () => {
    const events = buildEarTimeline(chordEar, { reference: true, mode: 'block' });
    expect(events[0]).toEqual({ midis: [60], at: 0, dur: 700 });
    expect(events[1].at).toBeGreaterThanOrEqual(700);
    expect(events[1].midis).toEqual([60, 64, 67]);
  });

  it('关掉参照音后直接从题目开始', () => {
    const events = buildEarTimeline(chordEar, { reference: false, mode: 'block' });
    expect(events).toHaveLength(1);
    expect(events[0].at).toBe(0);
    expect(events[0].midis).toEqual([60, 64, 67]);
  });

  it('音阶无论设置如何都上行播放', () => {
    for (const mode of ['block', 'down'] as const) {
      const events = buildEarTimeline(scaleEar, { reference: false, mode });
      expect(events.map((e) => e.midis[0])).toEqual(scaleEar.midis);
    }
  });

  it('和弦按设置决定和声还是琶音', () => {
    const block = buildEarTimeline(chordEar, { reference: false, mode: 'block' });
    expect(block).toHaveLength(1);
    expect(block[0].midis).toEqual([60, 64, 67]);

    const up = buildEarTimeline(chordEar, { reference: false, mode: 'up' });
    expect(up.map((e) => e.midis[0])).toEqual([60, 64, 67]);

    const down = buildEarTimeline(chordEar, { reference: false, mode: 'down' });
    expect(down.map((e) => e.midis[0])).toEqual([67, 64, 60]);
  });

  it('琶音不会重叠：每个音的起点等于上一个的起点加间隔', () => {
    const events = buildEarTimeline({ ...chordEar, reference: undefined }, { reference: true, mode: 'up' });
    expect(events).toHaveLength(3);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].at - events[i - 1].at).toBe(420);
    }
  });
});
