import { Chord } from 'tonal';
import { buildNotes, octaveOf, prettyName, rootByPc } from './notes';
import type { NoteRole, NoteSet, TheoryNote } from './types';

export interface ChordType {
  id: string;
  label: string;
  /** 和弦记号后缀，如 "" (大三)、"m7" */
  symbol: string;
  semitones: number[];
  degrees: string[];
  roles: NoteRole[];
}

export const CHORD_TYPES: ChordType[] = [
  {
    id: 'major',
    label: '大三和弦',
    symbol: '',
    semitones: [0, 4, 7],
    degrees: ['1', '3', '5'],
    roles: ['root', 'third', 'fifth'],
  },
  {
    id: 'minor',
    label: '小三和弦',
    symbol: 'm',
    semitones: [0, 3, 7],
    degrees: ['1', '♭3', '5'],
    roles: ['root', 'third', 'fifth'],
  },
  {
    id: 'dim',
    label: '减三和弦',
    symbol: 'dim',
    semitones: [0, 3, 6],
    degrees: ['1', '♭3', '♭5'],
    roles: ['root', 'third', 'fifth'],
  },
  {
    id: 'aug',
    label: '增三和弦',
    symbol: 'aug',
    semitones: [0, 4, 8],
    degrees: ['1', '3', '♯5'],
    roles: ['root', 'third', 'fifth'],
  },
  {
    id: 'maj7',
    label: '大七和弦',
    symbol: 'maj7',
    semitones: [0, 4, 7, 11],
    degrees: ['1', '3', '5', '7'],
    roles: ['root', 'third', 'fifth', 'seventh'],
  },
  {
    id: '7',
    label: '属七和弦',
    symbol: '7',
    semitones: [0, 4, 7, 10],
    degrees: ['1', '3', '5', '♭7'],
    roles: ['root', 'third', 'fifth', 'seventh'],
  },
  {
    id: 'm7',
    label: '小七和弦',
    symbol: 'm7',
    semitones: [0, 3, 7, 10],
    degrees: ['1', '♭3', '5', '♭7'],
    roles: ['root', 'third', 'fifth', 'seventh'],
  },
  {
    id: 'm7b5',
    label: '半减七和弦',
    symbol: 'm7b5',
    semitones: [0, 3, 6, 10],
    degrees: ['1', '♭3', '♭5', '♭7'],
    roles: ['root', 'third', 'fifth', 'seventh'],
  },
  {
    id: 'dim7',
    label: '减七和弦',
    symbol: 'dim7',
    semitones: [0, 3, 6, 9],
    degrees: ['1', '♭3', '♭5', '♭♭7'],
    roles: ['root', 'third', 'fifth', 'seventh'],
  },
];

export const TRIAD_TYPES = CHORD_TYPES.filter((t) => t.semitones.length === 3);
export const SEVENTH_TYPES = CHORD_TYPES.filter((t) => t.semitones.length === 4);

export function getChordType(id: string): ChordType {
  const type = CHORD_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`unknown chord type: ${id}`);
  return type;
}

const INVERSION_LABELS = ['原位', '第一转位', '第二转位', '第三转位'];

export function inversionLabel(inversion: number): string {
  return INVERSION_LABELS[inversion] ?? `${inversion + 1} 转位`;
}

/** 把最低的 n 个音各升高八度，得到转位后的排列 */
export function invertMidis(midis: number[], inversion: number): number[] {
  const sorted = [...midis].sort((a, b) => a - b);
  return sorted.map((m, i) => (i < inversion ? m + 12 : m)).sort((a, b) => a - b);
}

/** 判断一组音是第几转位：看最低音是根音之上的哪个和弦音 */
export function detectInversion(midis: number[], rootPc: number): number {
  const sorted = [...midis].sort((a, b) => a - b);
  const bassPc = ((sorted[0] % 12) + 12) % 12;
  const interval = (((bassPc - rootPc) % 12) + 12) % 12;
  if (interval === 0) return 0;
  if (interval <= 5) return 1; // 三音（3 或 4 个半音）
  if (interval <= 8) return 2; // 五音（6、7、8 个半音）
  return 3; // 七音（9、10、11 个半音）
}

export interface BuildChordOptions {
  inversion?: number;
  octave?: number;
  /** 指定根音拼写（如 "G♯"），用于顺阶和弦保留调内拼写；默认用 12 个标准根音 */
  rootName?: string;
}

export function buildChord(
  rootPc: number,
  typeId: string,
  { inversion = 0, octave = 4, rootName }: BuildChordOptions = {},
): NoteSet {
  const root = rootByPc(rootPc);
  const type = getChordType(typeId);
  const asciiRoot = rootName ? rootName.replace(/♯/g, '#').replace(/♭/g, 'b') : root.name;
  const rootLabel = prettyName(asciiRoot);
  const names = Chord.get(`${asciiRoot}${type.symbol}`).notes;
  if (names.length !== type.semitones.length) {
    throw new Error(`cannot build chord ${asciiRoot}${type.symbol}`);
  }

  const rootMidi = (octave + 1) * 12 + root.pc;
  const notes = buildNotes(names, rootMidi, {
    degrees: type.degrees,
    roles: type.roles,
  });

  const inversionCount = Math.min(inversion, notes.length - 1);
  const rotated: TheoryNote[] =
    inversionCount > 0
      ? notes.map((n, i) => (i < inversionCount ? { ...n, midi: n.midi + 12, octave: n.octave + 1 } : n))
      : notes;
  const voicing = rotated.sort((a, b) => a.midi - b.midi);

  return {
    id: `chord:${root.pc}:${type.id}:${inversionCount}:${octave}`,
    kind: 'chord',
    title:
      inversionCount > 0
        ? `${rootLabel}${type.symbol} ${inversionLabel(inversionCount)}`
        : `${rootLabel}${type.symbol} ${type.label}`,
    subtitle: voicing.map((n) => n.label).join(' '),
    rootName: rootLabel,
    rootMidi,
    notes: voicing,
    semitones: type.semitones,
    formula: type.semitones.join('–'),
    degreeText: type.degrees.join(' '),
    hint:
      inversionCount > 0
        ? `${inversionLabel(inversionCount)}，最低音 ${voicing[0].label}${voicing[0].octave}`
        : `${type.label}，根音 ${rootLabel}${octaveOf(rootMidi)}`,
  };
}

/** 一组音里是否含有某个音级（用于题目判分） */
export function chordContainsPc(midis: number[], pc: number): boolean {
  return midis.some((m) => ((m % 12) + 12) % 12 === pc);
}
