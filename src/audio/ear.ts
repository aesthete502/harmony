import type { EarSpec } from '../quiz/types';
import type { PlayMode } from './engine';

export interface EarTimelineEvent {
  midis: number[];
  /** 相对于播放开始的毫秒数 */
  at: number;
  dur: number;
}

/**
 * 把听辨题翻译成一条播放时间轴：
 * 参照音（可选）→ 题目材料（和声一起响，或依次上行/下行）。
 * 音阶和调式始终上行，方便听出级数走向。
 */
export function buildEarTimeline(
  ear: EarSpec,
  { reference, mode }: { reference: boolean; mode: PlayMode },
): EarTimelineEvent[] {
  const events: EarTimelineEvent[] = [];
  let at = 0;

  if (ear.reference !== undefined && reference) {
    events.push({ midis: [ear.reference], at: 0, dur: 700 });
    at = 900;
  }

  const playMode: PlayMode = ear.style === 'setting' ? mode : 'up';
  if (playMode === 'block') {
    events.push({ midis: ear.midis, at, dur: 1400 });
  } else {
    const ordered =
      playMode === 'down'
        ? [...ear.midis].sort((a, b) => b - a)
        : [...ear.midis].sort((a, b) => a - b);
    ordered.forEach((midi, i) => {
      events.push({ midis: [midi], at: at + i * 420, dur: 700 });
    });
  }

  return events;
}
