import { describe, expect, it } from 'vitest';
import { isBlackKey } from '../theory';
import { emptyStore } from '../storage';
import { createMixedSession, createSession, generateQuestion, READY_LEVELS } from './generators';
import { checkAnswer } from './types';
import type { Question } from './types';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const SAMPLES = 80;

describe('题目生成器', () => {
  for (const level of LEVELS) {
    it(`L${level} 生成的题目结构完整且答案自洽`, () => {
      for (let i = 0; i < SAMPLES; i++) {
        const q = generateQuestion(level);
        expect(q.level).toBe(level);
        expect(q.prompt.length).toBeGreaterThan(3);
        expect(q.explanation.length).toBeGreaterThan(3);
        expect(q.keyRange[0]).toBeLessThan(q.keyRange[1]);
        // 键盘范围必须从白键开始，否则最左边那个音画不出来（尤其是带升降号的根音）
        expect(isBlackKey(q.keyRange[0])).toBe(false);
        expect(isBlackKey(q.keyRange[1])).toBe(false);

        for (const midi of q.highlight ?? []) {
          expect(midi).toBeGreaterThanOrEqual(q.keyRange[0]);
          expect(midi).toBeLessThanOrEqual(q.keyRange[1]);
        }

        if (q.answerMode === 'keys') {
          const expected = q.expectedKeys ?? [];
          expect(expected.length).toBeGreaterThan(0);
          expect(new Set(expected).size).toBe(expected.length);
          for (const midi of expected) {
            expect(midi).toBeGreaterThanOrEqual(q.keyRange[0]);
            expect(midi).toBeLessThanOrEqual(q.keyRange[1]);
          }
          expect(checkAnswer(q, expected, null)).toBe(true);
          expect(checkAnswer(q, [], null)).toBe(false);
        } else {
          const choices = q.choices ?? [];
          expect(choices.length).toBeGreaterThanOrEqual(2);
          expect(new Set(choices).size).toBe(choices.length);
          expect(choices).toContain(q.correctChoice);
          expect(checkAnswer(q, [], q.correctChoice ?? null)).toBe(true);
          expect(checkAnswer(q, [], '__wrong__')).toBe(false);
        }

        if (q.ear) {
          // 听辨题不能把答案画在键盘上
          expect(q.ear.midis.length).toBeGreaterThan(0);
          expect(q.ear.note.length).toBeGreaterThan(2);
          expect(q.highlight ?? []).toHaveLength(0);
          expect(q.answerMode).toBe('choice');
        }
      }
    });
  }

  it('L1–L8 的每种题型都出得到', () => {
    const seen = new Map<number, Set<string>>();
    for (const level of LEVELS) {
      const kinds = new Set<string>();
      for (let i = 0; i < 200; i++) kinds.add(generateQuestion(level).kind);
      seen.set(level, kinds);
      // L1 只有两种题型，其余每关至少三种
      expect(kinds.size, `L${level} 只出到 ${[...kinds].join(',')}`).toBeGreaterThanOrEqual(
        level === 1 ? 2 : 3,
      );
    }
    expect([...seen.get(5)!].sort()).toEqual(
      ['build-minor-scale', 'ear-interval', 'ear-tonality', 'relative-key'].sort(),
    );
    expect([...seen.get(8)!].sort()).toEqual(
      ['build-mode', 'ear-mode', 'mode-feature'].sort(),
    );
  });

  it('构音阶题正好 7 个答案，构和弦题正好 3 个，构七和弦正好 4 个', () => {
    for (let i = 0; i < 60; i++) {
      const scale = generateQuestion(2);
      if (scale.kind === 'build-scale') expect(scale.expectedKeys).toHaveLength(7);
      const chord = generateQuestion(4);
      if (chord.kind === 'build-chord') expect(chord.expectedKeys).toHaveLength(3);
      const seventh = generateQuestion(6);
      if (seventh.kind === 'build-seventh') expect(seventh.expectedKeys).toHaveLength(4);
    }
  });

  it('一组 10 题，且不连续出现同一题型', () => {
    for (const level of LEVELS) {
      const session = createSession(level, 10);
      expect(session).toHaveLength(10);
      for (let i = 1; i < session.length; i++) {
        expect(session[i].kind).not.toBe(session[i - 1].kind);
      }
    }
  });

  it('不限题数追加新题时，第一题接得上上一题', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 20; i++) {
        const first = generateQuestion(level);
        const more = createSession(level, 10, first.kind);
        expect(more[0].kind).not.toBe(first.kind);
      }
    }
  });

  it('未开放的关卡报错而不是静默出题', () => {
    expect(READY_LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(() => generateQuestion(9)).toThrow();
    expect(() => createMixedSession(9, 10)).toThrow();
  });

  it('L1–L8 不会出重升/重降（留到以后讲变音记号时）', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 120; i++) {
        const q = generateQuestion(level);
        const text = [q.prompt, q.explanation, ...Object.values(q.revealLabels ?? {})].join(' ');
        expect(text).not.toMatch(/♭♭|♯♯/);
      }
    }
  });
});

describe('混合组题 70 / 20 / 10', () => {
  const fakeMistake = (n: number): Question => ({
    ...generateQuestion(2),
    id: `mistake-${n}`,
  });

  function storeWithMistakes(count: number, passedLevel = 1) {
    const s = emptyStore();
    s.mistakes = Array.from({ length: count }, (_, i) => ({
      key: `k${i}`,
      level: 2,
      question: fakeMistake(i),
      streak: 0,
      wrong: 1,
      at: Date.now() - i * 1000,
    }));
    s.levels[String(passedLevel)] = { attempts: 999, correct: 999 };
    return s;
  }

  it('10 题 = 7 当前关 + 2 错题 + 1 历史关', () => {
    const store = storeWithMistakes(5);
    const session = createMixedSession(4, 10, store);
    expect(session).toHaveLength(10);
    expect(session.filter((q) => q.level === 2)).toHaveLength(2);
    expect(session.filter((q) => q.level === 1)).toHaveLength(1);
    expect(session.filter((q) => q.level === 4)).toHaveLength(7);
  });

  it('没有错题和通关记录时，全部出当前关', () => {
    const session = createMixedSession(5, 10, emptyStore());
    expect(session).toHaveLength(10);
    expect(session.every((q) => q.level === 5)).toBe(true);
  });

  it('错题不够时用当前关补齐', () => {
    const store = storeWithMistakes(1);
    const session = createMixedSession(4, 10, store);
    expect(session).toHaveLength(10);
    expect(session.filter((q) => q.level === 4)).toHaveLength(8);
  });

  it('错题复习模式只出错题，并按时间倒序取最近的', () => {
    const store = storeWithMistakes(30);
    const session = createMixedSession(4, 20, store, { mistakesOnly: true });
    expect(session).toHaveLength(20);
    expect(session.every((q) => q.level === 2)).toBe(true);
  });

  it('混合后不连续出现同一题型', () => {
    for (let i = 0; i < 20; i++) {
      const session = createMixedSession(6, 20, storeWithMistakes(6));
      for (let k = 1; k < session.length; k++) {
        expect(session[k].kind).not.toBe(session[k - 1].kind);
      }
    }
  });
});
