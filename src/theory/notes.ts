import { Note } from 'tonal';
import type { RootOption, TheoryNote } from './types';

/** 12 个根音，采用最常见的拼写（升号用于 C#/F#，降号用于 Eb/Ab/Bb） */
export const ROOTS: RootOption[] = [
  { pc: 0, name: 'C', label: 'C' },
  { pc: 1, name: 'C#', label: 'C♯' },
  { pc: 2, name: 'D', label: 'D' },
  { pc: 3, name: 'Eb', label: 'E♭' },
  { pc: 4, name: 'E', label: 'E' },
  { pc: 5, name: 'F', label: 'F' },
  { pc: 6, name: 'F#', label: 'F♯' },
  { pc: 7, name: 'G', label: 'G' },
  { pc: 8, name: 'Ab', label: 'A♭' },
  { pc: 9, name: 'A', label: 'A' },
  { pc: 10, name: 'Bb', label: 'B♭' },
  { pc: 11, name: 'B', label: 'B' },
];

export function rootByPc(pc: number): RootOption {
  return ROOTS[((pc % 12) + 12) % 12];
}

/** "F#" -> "F♯"，"Bbb" -> "B♭♭" */
export function prettyName(name: string): string {
  return name.replace(/#/g, '♯').replace(/b/g, '♭');
}

export function chroma(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1;
}

/** MIDI -> "C#4"，抠谱/转调时使用（统一升号，避免 double flat） */
export function midiToAscii(midi: number): string {
  return Note.fromMidiSharps(midi) ?? 'C4';
}

/** MIDI -> "C♯"（不带八度），与根音选择器使用同一套拼写 */
export function midiToPitchLabel(midi: number): string {
  return rootByPc(chroma(midi)).label;
}

/** MIDI -> "C♯4"，用于键盘与选项展示 */
export function midiToPretty(midi: number): string {
  return `${midiToPitchLabel(midi)}${octaveOf(midi)}`;
}

export function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(chroma(midi));
}

/** 取 > prev 的、音级为 pc 的最小 MIDI，保证音阶严格上行 */
export function nextMidiForChroma(prev: number, pc: number): number {
  for (let m = prev + 1; m <= prev + 12; m++) {
    if (chroma(m) === pc) return m;
  }
  throw new Error(`no midi above ${prev} for pc ${pc}`);
}

export interface BuildNotesOptions {
  /** 每个音的级数标签，长度需与 names 一致 */
  degrees: string[];
  /** 每个音的和弦角色，可选 */
  roles?: (TheoryNote['role'] | null)[];
}

/** 把 tonal 给的一串音名，组装成从 rootMidi 开始、严格上行的 TheoryNote 列表 */
export function buildNotes(
  names: string[],
  rootMidi: number,
  { degrees, roles }: BuildNotesOptions,
): TheoryNote[] {
  const notes: TheoryNote[] = [];
  let prev = rootMidi - 1;
  names.forEach((name, i) => {
    const pc = Note.chroma(name);
    if (pc === undefined) throw new Error(`bad note name: ${name}`);
    const midi = i === 0 ? rootMidi : nextMidiForChroma(prev, pc);
    prev = midi;
    notes.push({
      midi,
      pc,
      name,
      label: prettyName(name),
      octave: octaveOf(midi),
      degree: degrees[i] ?? String(i + 1),
      role: roles?.[i] ?? null,
      isRoot: i === 0,
    });
  });
  return notes;
}

/** 是否含重升/重降（如 "B♭♭"、"G♯♯"） */
export function hasDoubleAccidental(label: string): boolean {
  return /♯♯|♭♭/.test(label);
}

export interface NoteSpelling {
  /** 12 个常用音名之一，界面上优先显示 */
  simple: string;
  /** 原来的理论拼写；没有重升/重降时为 null */
  theory: string | null;
}

/** 只认音名，避免把 "♭♭7" 这类级数标签当成音名 */
const NOTE_NAME = /^[A-G](?:♯♯|♭♭|♯|♭)?$/;

/**
 * 重升/重降 -> 等音简化写法（B♭♭ -> A）。
 * 谱面仍然按理论拼写画，这里只负责文字标签。
 */
export function spellingOf(label: string): NoteSpelling {
  if (!NOTE_NAME.test(label) || !hasDoubleAccidental(label)) {
    return { simple: label, theory: null };
  }
  const pc = Note.chroma(label.replace(/♯/g, '#').replace(/♭/g, 'b'));
  if (pc === undefined) return { simple: label, theory: null };
  return { simple: rootByPc(pc).label, theory: label };
}

/** 纯文本场景：重升/重降写成 "A（B♭♭）" */
export function withTheoryHints(text: string): string {
  return text.replace(/[A-G](?:♯♯|♭♭)/g, (m) => `${spellingOf(m).simple}（${m}）`);
}

/** 0-11 的半音差 -> 中文音程描述，用于展示公式 */
export function semitoneWord(n: number): string {
  const table: Record<number, string> = {
    1: '半',
    2: '全',
    3: '增二度',
    4: '大三度',
    5: '纯四度',
  };
  return table[n] ?? `${n}半音`;
}

/** 根据半音结构生成 "全 全 半 全 全 全 半" 这样的文字 */
export function formulaText(semitones: number[]): string {
  const parts: string[] = [];
  for (let i = 1; i < semitones.length; i++) {
    parts.push(semitoneWord(semitones[i] - semitones[i - 1]));
  }
  // 音阶回到高八度的最后一步
  if (semitones.length > 1) {
    parts.push(semitoneWord(12 - semitones[semitones.length - 1]));
  }
  return parts.join(' ');
}

/** 去掉音名里的升降号，得到字母 */
export function letterOf(name: string): string {
  return name[0].toUpperCase();
}

/** 音名中的变音记号，如 "F#" -> "#"，"Bbb" -> "bb" */
export function accidentalOf(name: string): string {
  return name.slice(1);
}

/** 读音名 -> MIDI；用于解析用户输入 */
export function parseNoteName(input: string, defaultOctave = 4): number | null {
  const normalized = input.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const withOctave = /\d$/.test(normalized) ? normalized : `${normalized}${defaultOctave}`;
  return Note.midi(withOctave);
}
