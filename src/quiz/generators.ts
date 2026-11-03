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
  SEVENTH_TYPES,
  TRIAD_TYPES,
} from '../theory';
import type { ChordType, IntervalType } from '../theory';
import { isLevelPassed, LEVELS } from '../content/levels';
import type { Store } from '../storage';
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

/* ---------------- 听辨公共 ---------------- */

/** 听辨题不需要键盘，给一个合法的小范围，保证类型和测试都成立 */
const EAR_RANGE: [number, number] = [60, 72];

/** 干扰项按半音距离取邻近音程，避免一眼看出答案 */
function earIntervalChoices(correct: IntervalType, n = 4): string[] {
  const others = INTERVAL_TYPES.filter((t) => t.id !== 'P1' && t.id !== correct.id)
    .sort(
      (a, b) =>
        Math.abs(a.semitones - correct.semitones) - Math.abs(b.semitones - correct.semitones),
    )
    .slice(0, n - 1)
    .map((t) => t.label);
  return shuffle([correct.label, ...others]);
}

const EAR_INTERVALS_BASIC = ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'];
const EAR_INTERVALS_ALL = [
  'm2',
  'M2',
  'm3',
  'M3',
  'P4',
  'TT',
  'P5',
  'm6',
  'M6',
  'm7',
  'M7',
  'P8',
];

/** 会写出重升/重降的音阶根音先避开，和和弦题保持一致 */
const scaleRootCache = new Map<string, number[]>();

function scaleRootsFor(scaleId: string): number[] {
  const cached = scaleRootCache.get(scaleId);
  if (cached) return cached;
  const safe = ROOTS.filter((root) =>
    buildScale(root.pc, scaleId, 3).notes.every((n) => !hasDoubleAccidental(n.label)),
  ).map((r) => r.pc);
  const list = safe.length > 0 ? safe : ROOTS.map((r) => r.pc);
  scaleRootCache.set(scaleId, list);
  return list;
}

function earIntervalQuestion(level: number, ids: readonly string[]): Question {
  const rootMidi = 55 + rnd(18);
  const type = pick(ids.map((id) => INTERVAL_TYPES.find((t) => t.id === id)!));
  const set = buildInterval(rootMidi, type.id, midiToPitchLabel(rootMidi));
  const target = set.notes[1];
  return {
    id: uid(),
    level,
    kind: 'ear-interval',
    prompt: '听两个音，它们构成什么音程？',
    hint: '先听参照的主音，再判断两个音的距离',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: earIntervalChoices(type),
    correctChoice: type.label,
    explanation: `${midiToPretty(rootMidi)} → ${midiToPretty(target.midi)}，相距 ${
      type.semitones
    } 个半音，是${type.label}。`,
    playMidis: [rootMidi, target.midi],
    ear: {
      reference: rootMidi,
      midis: [rootMidi, target.midi],
      style: 'setting',
      note: '先播主音，再播这两个音',
    },
  };
}

function earChordQuestion(): Question {
  const type = pick(TRIAD_TYPES);
  const rootPc = pick(chordRootsFor(type));
  const set = buildChord(rootPc, type.id, { octave: 4 });
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 4,
    kind: 'ear-chord',
    prompt: '听这三个音，它是什么三和弦？',
    hint: '先听三音决定明暗，再听五音判断稳定',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: choicesFor(type.label, TRIAD_TYPES.map((t) => t.label)),
    correctChoice: type.label,
    explanation: triadExplanation(type, set),
    playMidis: midis,
    ear: { reference: set.rootMidi, midis, style: 'setting', note: '先播根音，再播三个音' },
  };
}

/* ---------------- L5 全部音程与自然小调 ---------------- */

function buildMinorScaleQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const set = buildScale(rootPc, 'minor', 3);
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 5,
    kind: 'build-minor-scale',
    prompt: `在键盘上点出 ${set.title}的全部 7 个音`,
    hint: '自然小调的结构是 全 半 全 全 半 全 全',
    answerMode: 'keys',
    keyRange: keyboardRange(midis),
    expectedKeys: midis,
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: `${set.title} = ${set.subtitle}，结构是 ${set.formula}，和它的关系大调共用同一批音。`,
    playMidis: midis,
  };
}

function relativeKeyQuestion(): Question {
  const minorFirst = Math.random() < 0.5;
  const majorPc = minorFirst ? (pick(ROOTS).pc + 3) % 12 : pick(ROOTS).pc;
  const minorPc = (majorPc + 9) % 12;
  const major = rootByPc(majorPc).label;
  const minor = rootByPc(minorPc).label;
  const correct = minorFirst ? `${major} 大调` : `${minor} 小调`;
  const pool = ROOTS.map((r) => (minorFirst ? `${r.label} 大调` : `${r.label} 小调`));
  return {
    id: uid(),
    level: 5,
    kind: 'relative-key',
    prompt: minorFirst ? `${minor} 小调的关系大调是？` : `${major} 大调的关系小调是？`,
    hint: '关系大小调共用调号，主音相差小三度',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: choicesFor(correct, pool),
    correctChoice: correct,
    explanation: `${major} 大调与 ${minor} 小调共用同一批音，主音相差小三度，是一对关系大小调。`,
  };
}

function earTonalityQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const isMajor = Math.random() < 0.5;
  const set = buildScale(rootPc, isMajor ? 'major' : 'minor', 4);
  const midis = [...set.notes.map((n) => n.midi), set.rootMidi + 12];
  return {
    id: uid(),
    level: 5,
    kind: 'ear-tonality',
    prompt: '听这段音阶，它是大调还是自然小调？',
    hint: '听第三级：大三度明亮，小三度暗淡',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: ['大调', '自然小调'],
    correctChoice: isMajor ? '大调' : '自然小调',
    explanation: `${set.title} = ${set.subtitle}，结构是 ${set.formula}。`,
    playMidis: midis,
    ear: { reference: set.rootMidi, midis, style: 'melodic', note: '先播主音，再听上行音阶' },
  };
}

/* ---------------- L6 七和弦 ---------------- */

function seventhRootsFor(type: ChordType): number[] {
  return chordRootsFor(type);
}

function buildSeventhQuestion(): Question {
  const type = pick(SEVENTH_TYPES);
  const rootPc = pick(seventhRootsFor(type));
  const set = buildChord(rootPc, type.id, { octave: 4 });
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 6,
    kind: 'build-seventh',
    prompt: `在键盘上点出 ${rootByPc(rootPc).label}${type.symbol}（${type.label}）的四个音`,
    hint: '先搭好三和弦，再往上加七音',
    answerMode: 'keys',
    keyRange: keyboardRange(midis),
    highlight: [set.rootMidi],
    expectedKeys: midis,
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: `${set.title} = ${set.subtitle}，半音结构 ${type.semitones.join('–')}（${type.label}）。`,
    playMidis: midis,
  };
}

function seventhInversionQuestion(): Question {
  const type = pick(SEVENTH_TYPES);
  const rootPc = pick(seventhRootsFor(type));
  const inversion = 1 + rnd(3);
  const set = buildChord(rootPc, type.id, { octave: 4, inversion });
  const midis = set.notes.map((n) => n.midi);
  const roles = ['根音', '三音', '五音', '七音'];
  return {
    id: uid(),
    level: 6,
    kind: 'seventh-inversion',
    prompt: '这个七和弦是第几转位？',
    hint: '看最低音是和弦的哪个音',
    answerMode: 'choice',
    keyRange: keyboardRange(midis),
    highlight: midis,
    choices: ['原位', '第一转位', '第二转位', '第三转位'],
    correctChoice: inversionLabel(inversion),
    explanation: `${rootByPc(rootPc).label}${type.symbol} 的${inversionLabel(inversion)}：${
      set.subtitle
    }。最低音 ${set.notes[0].label}${set.notes[0].octave} 是${roles[inversion]}。`,
    playMidis: midis,
  };
}

function earSeventhQuestion(): Question {
  const type = pick(SEVENTH_TYPES);
  const rootPc = pick(seventhRootsFor(type));
  const set = buildChord(rootPc, type.id, { octave: 4 });
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 6,
    kind: 'ear-seventh',
    prompt: '听这个和弦，判断它的性质',
    hint: '大七最亮、属七最想解决、小七柔和、半减七和减七更紧张',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: choicesFor(type.label, SEVENTH_TYPES.map((t) => t.label), 5),
    correctChoice: type.label,
    explanation: `${set.title} = ${set.subtitle}，半音结构 ${type.semitones.join('–')}。`,
    playMidis: midis,
    ear: {
      reference: set.rootMidi,
      midis,
      style: 'setting',
      note: '先播根音，再播四个音',
    },
  };
}

/* ---------------- L7 音阶家族 ---------------- */

const FAMILY_SCALES = [
  'harmonic-minor',
  'melodic-minor',
  'major-pentatonic',
  'minor-pentatonic',
  'blues',
] as const;

function buildScaleFamilyQuestion(): Question {
  const scaleId = pick(FAMILY_SCALES);
  const rootPc = pick(scaleRootsFor(scaleId));
  const set = buildScale(rootPc, scaleId, 3);
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 7,
    kind: 'build-scale-family',
    prompt: `在键盘上点出 ${set.title}的全部 ${midis.length} 个音`,
    hint: '先想它和自然小调/大调差在哪一级',
    answerMode: 'keys',
    keyRange: keyboardRange(midis),
    expectedKeys: midis,
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: `${set.title} = ${set.subtitle}，半音结构 ${set.semitones.join('–')}。`,
    playMidis: midis,
  };
}

const FAMILY_COMPARE = [
  { scaleId: 'harmonic-minor', baseId: 'minor', kind: 'change' as const },
  { scaleId: 'major-pentatonic', baseId: 'major', kind: 'remove' as const },
  { scaleId: 'minor-pentatonic', baseId: 'minor', kind: 'remove' as const },
];

function labelCombos(labels: string[], size: number): string[] {
  if (size === 1) return [...labels];
  const out: string[] = [];
  for (let i = 0; i < labels.length; i++) {
    for (let j = i + 1; j < labels.length; j++) out.push(`${labels[i]}、${labels[j]}`);
  }
  return out;
}

function scaleFeatureQuestion(): Question {
  const cmp = pick(FAMILY_COMPARE);
  const rootPc = pick(scaleRootsFor(cmp.scaleId));
  const set = buildScale(rootPc, cmp.scaleId, 3);
  const base = buildScale(rootPc, cmp.baseId, 3);
  const changed =
    cmp.kind === 'change'
      ? set.notes.filter((n) => !base.notes.some((b) => b.pc === n.pc))
      : base.notes.filter((n) => !set.notes.some((s) => s.pc === n.pc));

  const answer = changed.map((n) => n.label).join('、');
  const pool = labelCombos(
    base.notes.map((n) => n.label),
    changed.length,
  ).filter((c) => c !== answer);

  return {
    id: uid(),
    level: 7,
    kind: 'scale-feature',
    prompt:
      cmp.kind === 'change'
        ? `${set.title} 比 ${base.title} 改变了哪个音？`
        : `${set.title} 比 ${base.title} 少了哪 ${changed.length} 个音？`,
    hint: '把两个音阶并排看，只有那一个（或两个）音不同',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: shuffle([answer, ...shuffle(pool).slice(0, 3)]),
    correctChoice: answer,
    explanation: `${set.title} = ${set.subtitle}；${base.title} = ${base.subtitle}。不同的音是 ${answer}。`,
  };
}

const EAR_FAMILY = [
  { id: 'major', label: '大调' },
  { id: 'minor', label: '自然小调' },
  { id: 'harmonic-minor', label: '和声小调' },
  { id: 'major-pentatonic', label: '大调五声' },
  { id: 'minor-pentatonic', label: '小调五声' },
];

function earScaleFamilyQuestion(): Question {
  const rootPc = pick(ROOTS).pc;
  const target = pick(EAR_FAMILY);
  const set = buildScale(rootPc, target.id, 4);
  const midis = [...set.notes.map((n) => n.midi), set.rootMidi + 12];
  return {
    id: uid(),
    level: 7,
    kind: 'ear-scale-family',
    prompt: '听这段音阶，它属于哪一类？',
    hint: '先听有没有半音，再听第七级和第六级',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: shuffle(EAR_FAMILY.map((f) => f.label)),
    correctChoice: target.label,
    explanation: `${set.title} = ${set.subtitle}，半音结构 ${set.semitones.join('–')}。`,
    playMidis: midis,
    ear: { reference: set.rootMidi, midis, style: 'melodic', note: '先播主音，再听上行音阶' },
  };
}

/* ---------------- L8 调式 ---------------- */

const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

function buildModeQuestion(): Question {
  const modeId = pick(MODES);
  const rootPc = pick(scaleRootsFor(modeId));
  const set = buildScale(rootPc, modeId, 3);
  const midis = set.notes.map((n) => n.midi);
  return {
    id: uid(),
    level: 8,
    kind: 'build-mode',
    prompt: `在键盘上点出 ${set.title}的全部 7 个音`,
    hint: '把它当成同调号的大调，换一个中心音',
    answerMode: 'keys',
    keyRange: keyboardRange(midis),
    expectedKeys: midis,
    revealLabels: Object.fromEntries(set.notes.map((n) => [n.midi, n.label])),
    explanation: `${set.title} = ${set.subtitle}，相对大调的级数是 ${set.degreeText}。`,
    playMidis: midis,
  };
}

const MODE_FEATURE: Record<string, { degree: string; label: string }> = {
  dorian: { degree: '6', label: '大六度' },
  phrygian: { degree: '♭2', label: '小二度' },
  lydian: { degree: '♯4', label: '增四度' },
  mixolydian: { degree: '♭7', label: '小七度' },
  locrian: { degree: '♭5', label: '减五度' },
};

function modeFeatureQuestion(): Question {
  const modeId = pick(Object.keys(MODE_FEATURE));
  const rootPc = pick(scaleRootsFor(modeId));
  const set = buildScale(rootPc, modeId, 3);
  const spec = MODE_FEATURE[modeId];
  const note = set.notes.find((n) => n.degree === spec.degree)!;
  return {
    id: uid(),
    level: 8,
    kind: 'mode-feature',
    prompt: `${set.title} 的特征音是哪个？`,
    hint: '特征音就是它相对大调最特别的那个变化音',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: choicesFor(
      note.label,
      set.notes.map((n) => n.label),
    ),
    correctChoice: note.label,
    explanation: `${set.title} 的特征是${spec.label}（${spec.degree} 级），也就是 ${note.label}。`,
  };
}

function earModeQuestion(): Question {
  // 先练最好认的四个，再混进 Lydian / Phrygian / Locrian
  const core = ['ionian', 'dorian', 'mixolydian', 'aeolian'];
  const pool = Math.random() < 0.72 ? core : MODES;
  const modeId = pick(pool);
  const set = buildScale(0, modeId, 4);
  const midis = [...set.notes.map((n) => n.midi), set.rootMidi + 12];
  const label = (id: string) => (id === 'ionian' ? 'Ionian（大调）' : id === 'aeolian' ? 'Aeolian（自然小调）' : id[0].toUpperCase() + id.slice(1));
  return {
    id: uid(),
    level: 8,
    kind: 'ear-mode',
    prompt: '听这段音阶，它是什么调式？（主音是 C）',
    hint: '重点听 3、6、7 级，以及有没有小二度/增四度',
    answerMode: 'choice',
    keyRange: EAR_RANGE,
    choices: shuffle(pool.map(label)),
    correctChoice: label(modeId),
    explanation: `这是 C ${set.title.replace(/^C\s*/, '')} = ${set.subtitle}，相对大调的级数是 ${set.degreeText}。`,
    playMidis: midis,
    ear: {
      reference: set.rootMidi,
      midis,
      style: 'melodic',
      note: '先播主音 C，再听上行音阶',
    },
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
    { kind: 'ear-interval', make: () => earIntervalQuestion(3, EAR_INTERVALS_BASIC) },
  ],
  4: [
    { kind: 'build-chord', make: buildChordQuestion },
    { kind: 'identify-chord', make: identifyChordQuestion },
    { kind: 'identify-root', make: identifyRootQuestion },
    { kind: 'identify-inversion', make: identifyInversionQuestion },
    { kind: 'ear-chord', make: earChordQuestion },
  ],
  5: [
    { kind: 'build-minor-scale', make: buildMinorScaleQuestion },
    { kind: 'relative-key', make: relativeKeyQuestion },
    { kind: 'ear-interval', make: () => earIntervalQuestion(5, EAR_INTERVALS_ALL) },
    { kind: 'ear-tonality', make: earTonalityQuestion },
  ],
  6: [
    { kind: 'build-seventh', make: buildSeventhQuestion },
    { kind: 'seventh-inversion', make: seventhInversionQuestion },
    { kind: 'ear-seventh', make: earSeventhQuestion },
  ],
  7: [
    { kind: 'build-scale-family', make: buildScaleFamilyQuestion },
    { kind: 'scale-feature', make: scaleFeatureQuestion },
    { kind: 'ear-scale-family', make: earScaleFamilyQuestion },
  ],
  8: [
    { kind: 'build-mode', make: buildModeQuestion },
    { kind: 'mode-feature', make: modeFeatureQuestion },
    { kind: 'ear-mode', make: earModeQuestion },
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

/** 保持题型均衡：每种题型轮流出现，避免一组里某一类刷屏 */
function generateBalanced(level: number, count: number, excludeKind?: TaskKind): Question[] {
  const gens = GENERATORS[level];
  if (!gens) throw new Error(`level ${level} is not available yet`);
  const out: Question[] = [];
  while (out.length < count) {
    let pool = shuffle(gens);
    const last = out.length > 0 ? out[out.length - 1].kind : excludeKind;
    if (pool.length > 1 && pool[0].kind === last) pool = [...pool.slice(1), pool[0]];
    const take = Math.min(pool.length, count - out.length);
    for (let i = 0; i < take; i++) out.push(pool[i].make());
  }
  return out;
}

/* ---------------- 混合组题（70 / 20 / 10） ---------------- */

export interface MixedSessionOptions {
  /** 上一题的类型，用来避免换组时第一题和上一题同型 */
  excludeKind?: TaskKind;
  /** 只出历史错题，用于「错题复习」 */
  mistakesOnly?: boolean;
}

/** 把同一题型相邻的题换开：每次优先放剩下最多的题型（避开上一题） */
function spreadKinds(list: Question[]): Question[] {
  const remaining = [...list];
  const out: Question[] = [];
  while (remaining.length > 0) {
    const counts = new Map<string, number>();
    for (const q of remaining) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);

    const lastKind = out.length > 0 ? out[out.length - 1].kind : null;
    let pickIdx = -1;
    let best = -1;
    remaining.forEach((q, i) => {
      if (q.kind === lastKind) return;
      const count = counts.get(q.kind) ?? 0;
      if (count > best) {
        best = count;
        pickIdx = i;
      }
    });
    if (pickIdx < 0) pickIdx = 0;
    out.push(remaining.splice(pickIdx, 1)[0]);
  }
  return out;
}

/**
 * 按大纲的比例组一组题：
 * 70% 当前关、20% 历史错题、10% 已通关关卡的随机题。
 * 错题不够时用当前关补齐；错题存的是整题快照，重做不会变内容。
 */
export function createMixedSession(
  level: number,
  size: number,
  store?: Store,
  { excludeKind, mistakesOnly = false }: MixedSessionOptions = {},
): Question[] {
  if (!GENERATORS[level]) throw new Error(`level ${level} is not available yet`);
  if (size <= 0) return [];

  if (mistakesOnly) {
    const pool = shuffle(store?.mistakes ?? []).slice(0, size);
    return spreadKinds(pool.map((m) => ({ ...m.question, id: uid() })));
  }

  const mistakes: Question[] = store
    ? shuffle(store.mistakes)
        .slice(0, Math.round(size * 0.2))
        .map((m) => ({ ...m.question, id: uid() }))
    : [];

  const passedLevels = store
    ? LEVELS.filter((l) => isLevelPassed(store, l.id) && GENERATORS[l.id]).map((l) => l.id)
    : [];
  const review: Question[] = [];
  const reviewCount = passedLevels.length > 0 ? Math.round(size * 0.1) : 0;
  if (reviewCount > 0) {
    // 历史关卡的抽题：同一关最多连抽 2 题，避免一组里塞满 L1
    const perLevel = Math.ceil(reviewCount / passedLevels.length);
    for (const passedLevel of shuffle(passedLevels)) {
      if (review.length >= reviewCount) break;
      review.push(...generateBalanced(passedLevel, Math.min(perLevel, reviewCount - review.length)));
    }
  }

  const current = generateBalanced(level, size - mistakes.length - review.length);

  const merged = spreadKinds(shuffle([...current, ...mistakes, ...review]));
  if (merged.length > 0 && excludeKind && merged[0].kind === excludeKind) {
    const j = merged.findIndex((q) => q.kind !== excludeKind);
    if (j > 0) [merged[0], merged[j]] = [merged[j], merged[0]];
  }
  return merged;
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
  earIntervalQuestion,
  earChordQuestion,
  buildMinorScaleQuestion,
  relativeKeyQuestion,
  earTonalityQuestion,
  buildSeventhQuestion,
  seventhInversionQuestion,
  earSeventhQuestion,
  buildScaleFamilyQuestion,
  scaleFeatureQuestion,
  earScaleFamilyQuestion,
  buildModeQuestion,
  modeFeatureQuestion,
  earModeQuestion,
};
