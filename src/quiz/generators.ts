import {
  buildChord,
  buildInterval,
  buildScale,
  chroma,
  hasDoubleAccidental,
  INTERVAL_TYPES,
  inversionLabel,
  isBlackKey,
  midiToPitchLabel,
  midiToPretty,
  octaveOf,
  ROOTS,
  rootByPc,
  TRIAD_TYPES,
} from '../theory';
import type { ChordType, IntervalType } from '../theory';
import type { Question, TaskKind } from './types';

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: readonly T[]): T => arr[rnd(arr.length)];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 正确答案 + 干扰项，保证不重复 */
function choicesFor(correct: string, pool: readonly string[], n = 4): string[] {
  const others = shuffle([...new Set(pool)]).filter((p) => p !== correct).slice(0, n - 1);
  return shuffle([correct, ...others]);
}

let seq = 0;
const uid = () => `q${++seq}`;

/** 从一组音推出键盘范围，向两侧扩展到完整八度，避免黑键落在边缘 */
function keyboardRange(midis: number[]): [number, number] {
  const min = Math.min(...midis);
  const max = Math.max(...midis);
  return [Math.floor(min / 12) * 12, Math.ceil(max / 12) * 12];
}

/* ---------------- L1 音名 / 键盘位置 ---------------- */

function nameToKey(): Question {
  const midi = 48 + rnd(24); // C3..B4，两个八度内找
  const label = midiToPretty(midi);
  return {
    id: uid(),
    level: 1,
    kind: 'name-to-key',
    prompt: `在键盘上找到 ${label}`,
    hint: '先在八度里定位 C，再往上数半音',
    answerMode: 'keys',
    keyRange: [48, 72],
    expectedKeys: [midi],
    explanation: `${label} 位于 C${octaveOf(midi)} 之上 ${chroma(midi)} 个半音${
      isBlackKey(midi) ? '，是一个黑键' : '，是一个白键'
    }。`,
    playMidis: [midi],
  };
}

function keyToName(): Question {
  const octaveStart = 48 + 12 * rnd(2); // C3 或 C4 起的单个八度
  const midi = octaveStart + rnd(12);
  const correct = midiToPretty(midi);
  const nearby = [midi - 2, midi - 1, midi + 1, midi + 2]
    .filter((m) => m >= octaveStart && m < octaveStart + 12)
    .map(midiToPretty);
  return {
    id: uid(),
    level: 1,
    kind: 'key-to-name',
    prompt: '高亮的这个键叫什么？',
    hint: '黑键用「前一个白键 + ♯」或「后一个白键 + ♭」来读',
    answerMode: 'choice',
    keyRange: [octaveStart, octaveStart + 12],
    highlight: [midi],
    choices: choicesFor(correct, nearby),
    correctChoice: correct,
    explanation: `这个键是 ${correct}，距 C${octaveOf(midi)} ${chroma(midi)} 个半音。`,
    playMidis: [midi],
  };
}

/* ---------------- L2 大调音阶与音级 ---------------- */

function buildScaleQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const set = buildScale(rootPc, 'major', 3);
  return {
    id: uid(),
    level: 2,
    kind: 'build-scale',
    prompt: `在键盘上点出 ${set.title}的全部 7 个音`,
    hint: '不用按顺序，点对你认为属于这个音阶的所有音',
    answerMode: 'keys',
    keyRange: keyboardRange(set.notes.map((n) => n.midi)),
    expectedKeys: set.notes.map((n) => n.midi),
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: `${set.title} = ${set.subtitle}，结构是 ${set.formula}。`,
    playMidis: set.notes.map((n) => n.midi),
  };
}

function scaleDegreeQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const set = buildScale(rootPc, 'major', 3);
  const idx = rnd(set.notes.length);
  const target = set.notes[idx];
  return {
    id: uid(),
    level: 2,
    kind: 'scale-degree',
    prompt: `${set.title}的第 ${idx + 1} 级是哪个音？`,
    hint: '主音算第 1 级',
    answerMode: 'keys',
    keyRange: keyboardRange(set.notes.map((n) => n.midi)),
    highlight: [set.rootMidi],
    expectedKeys: [target.midi],
    revealLabels: { [target.midi]: target.label },
    explanation: `${set.title}：${set.subtitle}，第 ${idx + 1} 级是 ${target.label}。`,
    playMidis: [target.midi],
  };
}

function scaleMembershipQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const set = buildScale(rootPc, 'major', 3);
  const candidateMidi = 48 + rnd(36);
  const member = set.notes.some((n) => n.pc === chroma(candidateMidi));
  const label = midiToPitchLabel(candidateMidi);
  return {
    id: uid(),
    level: 2,
    kind: 'scale-membership',
    prompt: `${label} 是 ${set.title}里的音吗？`,
    answerMode: 'choice',
    keyRange: keyboardRange([set.rootMidi, set.rootMidi + 12]),
    highlight: [set.rootMidi],
    choices: ['是', '否'],
    correctChoice: member ? '是' : '否',
    explanation: `${set.title} = ${set.subtitle}，所以 ${label} ${
      member ? '属于' : '不属于'
    }这个音阶。`,
    playMidis: set.notes.map((n) => n.midi),
  };
}

/* ---------------- L3 音程 ---------------- */

const INTERVAL_IDS = ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'];

function buildIntervalQuestion(): Question {
  const rootMidi = 55 + rnd(18);
  const type = pick(INTERVAL_IDS.map((id) => INTERVAL_TYPES.find((t) => t.id === id)!));
  // 用与题面一致的拼写（E♭ 而不是 D♯），避免解释里冒出重升号
  const set = buildInterval(rootMidi, type.id, midiToPitchLabel(rootMidi));
  const target = set.notes[1];
  return {
    id: uid(),
    level: 3,
    kind: 'build-interval',
    prompt: `从 ${midiToPretty(rootMidi)} 往上构${type.label}`,
    hint: '先在键盘上点根音，再点目标音',
    answerMode: 'keys',
    keyRange: keyboardRange([rootMidi, target.midi]),
    highlight: [rootMidi],
    expectedKeys: [target.midi],
    revealLabels: { [target.midi]: target.label },
    explanation: `${midiToPretty(rootMidi)} 往上 ${type.semitones} 个半音是 ${
      set.notes[1].label
    }${set.notes[1].octave}，即${type.label}。`,
    playMidis: [rootMidi, target.midi],
  };
}

function identifyIntervalQuestion(): Question {
  const rootMidi = 55 + rnd(18);
  const type = pick(INTERVAL_IDS.map((id) => INTERVAL_TYPES.find((t) => t.id === id)!));
  const set = buildInterval(rootMidi, type.id, midiToPitchLabel(rootMidi));
  const target = set.notes[1];
  return {
    id: uid(),
    level: 3,
    kind: 'identify-interval',
    prompt: '键盘上高亮的两个音构成什么音程？',
    answerMode: 'choice',
    keyRange: keyboardRange([rootMidi, target.midi]),
    highlight: [rootMidi, target.midi],
    choices: choicesFor(type.label, INTERVAL_TYPES.filter((t) => t.id !== 'P1').map((t) => t.label)),
    correctChoice: type.label,
    explanation: `${midiToPretty(rootMidi)} → ${midiToPretty(target.midi)}，相距 ${
      type.semitones
    } 个半音，是${type.label}。`,
    playMidis: [rootMidi, target.midi],
  };
}

function invertIntervalQuestion(): Question {
  const type = pick(INTERVAL_IDS.map((id) => INTERVAL_TYPES.find((t) => t.id === id)!));
  const inverted: IntervalType = INTERVAL_TYPES.find((t) => t.semitones === 12 - type.semitones)!;
  return {
    id: uid(),
    level: 3,
    kind: 'invert-interval',
    prompt: `${type.label}的转位是什么？`,
    hint: '度数相加等于 9，大小互换、纯音程仍是纯音程',
    answerMode: 'choice',
    keyRange: [60, 72],
    choices: choicesFor(
      inverted.label,
      INTERVAL_TYPES.filter((t) => t.id !== 'P1' && t.id !== type.id).map((t) => t.label),
    ),
    correctChoice: inverted.label,
    explanation: `${type.label}（${type.semitones} 半音）的转位是 ${
      inverted.label
    }（${inverted.semitones} 半音）。`,
    playMidis: [60, 60 + type.semitones],
  };
}

/* ---------------- L4 三和弦 ---------------- */

/** 会写出重升/重降的「根音 × 和弦类型」组合，低阶题先避开，留到以后讲变音记号时再见 */
const chordRootCache = new Map<string, number[]>();

function chordRootsFor(type: ChordType): number[] {
  const cached = chordRootCache.get(type.id);
  if (cached) return cached;
  const safe = ROOTS.filter((root) =>
    buildChord(root.pc, type.id, { octave: 4 }).notes.every((n) => !hasDoubleAccidental(n.label)),
  ).map((r) => r.pc);
  const list = safe.length > 0 ? safe : ROOTS.map((r) => r.pc);
  chordRootCache.set(type.id, list);
  return list;
}

function triadExplanation(type: ChordType, set: ReturnType<typeof buildChord>): string {
  return `${set.title} = ${set.subtitle}，半音结构 ${type.semitones.join('–')}（${type.label}）。`;
}

function buildChordQuestion(): Question {
  const type = pick(TRIAD_TYPES);
  const rootPc = pick(chordRootsFor(type));
  const set = buildChord(rootPc, type.id, { octave: 4 });
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 4,
    kind: 'build-chord',
    prompt: `在键盘上点出 ${rootByPc(rootPc).label}${type.symbol}（${type.label}）的三个音`,
    hint: '从根音开始按三度叠置去找',
    answerMode: 'keys',
    keyRange: keyboardRange([set.rootMidi, Math.max(...midis)]),
    highlight: [set.rootMidi],
    expectedKeys: midis,
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: triadExplanation(type, set),
    playMidis: midis,
  };
}

function identifyChordQuestion(): Question {
  const type = pick(TRIAD_TYPES);
  const rootPc = pick(chordRootsFor(type));
  const set = buildChord(rootPc, type.id, { octave: 4 });
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 4,
    kind: 'identify-chord',
    prompt: '键盘上高亮的三个音是什么和弦？',
    answerMode: 'choice',
    keyRange: keyboardRange(midis),
    highlight: midis,
    choices: choicesFor(type.label, TRIAD_TYPES.map((t) => t.label)),
    correctChoice: type.label,
    explanation: triadExplanation(type, set),
    playMidis: midis,
  };
}

function identifyRootQuestion(): Question {
  const type = pick(TRIAD_TYPES);
  const rootPc = pick(chordRootsFor(type));
  const inversion = 1 + rnd(2);
  const set = buildChord(rootPc, type.id, { octave: 4, inversion });
  const root = rootByPc(rootPc);
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 4,
    kind: 'identify-root',
    prompt: '这个和弦的根音是哪个音？',
    hint: '根音不一定在最低音',
    answerMode: 'choice',
    keyRange: keyboardRange(midis),
    highlight: midis,
    choices: choicesFor(root.label, ROOTS.map((r) => r.label)),
    correctChoice: root.label,
    explanation: `${root.label}${type.symbol} 的根音是 ${root.label}，这里是${inversionLabel(
      inversion,
    )}，最低音是 ${set.notes[0].label}。`,
    playMidis: midis,
  };
}

function identifyInversionQuestion(): Question {
  const type = pick(TRIAD_TYPES);
  const rootPc = pick(chordRootsFor(type));
  const inversion = 1 + rnd(2);
  const set = buildChord(rootPc, type.id, { octave: 4, inversion });
  const lowestRole = inversion === 1 ? '三音' : '五音';
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 4,
    kind: 'identify-inversion',
    prompt: '这个和弦是第几转位？',
    answerMode: 'choice',
    keyRange: keyboardRange(midis),
    highlight: midis,
    choices: ['原位', '第一转位', '第二转位'],
    correctChoice: inversionLabel(inversion),
    explanation: `${rootByPc(rootPc).label}${type.symbol} 的${inversionLabel(inversion)}：${
      set.subtitle
    }。最低音 ${set.notes[0].label} 是${lowestRole}，根音 ${rootByPc(rootPc).label} 跑到了上面。`,
    playMidis: midis,
  };
}

/* ---------------- 组装 ---------------- */

const GENERATORS: Record<number, { kind: TaskKind; make: () => Question }[]> = {
  1: [
    { kind: 'name-to-key', make: nameToKey },
    { kind: 'key-to-name', make: keyToName },
  ],
  2: [
    { kind: 'build-scale', make: buildScaleQuestion },
    { kind: 'scale-degree', make: scaleDegreeQuestion },
    { kind: 'scale-membership', make: scaleMembershipQuestion },
  ],
  3: [
    { kind: 'build-interval', make: buildIntervalQuestion },
    { kind: 'identify-interval', make: identifyIntervalQuestion },
    { kind: 'invert-interval', make: invertIntervalQuestion },
  ],
  4: [
    { kind: 'build-chord', make: buildChordQuestion },
    { kind: 'identify-chord', make: identifyChordQuestion },
    { kind: 'identify-root', make: identifyRootQuestion },
    { kind: 'identify-inversion', make: identifyInversionQuestion },
  ],
};

export const READY_LEVELS = Object.keys(GENERATORS).map(Number);

export function generateQuestion(level: number, excludeKind?: TaskKind): Question {
  const gens = GENERATORS[level];
  if (!gens) throw new Error(`level ${level} is not available yet`);
  const pool = excludeKind && gens.length > 1 ? gens.filter((g) => g.kind !== excludeKind) : gens;
  return pick(pool).make();
}

export function createSession(
  level: number,
  size = 10,
  firstExcludeKind?: TaskKind,
): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < size; i++) {
    const lastKind = out.length > 0 ? out[out.length - 1].kind : firstExcludeKind;
    out.push(generateQuestion(level, lastKind));
  }
  return out;
}

/** 只在测试和调试里用，方便构造固定题目 */
export const __internals = {
  nameToKey,
  keyToName,
  buildScaleQuestion,
  scaleDegreeQuestion,
  scaleMembershipQuestion,
  buildIntervalQuestion,
  identifyIntervalQuestion,
  invertIntervalQuestion,
  buildChordQuestion,
  identifyChordQuestion,
  identifyRootQuestion,
  identifyInversionQuestion,
};
