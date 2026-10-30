import { describe, expect, it } from 'vitest';
import { isBlackKey } from '../theory';
import { createSession, generateQuestion } from './generators';
import { checkAnswer } from './types';

const LEVELS = [1, 2, 3, 4];
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
      }
    });
  }

  it('构音阶题正好 7 个答案，构和弦题正好 3 个', () => {
    for (let i = 0; i < 30; i++) {
      const scale = generateQuestion(2);
      if (scale.kind === 'build-scale') expect(scale.expectedKeys).toHaveLength(7);
      const chord = generateQuestion(4);
      if (chord.kind === 'build-chord') expect(chord.expectedKeys).toHaveLength(3);
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
      for (let i = 0; i < 10; i++) {
        const first = generateQuestion(level);
        const more = createSession(level, 10, first.kind);
        expect(more[0].kind).not.toBe(first.kind);
      }
    }
  });

  it('未开放的关卡报错而不是静默出题', () => {
    expect(() => generateQuestion(5)).toThrow();
  });

  it('L1–L4 不会出重升/重降（留到以后讲变音记号时）', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 120; i++) {
        const q = generateQuestion(level);
        const text = [q.prompt, q.explanation, ...Object.values(q.revealLabels ?? {})].join(' ');
        expect(text).not.toMatch(/♭♭|♯♯/);
      }
    }
  });
});
