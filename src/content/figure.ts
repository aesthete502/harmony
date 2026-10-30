import {
  buildChord,
  buildInterval,
  buildScale,
  CHORD_TYPES,
  chroma,
  isBlackKey,
  midiToAscii,
  octaveOf,
  prettyName,
  rootByPc,
} from '../theory';
import type { NoteSet, TheoryNote } from '../theory';
import type { ExploreRequest } from '../navigation';
import { MAJOR_DEGREE_CHORDS } from './lessons';
import type { LessonFigure } from './lessons';

/**
 * 讲义里的「图」不是静态图片：谱面和键盘都由现有的构建函数现场算出来，
 * 所以音名、拼写、调式规则一改，讲义会自动跟着变。
 */
export interface ResolvedFigure {
  label: string;
  caption: string;
  /** 有 NoteSet 时显示音名 pill 和半音结构 */
  set: NoteSet | null;
  notes: TheoryNote[];
  midis: number[];
  mode: 'block' | 'up';
  /** 谱面是否画成和弦（同时发声） */
  stacked: boolean;
  explore?: Omit<ExploreRequest, 'nonce'>;
  progression?: { roman: string; name: string; midis: number[] }[];
}

export function resolveFigure(fig: LessonFigure): ResolvedFigure {
  switch (fig.kind) {
    case 'pitch': {
      const name = midiToAscii(fig.midi).replace(/\d+$/, '');
      const note: TheoryNote = {
        midi: fig.midi,
        pc: chroma(fig.midi),
        name,
        label: prettyName(name),
        octave: octaveOf(fig.midi),
        degree: '1',
        role: 'root',
        isRoot: true,
      };
      return {
        label: fig.label,
        caption: fig.caption,
        set: null,
        notes: [note],
        midis: [fig.midi],
        mode: 'block',
        stacked: false,
      };
    }
    case 'scale': {
      const set = buildScale(fig.rootPc, fig.scaleId, 4);
      return {
        label: fig.label,
        caption: fig.caption,
        set,
        notes: set.notes,
        midis: set.notes.map((n) => n.midi),
        mode: 'up',
        stacked: false,
        explore: { kind: 'scale', rootPc: fig.rootPc, scaleId: fig.scaleId },
      };
    }
    case 'chord': {
      const inversion = fig.inversion ?? 0;
      const set = buildChord(fig.rootPc, fig.chordId, { octave: 4, inversion });
      return {
        label: fig.label,
        caption: fig.caption,
        set,
        notes: set.notes,
        midis: set.notes.map((n) => n.midi),
        mode: 'block',
        stacked: true,
        explore: { kind: 'chord', rootPc: fig.rootPc, chordId: fig.chordId, inversion },
      };
    }
    case 'interval': {
      const set = buildInterval(fig.rootMidi, fig.intervalId);
      return {
        label: fig.label,
        caption: fig.caption,
        set,
        notes: set.notes,
        midis: set.notes.map((n) => n.midi),
        mode: 'up',
        stacked: false,
        explore: { kind: 'interval', rootPc: chroma(fig.rootMidi), intervalId: fig.intervalId },
      };
    }
    case 'progression': {
      const progression = fig.degrees.map((roman) => {
        const spec = MAJOR_DEGREE_CHORDS[roman];
        if (!spec) throw new Error(`unknown degree: ${roman}`);
        const set = buildChord(spec.pc, spec.chordId, { octave: 4 });
        const type = CHORD_TYPES.find((t) => t.id === spec.chordId);
        return {
          roman,
          name: `${rootByPc(spec.pc).label}${type?.symbol ?? ''}`,
          midis: set.notes.map((n) => n.midi),
        };
      });
      return {
        label: fig.label,
        caption: fig.caption,
        set: null,
        notes: [],
        midis: [],
        mode: 'block',
        stacked: false,
        progression,
      };
    }
  }
}

/** 键盘范围要落在白键上，再往两边留一点余量 */
export function keyboardRange(midis: number[]): [number, number] {
  if (midis.length === 0) return [57, 72];
  let lo = Math.min(...midis) - 2;
  let hi = Math.max(...midis) + 2;
  while (isBlackKey(lo) && lo > 21) lo--;
  while (isBlackKey(hi) && hi < 108) hi++;
  return [lo, hi];
}
