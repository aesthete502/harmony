import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../content/lessons';
import { LessonPage } from './LessonPage';

/**
 * 讲义页的冒烟测试：谱面和键盘都是客户端渲染的，这里只检查
 * 服务端能渲染出正文和自测，不会在组件里抛错。
 */
describe('讲义页', () => {
  it('九篇都能渲染出正文和自测', () => {
    for (const lesson of LESSONS) {
      const html = renderToStaticMarkup(
        createElement(LessonPage, {
          lesson,
          canPractice: lesson.level <= 4,
          onBack: () => {},
          onPractice: () => {},
          onOpenInExplore: () => {},
        }),
      );
      expect(html).toContain(lesson.oneLine);
      expect(html).toContain('自测');
      expect(html).toContain(lesson.quiz[0].question);
      // 进行图没有对应的探索页预设，所以不检查这个按钮
      if (lesson.figure.kind !== 'progression') {
        expect(html).toContain('在探索页打开');
      }
    }
  });
});
