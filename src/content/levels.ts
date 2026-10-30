import type { Store } from '../storage';
import { levelAccuracy } from '../storage';

export interface LevelMeta {
  id: number;
  title: string;
  goal: string;
  /** 通关所需累计题量 */
  required: number;
  /** 批 1 是否已经可用 */
  ready: boolean;
}

export const PASS_RATE = 0.85;

export const LEVELS: LevelMeta[] = [
  { id: 1, title: '音名与键盘', goal: '看到音名能找到键，看到键能说出音名', required: 20, ready: true },
  { id: 2, title: '大调音阶与音级', goal: '任意根音构大调，说出每个音是第几级', required: 15, ready: true },
  { id: 3, title: '常用音程', goal: '构出并识别大小三六、纯四五八', required: 25, ready: true },
  { id: 4, title: '三和弦与转位', goal: '四种三和弦的构成、性质与转位', required: 30, ready: true },
  { id: 5, title: '全部音程与自然小调', goal: '补齐二七度，理解关系大小调', required: 30, ready: false },
  { id: 6, title: '七和弦与转位', goal: '五种七和弦的构成与听辨', required: 35, ready: false },
  { id: 7, title: '五声与和声小调', goal: '用特征音区分音阶家族', required: 30, ready: false },
  { id: 8, title: '七种调式', goal: '同一批音、不同中心', required: 35, ready: false },
  { id: 9, title: '和声功能与进行', goal: '听出常见和弦进行', required: 30, ready: false },
];

export function levelMeta(id: number): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** 关卡 N 解锁条件：上一关累计题量达标且正确率 >= 85% */
export function isLevelUnlocked(store: Store, id: number): boolean {
  if (id <= 1) return true;
  const prev = levelMeta(id - 1);
  const stat = store.levels[String(id - 1)];
  if (!prev || !stat) return false;
  const acc = levelAccuracy(store, id - 1) ?? 0;
  return stat.attempts >= prev.required && acc >= PASS_RATE;
}

export function nextRequired(id: number): LevelMeta | undefined {
  return LEVELS.find((l) => l.id === id);
}
