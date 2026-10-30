export type LabelMode = 'degree' | 'name';
export type PlayMode = 'block' | 'up' | 'down';

export interface Settings {
  labelMode: LabelMode;
  playMode: PlayMode;
  /** 指板是否显示音名，关闭后只显示高亮的级数 */
  showFretNames: boolean;
  /** 一组多少题；0 表示不限题数，手动结束 */
  sessionSize: number;
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

export interface Store {
  version: 1;
  settings: Settings;
  /** key 为关卡号，如 "1" */
  levels: Record<string, LevelStat>;
  sessions: SessionRecord[];
}

const STORAGE_KEY = 'harmony.v1';

export const DEFAULT_SETTINGS: Settings = {
  labelMode: 'degree',
  playMode: 'up',
  showFretNames: true,
  sessionSize: 10,
};

export function emptyStore(): Store {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, levels: {}, sessions: [] };
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
  return { ...store, levels: {}, sessions: [] };
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
    };
  } catch {
    return null;
  }
}
