/**
 * 乐理层的公共类型。
 *
 * 设计要点：所有「音阶 / 和弦 / 音程」最终都归一成 NoteSet，
 * 键盘、五线谱、指板三个视图只消费 NoteSet，不关心它是怎么算出来的。
 */

export type NoteRole = 'root' | 'third' | 'fifth' | 'seventh';

export interface TheoryNote {
  /** MIDI 音高，60 = C4 */
  midi: number;
  /** 音级（0-11），C = 0 */
  pc: number;
  /** tonal 返回的 ASCII 音名，如 "F#"、"Bbb" */
  name: string;
  /** 展示用音名，如 "F♯"、"B♭♭" */
  label: string;
  octave: number;
  /** 调内级数标记，如 "1" "♭3"，或和弦音级 1/3/5/7 */
  degree: string;
  role: NoteRole | null;
  isRoot: boolean;
}

export type NoteSetKind = 'scale' | 'chord' | 'interval';

export interface NoteSet {
  /** 稳定 id，用于 React key 和缓存 */
  id: string;
  kind: NoteSetKind;
  /** 展示标题，如 "C 大调" */
  title: string;
  /** 简短副标题，如 "C D E F G A B" */
  subtitle: string;
  rootName: string;
  rootMidi: number;
  notes: TheoryNote[];
  /** 相对根音的半音数，如 [0, 4, 7] */
  semitones: number[];
  /** 半音结构文字，如 "全 全 半 全 全 全 半" */
  formula: string;
  /** 级数文字，如 "1 2 3 4 5 6 7" */
  degreeText: string;
  /** 额外说明，如 "小三和弦：0–3–7" */
  hint: string;
}

export interface RootOption {
  pc: number;
  /** tonal 用的音名 */
  name: string;
  /** 展示用 */
  label: string;
}
