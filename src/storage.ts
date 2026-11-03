import { questionKey, type Question } from './quiz/types';

export type LabelMode = 'degree' | 'name';
export type PlayMode = 'block' | 'up' | 'down';

export interface Settings {
  labelMode: LabelMode;
  playMode: PlayMode;
  /** 指板是否显示音名，关闭后只显示高亮的级数 */
  showFretNames: boolean;
  /** 一组多少题；0 表示不限题数，手动结束 */
  sessionSize: number;
  /** 听辨题是否先播主音/根音作为参照 */
  earReference: boolean;
}

export interface LevelStat {
  attempts: number;
  correct: number;
}

export interface SessionRecord {
  at: number;
  level: number;
  total: number;
  correct: number;
}

/** 错题本条目：存整道题的快照，重做时不用重新生成，题目内容不会变 */
export interface MistakeEntry {
  key: string;
  level: number;
  question: Question;
  /** 连续答对次数，达到 2 次移出错题本 */
  streak: number;
  /** 一共答错过几次 */
  wrong: number;
  /** 最近一次答错的时间 */
  at: number;
}

export interface Store {
  version: 1;
  settings: Settings;
  /** key 为关卡号，如 "1" */
  levels: Record<string, LevelStat>;
  sessions: SessionRecord[];
  mistakes: MistakeEntry[];
  /** 关掉参照音时的听辨成绩，单独统计 */
  earNoRef: { attempts: number; correct: number };
}

const STORAGE_KEY = 'harmony.v1';
const MAX_MISTAKES = 40;
/** 连续答对多少次移出错题本 */
export const MISTAKE_CLEAR_STREAK = 2;

export const DEFAULT_SETTINGS: Settings = {
  labelMode: 'degree',
  playMode: 'up',
  showFretNames: true,
  sessionSize: 10,
  earReference: true,
};

export function emptyStore(): Store {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    levels: {},
    sessions: [],
    mistakes: [],
    earNoRef: { attempts: 0, correct: 0 },
  };
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      levels: parsed.levels ?? {},
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      earNoRef: parsed.earNoRef ?? { attempts: 0, correct: 0 },
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 隐私模式或空间不足时静默失败，不影响练习 */
  }
}

export function recordAnswer(store: Store, level: number, correct: boolean): Store {
  const key = String(level);
  const prev = store.levels[key] ?? { attempts: 0, correct: 0 };
  return {
    ...store,
    levels: {
      ...store.levels,
      [key]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
      },
    },
  };
}

/** 答错入库；同一道题再错只更新时间，不重复占位 */
export function recordMistake(store: Store, question: Question, at = Date.now()): Store {
  const key = questionKey(question);
  const prev = store.mistakes.find((m) => m.key === key);
  const entry: MistakeEntry = {
    key,
    level: question.level,
    question,
    streak: 0,
    wrong: (prev?.wrong ?? 0) + 1,
    at,
  };
  const rest = store.mistakes.filter((m) => m.key !== key);
  const mistakes = [entry, ...rest].sort((a, b) => b.at - a.at).slice(0, MAX_MISTAKES);
  return { ...store, mistakes };
}

/** 重做错题：答对累计 2 次移出，答错清零 */
export function reviewMistake(store: Store, question: Question, correct: boolean, at = Date.now()): Store {
  const key = questionKey(question);
  const entry = store.mistakes.find((m) => m.key === key);
  if (!entry) return correct ? store : recordMistake(store, question, at);

  if (!correct) {
    return recordMistake(store, question, at);
  }

  const streak = entry.streak + 1;
  if (streak >= MISTAKE_CLEAR_STREAK) {
    return { ...store, mistakes: store.mistakes.filter((m) => m.key !== key) };
  }
  return {
    ...store,
    mistakes: store.mistakes.map((m) => (m.key === key ? { ...m, streak, at } : m)),
  };
}

export interface AttemptOptions {
  /** 这道题是不是从错题本抽出来的 */
  fromMistake?: boolean;
  /** 听辨题是否放了参照音（非听辨题忽略） */
  usedReference?: boolean;
}

/**
 * 一次作答的统一入口：分关统计 + 听辨（无参照音）统计 + 错题本。
 * 页面层不用操心这几个计数器之间的关系。
 */
export function recordAttempt(
  store: Store,
  question: Question,
  correct: boolean,
  { fromMistake = false, usedReference = true }: AttemptOptions = {},
): Store {
  let next = recordAnswer(store, question.level, correct);

  if (question.ear && !usedReference) {
    const prev = next.earNoRef;
    next = {
      ...next,
      earNoRef: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0) },
    };
  }

  if (fromMistake) return reviewMistake(next, question, correct);
  if (!correct) return recordMistake(next, question);
  return next;
}

export function recordSession(store: Store, level: number, total: number, correct: number): Store {
  const record: SessionRecord = { at: Date.now(), level, total, correct };
  return { ...store, sessions: [record, ...store.sessions].slice(0, 50) };
}

export function levelAccuracy(store: Store, level: number): number | null {
  const stat = store.levels[String(level)];
  if (!stat || stat.attempts === 0) return null;
  return stat.correct / stat.attempts;
}

export function overallAccuracy(store: Store): { attempts: number; correct: number; rate: number } {
  const stats = Object.values(store.levels);
  const attempts = stats.reduce((sum, s) => sum + s.attempts, 0);
  const correct = stats.reduce((sum, s) => sum + s.correct, 0);
  return { attempts, correct, rate: attempts === 0 ? 0 : correct / attempts };
}

export function resetProgress(store: Store): Store {
  return {
    ...store,
    levels: {},
    sessions: [],
    mistakes: [],
    earNoRef: { attempts: 0, correct: 0 },
  };
}

export function updateSettings(store: Store, patch: Partial<Settings>): Store {
  return { ...store, settings: { ...store.settings, ...patch } };
}

export function exportStore(store: Store): string {
  return JSON.stringify(store, null, 2);
}

export function importStore(text: string): Store | null {
  try {
    const parsed = JSON.parse(text) as Partial<Store>;
    if (!parsed || typeof parsed !== 'object' || !parsed.levels) return null;
    return {
      version: 1,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      levels: parsed.levels,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
      earNoRef: parsed.earNoRef ?? { attempts: 0, correct: 0 },
    };
  } catch {
    return null;
  }
}
