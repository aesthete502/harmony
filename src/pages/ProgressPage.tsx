import { useRef, useState } from 'react';
import { LEVELS, PASS_RATE } from '../content/levels';
import {
  exportStore,
  importStore,
  levelAccuracy,
  overallAccuracy,
  resetProgress,
  type Store,
} from '../storage';

interface Props {
  store: Store;
  update: (fn: (s: Store) => Store) => void;
}

function formatTime(at: number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

export function ProgressPage({ store, update }: Props) {
  const overall = overallAccuracy(store);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const passedCount = LEVELS.filter((l) => {
    const stat = store.levels[String(l.id)];
    const acc = levelAccuracy(store, l.id) ?? 0;
    return stat && stat.attempts >= l.required && acc >= PASS_RATE;
  }).length;

  const practiced = LEVELS.filter((l) => store.levels[String(l.id)]?.attempts);

  const handleExport = () => {
    const blob = new Blob([exportStore(store)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `harmony-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('已导出。手机上可以在下载目录里找到这个文件。');
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const imported = importStore(text);
    if (!imported) {
      setMessage('导入失败：文件格式不对。');
      return;
    }
    update(() => imported);
    setMessage('导入成功，进度已覆盖。');
  };

  const handleReset = () => {
    if (!window.confirm('确定清空所有练习记录？这个操作不能撤销。')) return;
    update((s) => resetProgress(s));
    setMessage('练习记录已清空。');
  };

  return (
    <div className="stack">
      <div className="card stack">
        <span className="section-title">总览</span>
        <div className="row-wrap">
          <span className="badge accent">累计 {overall.attempts} 题</span>
          <span className="badge">正确率 {Math.round(overall.rate * 100)}%</span>
          <span className="badge">已练 {practiced.length} 关</span>
          <span className="badge ok">通关 {passedCount} 关</span>
        </div>
      </div>

      <div className="card stack">
        <span className="section-title">分关正确率</span>
        {practiced.length === 0 ? (
          <p className="small muted">还没有练习记录。去「练习」做一组，这里就会有数据。</p>
        ) : (
          practiced.map((l) => {
            const stat = store.levels[String(l.id)];
            const acc = levelAccuracy(store, l.id) ?? 0;
            return (
              <div className="stat-row" key={l.id}>
                <span className="name">
                  L{l.id} {l.title}
                </span>
                <span className="bar">
                  <div style={{ width: `${Math.round(acc * 100)}%` }} />
                </span>
                <span className="val">
                  {stat.correct}/{stat.attempts}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="card stack">
        <span className="section-title">最近练习</span>
        {store.sessions.length === 0 ? (
          <p className="small muted">完成一整组 10 题后，这里会记录成绩。</p>
        ) : (
          store.sessions.slice(0, 10).map((s) => (
            <div className="row spread small" key={`${s.at}-${s.level}`}>
              <span className="muted">{formatTime(s.at)}</span>
              <span>
                L{s.level} · {s.correct}/{s.total}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="card stack">
        <span className="section-title">数据</span>
        <p className="hint">
          进度只存在这台设备的浏览器里，电脑和手机不会自动同步。换设备或清缓存前先导出，另一台导入即可。
        </p>
        <div className="row-wrap">
          <button className="btn btn-sm" onClick={handleExport}>
            导出 JSON
          </button>
          <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
            导入 JSON
          </button>
          <button className="btn btn-sm btn-ghost" onClick={handleReset}>
            清空进度
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            void handleImport(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {message && <p className="small">{message}</p>}
      </div>
    </div>
  );
}
