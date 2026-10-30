import { Note } from 'tonal';
import { chroma, octaveOf, prettyName } from './notes';
import type { NoteSet, TheoryNote } from './types';

export interface IntervalType {
  id: string;
  label: string;
  short: string;
  semitones: number;
  /** tonal 的音程记号 */
  tonal: string;
  degree: string;
}

export const INTERVAL_TYPES: IntervalType[] = [
  { id: 'P1', label: '纯一度', short: 'P1', semitones: 0, tonal: '1P', degree: '1' },
  { id: 'm2', label: '小二度', short: 'm2', semitones: 1, tonal: '2m', degree: '♭2' },
  { id: 'M2', label: '大二度', short: 'M2', semitones: 2, tonal: '2M', degree: '2' },
  { id: 'm3', label: '小三度', short: 'm3', semitones: 3, tonal: '3m', degree: '♭3' },
  { id: 'M3', label: '大三度', short: 'M3', semitones: 4, tonal: '3M', degree: '3' },
  { id: 'P4', label: '纯四度', short: 'P4', semitones: 5, tonal: '4P', degree: '4' },
  { id: 'TT', label: '增四/减五（三全音）', short: 'TT', semitones: 6, tonal: '4A', degree: '♯4' },
  { id: 'P5', label: '纯五度', short: 'P5', semitones: 7, tonal: '5P', degree: '5' },
  { id: 'm6', label: '小六度', short: 'm6', semitones: 8, tonal: '6m', degree: '♭6' },
  { id: 'M6', label: '大六度', short: 'M6', semitones: 9, tonal: '6M', degree: '6' },
  { id: 'm7', label: '小七度', short: 'm7', semitones: 10, tonal: '7m', degree: '♭7' },
  { id: 'M7', label: '大七度', short: 'M7', semitones: 11, tonal: '7M', degree: '7' },
  { id: 'P8', label: '纯八度', short: 'P8', semitones: 12, tonal: '8P', degree: '8' },
];

/** 做题时常用的 12 种（不含纯一度） */
export const QUIZ_INTERVALS = INTERVAL_TYPES.filter((t) => t.id !== 'P1');

export function getIntervalType(id: string): IntervalType {
  const type = INTERVAL_TYPES.find((t) => t.id === id);
  if (!type) throw new Error(`unknown interval: ${id}`);
  return type;
}

/** 按半音数取标准音程（三全音归为 TT） */
export function intervalBySemitones(semitones: number): IntervalType {
  const n = ((semitones % 12) + 12) % 12;
  const found = QUIZ_INTERVALS.find((t) => t.semitones === n);
  if (!found) throw new Error(`no interval with ${semitones} semitones`);
  return found;
}

export function invertInterval(id: string): IntervalType {
  const type = getIntervalType(id);
  return intervalBySemitones(12 - type.semitones);
}

function makeNote(
  name: string,
  midi: number,
  degree: string,
  isRoot: boolean,
): TheoryNote {
  return {
    midi,
    pc: chroma(midi),
    name,
    label: prettyName(name),
    octave: octaveOf(midi),
    degree,
    role: null,
    isRoot,
  };
}

export function buildInterval(
  rootMidi: number,
  intervalId: string,
  rootNameOverride?: string,
): NoteSet {
  const type = getIntervalType(intervalId);
  const rootName = rootNameOverride
    ? `${rootNameOverride.replace(/♯/g, '#').replace(/♭/g, 'b')}${octaveOf(rootMidi)}`
    : Note.fromMidiSharps(rootMidi);
  const rootLabel = prettyName(Note.pitchClass(rootName));
  const targetName = Note.transpose(rootName, type.tonal);
  const targetMidi = Note.midi(targetName);
  if (targetMidi === null) throw new Error(`cannot transpose ${rootName} by ${type.tonal}`);
  const targetLabel = prettyName(Note.pitchClass(targetName));

  const notes = [
    makeNote(Note.pitchClass(rootName), rootMidi, '1', true),
    makeNote(Note.pitchClass(targetName), targetMidi, type.degree, false),
  ];

  return {
    id: `interval:${rootMidi}:${type.id}`,
    kind: 'interval',
    title: `${rootLabel} ${type.label}`,
    subtitle: `${rootLabel}${octaveOf(rootMidi)} → ${targetLabel}${octaveOf(targetMidi)}`,
    rootName: rootLabel,
    rootMidi,
    notes,
    semitones: [0, type.semitones],
    formula: `${type.semitones} 半音`,
    degreeText: `1 ${type.degree}`,
    hint: `${type.short}，${type.semitones} 个半音`,
  };
}
