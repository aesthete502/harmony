import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../quiz/generators';
import { emptyStore, type Store } from '../storage';
import { PracticePage } from './PracticePage';

function render(store: Store, level = 5) {
  return renderToStaticMarkup(
    createElement(PracticePage, {
      level,
      onLevelChange: () => {},
      store,
      update: () => {},
      onSettingsChange: () => {},
    }),
  );
}

describe('练习页', () => {
  it('开始页有关卡、听辨设置和错题本', () => {
    const html = render(emptyStore());
    expect(html).toContain('开始练习');
    expect(html).toContain('听辨先播参照音');
    expect(html).toContain('听辨播放方式');
    expect(html).toContain('错题本');
    // L5 已开放，L9 还没有
    expect(html).toContain('全部音程与自然小调');
    expect(html).toContain('待开放');
  });

  it('有错题时显示「只练错题」和待复习数量', () => {
    const store = emptyStore();
    store.mistakes = [
      {
        key: 'k',
        level: 3,
        question: generateQuestion(3),
        streak: 1,
        wrong: 2,
        at: 1,
      },
    ];
    const html = render(store, 5);
    expect(html).toContain('只练错题（1 题）');
    expect(html).toContain('答错的题会自动进来');
  });
  it('关掉参照音后显示无参照音统计', () => {
    const store = emptyStore();
    store.settings.earReference = false;
    store.earNoRef = { attempts: 10, correct: 8 };
    const html = render(store);
    expect(html).toContain('无参照音听辨：8 / 10 正确');
  });
});
