import { useState } from 'react';
import { lessonFor } from '../content/lessons';
import { LEVELS, isLevelUnlocked, PASS_RATE } from '../content/levels';
import type { ExploreRequest } from '../navigation';
import { levelAccuracy, type Store } from '../storage';
import { LessonPage } from './LessonPage';

interface Props {
  store: Store;
  onStartPractice: (level: number) => void;
  onOpenInExplore: (request: ExploreRequest) => void;
}

export function CoursePage({ store, onStartPractice, onOpenInExplore }: Props) {
  const [openLevel, setOpenLevel] = useState<number | null>(null);
  const lesson = openLevel === null ? undefined : lessonFor(openLevel);

  if (lesson) {
    return (
      <LessonPage
        lesson={lesson}
        canPractice={LEVELS.find((l) => l.id === lesson.level)?.ready ?? false}
        onBack={() => setOpenLevel(null)}
        onPractice={() => onStartPractice(lesson.level)}
        onOpenLesson={setOpenLevel}
        onOpenInExplore={onOpenInExplore}
      />
    );
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div className="question">先读讲义，再去练习</div>
        <p className="small muted">
          每关一篇，200–400 字，配一张会动的谱面/键盘图和一段试听，最后有 3 道自测。讲义里的「在探索页打开」可以把它
          放进探索页慢慢对比。
        </p>
        <div className="row-wrap">
          <span className="badge">L1–L9 讲义已就绪</span>
          <span className="badge">练习 L1–L8 已开放</span>
          <span className="badge accent">通关线 {Math.round(PASS_RATE * 100)}%</span>
        </div>
      </div>

      <div className="level-grid">
        {LEVELS.map((l) => {
          const stat = store.levels[String(l.id)];
          const acc = levelAccuracy(store, l.id);
          const passed = stat && stat.attempts >= l.required && (acc ?? 0) >= PASS_RATE;
          const unlocked = isLevelUnlocked(store, l.id);

          return (
            <button
              key={l.id}
              className="level-card"
              onClick={() => setOpenLevel(l.id)}
              title={`打开 L${l.id} 讲义`}
            >
              <span className="lv">
                L{l.id}
                {!l.ready && ' · 练习待开放'}
              </span>
              <span className="ttl">{l.title}</span>
              <span className="tiny muted">{l.goal}</span>
              <div className="row-wrap" style={{ marginTop: 4 }}>
                {passed && <span className="badge ok">已通关</span>}
                {!passed && stat && <span className="badge">练习中</span>}
                {!stat && l.ready && <span className="badge">未开始</span>}
                {l.ready && !unlocked && l.id > 1 && !passed && (
                  <span className="badge">建议先过 L{l.id - 1}</span>
                )}
              </div>
              {stat && (
                <span className="tiny muted">
                  {stat.attempts} / {l.required} 题 · {acc ? Math.round(acc * 100) : 0}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="hint">
        L1–L8 的练习已经开放，L9 的和声进行会随批 3 一起开放。关卡只是推荐顺序，不会强行锁住。
      </p>
    </div>
  );
}
