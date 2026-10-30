import { describe, expect, it } from 'vitest';
import { isBlackKey } from '../theory';
import { keyboardRange, resolveFigure } from './figure';
import { LESSONS } from './lessons';
import type { LessonFigure } from './lessons';

const cjkCount = (text: string) => (text.match(/[\u4e00-\u9fff]/g) ?? []).length;

const figuresOf = (level: number): LessonFigure[] => {
  const lesson = LESSONS.find((l) => l.level === level)!;
  return [lesson.figure, lesson.contrast].filter(Boolean) as LessonFigure[];
};

describe('讲义内容', () => {
  it('L1–L9 各有一篇', () => {
    expect(LESSONS.map((l) => l.level)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const lesson of LESSONS) {
      expect(lesson.title.length).toBeGreaterThan(1);
      expect(lesson.oneLine.length).toBeGreaterThan(10);
      expect(lesson.sections.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('每篇正文 200–400 字', () => {
    for (const lesson of LESSONS) {
      const text = [lesson.oneLine, ...lesson.sections.flatMap((s) => [s.heading, ...s.body])].join('');
      const count = cjkCount(text);
      expect(count, `L${lesson.level} 只有 ${count} 字`).toBeGreaterThanOrEqual(200);
      expect(count, `L${lesson.level} 有 ${count} 字`).toBeLessThanOrEqual(400);
    }
  });

  it('每篇 3 道自测，选项和答案自洽', () => {
    for (const lesson of LESSONS) {
      expect(lesson.quiz.length).toBe(3);
      for (const item of lesson.quiz) {
        expect(item.question.length).toBeGreaterThan(4);
        expect(item.why.length).toBeGreaterThan(4);
        expect(item.choices.length).toBe(4);
        expect(new Set(item.choices).size).toBe(4);
        expect(item.correct).toBeGreaterThanOrEqual(0);
        expect(item.correct).toBeLessThan(item.choices.length);
      }
    }
  });

  it('正确答案不总是第一个选项', () => {
    // 全是 A 的话靠蒙也能过，内容上不要留这个漏洞
    for (const lesson of LESSONS) {
      const positions = lesson.quiz.map((q) => q.correct);
      expect(new Set(positions).size).toBeGreaterThan(1);
    }
  });
});

describe('讲义插图', () => {
  it('每张图都能算出音和谱面', () => {
    for (const lesson of LESSONS) {
      for (const fig of figuresOf(lesson.level)) {
        const resolved = resolveFigure(fig);
        expect(resolved.label.length).toBeGreaterThan(0);
        expect(resolved.caption.length).toBeGreaterThan(0);
        if (resolved.progression) {
          expect(resolved.progression.length).toBeGreaterThan(1);
          for (const step of resolved.progression) {
            expect(step.midis.length).toBeGreaterThanOrEqual(3);
          }
        } else {
          expect(resolved.notes.length).toBeGreaterThan(0);
          expect(resolved.midis).toHaveLength(resolved.notes.length);
        }
      }
    }
  });

  it('键盘范围从白键开始，且包住所有高亮的音', () => {
    for (const lesson of LESSONS) {
      for (const fig of figuresOf(lesson.level)) {
        const resolved = resolveFigure(fig);
        if (resolved.midis.length === 0) continue;
        const [lo, hi] = keyboardRange(resolved.midis);
        expect(isBlackKey(lo)).toBe(false);
        expect(isBlackKey(hi)).toBe(false);
        expect(lo).toBeLessThan(hi);
        for (const midi of resolved.midis) {
          expect(midi).toBeGreaterThanOrEqual(lo);
          expect(midi).toBeLessThanOrEqual(hi);
        }
      }
    }
  });

  it('可跳转的图都带探索页参数', () => {
    for (const lesson of LESSONS) {
      for (const fig of figuresOf(lesson.level)) {
        const resolved = resolveFigure(fig);
        if (fig.kind === 'progression' || fig.kind === 'pitch') {
          expect(resolved.explore).toBeUndefined();
        } else {
          expect(resolved.explore?.kind).toBe(fig.kind);
        }
      }
    }
  });
});
