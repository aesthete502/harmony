import { useEffect, useState } from 'react';
import { IconChart, IconCircle, IconKeyboard, IconLayers, IconTarget } from './components/Icons';
import type { ExploreRequest } from './navigation';
import { CirclePage } from './pages/CirclePage';
import { CoursePage } from './pages/CoursePage';
import { ExplorePage } from './pages/ExplorePage';
import { PracticePage } from './pages/PracticePage';
import { ProgressPage } from './pages/ProgressPage';
import { loadStore, saveStore, updateSettings, type Settings, type Store } from './storage';

type View = 'explore' | 'circle' | 'practice' | 'course' | 'progress';

const TABS: { id: View; label: string; icon: (p: { size?: number }) => React.JSX.Element }[] = [
  { id: 'explore', label: '探索', icon: IconKeyboard },
  { id: 'circle', label: '五度圈', icon: IconCircle },
  { id: 'practice', label: '练习', icon: IconTarget },
  { id: 'course', label: '课程', icon: IconLayers },
  { id: 'progress', label: '进度', icon: IconChart },
];

const SUBTITLES: Record<View, string> = {
  explore: '看构成 · 点击任意键试听',
  circle: '12 个调 · 顺阶和弦',
  practice: '构成题 · 想练多少练多少',
  course: 'L1–L9 讲义 · 先读再练',
  progress: '正确率 · 导出导入',
};

export default function App() {
  const [view, setView] = useState<View>('explore');
  const [level, setLevel] = useState(1);
  const [store, setStore] = useState<Store>(loadStore);
  const [exploreRequest, setExploreRequest] = useState<ExploreRequest | null>(null);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const update = (fn: (s: Store) => Store) => setStore(fn);

  const changeSettings = (patch: Partial<Settings>) => update((s) => updateSettings(s, patch));

  const openInExplore = (request: ExploreRequest) => {
    setExploreRequest(request);
    setView('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">H</span>
          Harmony
        </div>
        <span className="topbar-sub">{SUBTITLES[view]}</span>
      </header>

      <nav className="tabbar" aria-label="主导航">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab${view === tab.id ? ' active' : ''}`}
              onClick={() => {
                // 手动切页时清掉跳转参数，下次进探索页回到默认的 C 大调
                setExploreRequest(null);
                setView(tab.id);
              }}
              aria-current={view === tab.id ? 'page' : undefined}
            >
              <Icon size={19} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="page">
        {view === 'explore' && (
          <ExplorePage
            settings={store.settings}
            onSettingsChange={changeSettings}
            request={exploreRequest}
          />
        )}
        {view === 'circle' && <CirclePage onOpenInExplore={openInExplore} />}
        {view === 'practice' && (
          <PracticePage
            level={level}
            onLevelChange={setLevel}
            store={store}
            update={update}
            onSettingsChange={changeSettings}
          />
        )}
        {view === 'course' && (
          <CoursePage
            store={store}
            onStartPractice={(next) => {
              setLevel(next);
              setView('practice');
            }}
            onOpenInExplore={openInExplore}
          />
        )}
        {view === 'progress' && <ProgressPage store={store} update={update} />}
      </main>
    </div>
  );
}
