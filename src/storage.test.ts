import { describe, expect, it } from 'vitest';
import { generateQuestion } from './quiz/generators';
import { questionKey } from './quiz/types';
import {
  emptyStore,
  exportStore,
  importStore,
  loadStore,
  recordAttempt,
  recordMistake,
  resetProgress,
  reviewMistake,
  MISTAKE_CLEAR_STREAK,
} from './storage';

const q = () => generateQuestion(3);

describe('错题本', () => {
  it('答错入库，同一道题再错不重复占位', () => {
    const question = q();
    let store = recordMistake(emptyStore(), question, 1000);
    expect(store.mistakes).toHaveLength(1);
    expect(store.mistakes[0].wrong).toBe(1);

    store = recordMistake(store, question, 2000);
    expect(store.mistakes).toHaveLength(1);
    expect(store.mistakes[0].wrong).toBe(2);
    expect(store.mistakes[0].at).toBe(2000);
  });

  it('连续答对 2 次移出，答错重新计数', () => {
    const question = q();
    let store = recordMistake(emptyStore(), question);
    expect(store.mistakes).toHaveLength(1);

    store = reviewMistake(store, question, true);
    expect(store.mistakes[0].streak).toBe(1);
    expect(store.mistakes).toHaveLength(1);

    store = reviewMistake(store, question, false);
    expect(store.mistakes[0].streak).toBe(0);
    expect(store.mistakes).toHaveLength(1);

    store = reviewMistake(store, question, true);
    store = reviewMistake(store, question, true);
    expect(store.mistakes).toHaveLength(0);
  });

  it('答对次数刚好达到上限就移出', () => {
    const question = q();
    let store = recordMistake(emptyStore(), question);
    for (let i = 0; i < MISTAKE_CLEAR_STREAK; i++) store = reviewMistake(store, question, true);
    expect(store.mistakes).toHaveLength(0);

    // 移出后再答错，重新进去
    store = reviewMistake(store, question, false);
    expect(store.mistakes).toHaveLength(1);
  });

  it('只保留最近的 40 道错题', () => {
    let store = emptyStore();
    for (let i = 0; i < 45; i++) {
      // 生成器会随机重复到同一道题，这里强制每题都不一样
      const question = { ...generateQuestion(2), prompt: `第 ${i} 题：${i}` };
      store = recordMistake(store, question, 1000 + i);
    }
    expect(store.mistakes).toHaveLength(40);
    // 最新的在最前面
    expect(store.mistakes[0].at).toBe(1044);
  });
});

describe('一次作答的统计', () => {
  it('答对只加分关正确率，不进错题本', () => {
    const question = q();
    const store = recordAttempt(emptyStore(), question, true);
    expect(store.levels['3']).toEqual({ attempts: 1, correct: 1 });
    expect(store.mistakes).toHaveLength(0);
  });

  it('答错同时进错题本', () => {
    const question = q();
    const store = recordAttempt(emptyStore(), question, false);
    expect(store.levels['3']).toEqual({ attempts: 1, correct: 0 });
    expect(store.mistakes).toHaveLength(1);
  });

  it('重做错题答对时累计 streak，而不是新增错题', () => {
    const question = q();
    let store = recordAttempt(emptyStore(), question, false);
    const key = questionKey(question);
    expect(store.mistakes[0].key).toBe(key);

    store = recordAttempt(store, question, true, { fromMistake: true });
    expect(store.mistakes).toHaveLength(1);
    expect(store.mistakes[0].streak).toBe(1);
    expect(store.mistakes[0].wrong).toBe(1);
  });

  it('关掉参照音的听辨题单独统计', () => {
    const ear = generateQuestion(5);
    const question = ear.ear ? ear : { ...ear, ear: { reference: 60, midis: [60, 64], style: 'setting' as const, note: 'x' } };
    let store = recordAttempt(emptyStore(), question, false, { usedReference: false });
    expect(store.earNoRef).toEqual({ attempts: 1, correct: 0 });
    store = recordAttempt(store, question, true, { usedReference: false });
    expect(store.earNoRef).toEqual({ attempts: 2, correct: 1 });

    // 带参照音的不计入
    store = recordAttempt(store, question, true, { usedReference: true });
    expect(store.earNoRef).toEqual({ attempts: 2, correct: 1 });
  });
});

describe('存储读写', () => {
  it('导入导出的数据能完整保留错题本和听辨统计', () => {
    let store = recordAttempt(emptyStore(), q(), false, { usedReference: false });
    store = { ...store, earNoRef: { attempts: 3, correct: 2 } };
    const text = exportStore(store);
    const back = importStore(text);
    expect(back).not.toBeNull();
    expect(back!.mistakes).toHaveLength(1);
    expect(back!.earNoRef).toEqual({ attempts: 3, correct: 2 });
  });

  it('旧版本数据缺少新字段时自动补默认值', () => {
    const legacy = { version: 1, settings: { sessionSize: 20 }, levels: {}, sessions: [] };
    const back = importStore(JSON.stringify(legacy));
    expect(back!.mistakes).toEqual([]);
    expect(back!.earNoRef).toEqual({ attempts: 0, correct: 0 });
    expect(back!.settings.sessionSize).toBe(20);
    expect(back!.settings.earReference).toBe(true);
  });

  it('清空进度时连错题本一起清掉', () => {
    const store = recordAttempt(emptyStore(), q(), false, { usedReference: false });
    const cleared = resetProgress(store);
    expect(cleared.mistakes).toEqual([]);
    expect(cleared.earNoRef).toEqual({ attempts: 0, correct: 0 });
    expect(cleared.levels).toEqual({});
  });

  it('没有 localStorage 时返回空 store（Node 环境）', () => {
    expect(loadStore().mistakes).toEqual([]);
  });
});
