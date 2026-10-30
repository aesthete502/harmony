import { Scale } from 'tonal';
import { buildNotes, formulaText, prettyName, rootByPc } from './notes';
import type { NoteSet } from './types';

export interface ScaleType {
  id: string;
  label: string;
  /** tonal 的音阶名 */
  tonalName: string;
  semitones: number[];
  /** 相对大调的级数标记 */
  degrees: string[];
}

export const SCALE_TYPES: ScaleType[] = [
  {
    id: 'major',
    label: '大调',
    tonalName: 'major',
    semitones: [0, 2, 4, 5, 7, 9, 11],
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
  },
  {
    id: 'minor',
    label: '自然小调',
    tonalName: 'minor',
    semitones: [0, 2, 3, 5, 7, 8, 10],
    degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
  },
  {
    id: 'harmonic-minor',
    label: '和声小调',
    tonalName: 'harmonic minor',
    semitones: [0, 2, 3, 5, 7, 8, 11],
    degrees: ['1', '2', '♭3', '4', '5', '♭6', '7'],
  },
  {
    id: 'melodic-minor',
    label: '旋律小调',
    tonalName: 'melodic minor',
    semitones: [0, 2, 3, 5, 7, 9, 11],
    degrees: ['1', '2', '♭3', '4', '5', '6', '7'],
  },
  {
    id: 'major-pentatonic',
    label: '大调五声',
    tonalName: 'major pentatonic',
    semitones: [0, 2, 4, 7, 9],
    degrees: ['1', '2', '3', '5', '6'],
  },
  {
    id: 'minor-pentatonic',
    label: '小调五声',
    tonalName: 'minor pentatonic',
    semitones: [0, 3, 5, 7, 10],
    degrees: ['1', '♭3', '4', '5', '♭7'],
  },
  {
    id: 'blues',
    label: '布鲁斯',
    tonalName: 'blues',
    semitones: [0, 3, 5, 6, 7, 10],
    degrees: ['1', '♭3', '4', '♭5', '5', '♭7'],
  },
  {
    id: 'ionian',
    label: 'Ionian',
    tonalName: 'ionian',
    semitones: [0, 2, 4, 5, 7, 9, 11],
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
  },
  {
    id: 'dorian',
    label: 'Dorian',
    tonalName: 'dorian',
    semitones: [0, 2, 3, 5, 7, 9, 10],
    degrees: ['1', '2', '♭3', '4', '5', '6', '♭7'],
  },
  {
    id: 'phrygian',
    label: 'Phrygian',
    tonalName: 'phrygian',
    semitones: [0, 1, 3, 5, 7, 8, 10],
    degrees: ['1', '♭2', '♭3', '4', '5', '♭6', '♭7'],
  },
  {
    id: 'lydian',
    label: 'Lydian',
    tonalName: 'lydian',
    semitones: [0, 2, 4, 6, 7, 9, 11],
    degrees: ['1', '2', '3', '♯4', '5', '6', '7'],
  },
  {
    id: 'mixolydian',
    label: 'Mixolydian',
    tonalName: 'mixolydian',
    semitones: [0, 2, 4, 5, 7, 9, 10],
    degrees: ['1', '2', '3', '4', '5', '6', '♭7'],
  },
  {
    id: 'aeolian',
    label: 'Aeolian',
    tonalName: 'aeolian',
    semitones: [0, 2, 3, 5, 7, 8, 10],
    degrees: ['1', '2', '♭3', '4', '5', '♭6', '♭7'],
  },
  {
    id: 'locrian',
    label: 'Locrian',
    tonalName: 'locrian',
    semitones: [0, 1, 3, 5, 6, 8, 10],
    degrees: ['1', '♭2', '♭3', '4', '♭5', '♭6', '♭7'],
  },
];

export function getScaleType(id: string): ScaleType {
  const type = SCALE_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`unknown scale type: ${id}`);
  return type;
}

export function buildScale(
  rootPc: number,
  typeId: string,
  rootOctave = 3,
  rootNameOverride?: string,
): NoteSet {
  const root = rootByPc(rootPc);
  const type = getScaleType(typeId);
  const asciiRoot = rootNameOverride
    ? rootNameOverride.replace(/♯/g, '#').replace(/♭/g, 'b')
    : root.name;
  const rootLabel = prettyName(asciiRoot);
  const names = Scale.get(`${asciiRoot} ${type.tonalName}`).notes;
  if (names.length === 0) throw new Error(`cannot build scale ${asciiRoot} ${typeId}`);

  const rootMidi = (rootOctave + 1) * 12 + root.pc;
  const notes = buildNotes(names, rootMidi, { degrees: type.degrees });

  return {
    id: `scale:${root.pc}:${type.id}:${rootOctave}`,
    kind: 'scale',
    title: `${rootLabel} ${type.label}`,
    subtitle: notes.map((n) => n.label).join(' '),
    rootName: rootLabel,
    rootMidi,
    notes,
    semitones: type.semitones,
    formula: formulaText(type.semitones),
    degreeText: type.degrees.join(' '),
    hint: `半音结构 ${type.semitones.join('–')}`,
  };
}
