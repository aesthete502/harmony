import { LEVELS, isLevelUnlocked, PASS_RATE } from '../content/levels';
import { levelAccuracy, type Store } from '../storage';

interface Props {
  store: Store;
  onOpenLevel: (level: number) => void;
}

export function CoursePage({ store, onOpenLevel }: Props) {
  return (
    <div className="stack">
      <div className="card stack">
        <div className="question">按顺序学，也可以跳着练</div>
        <p className="small muted">
          每一关都是「先看构成，再做构成题」。构成题稳定在 85% 以上再往下走，听辨部分会在批 2 补上。
        </p>
        <div className="row-wrap">
          <span className="badge">L1–L4 已开放</span>
          <span className="badge">L5–L9 批 2</span>
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
              className={`level-card${l.ready ? '' : ' locked'}`}
              disabled={!l.ready}
              onClick={() => onOpenLevel(l.id)}
              title={l.ready ? l.goal : '批 2 开放'}
            >
              <span className="lv">
                L{l.id}
                {!l.ready && ' · 待开放'}
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

      <p className="hint">关卡只是推荐顺序，不会强行锁住；想先看 L4 的和弦也可以直接点进去。</p>
    </div>
  );
}
