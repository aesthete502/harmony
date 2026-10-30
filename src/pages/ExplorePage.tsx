import { useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../audio';
import { FretboardView, type FretInstrument } from '../components/FretboardView';
import { NoteSetPanel } from '../components/NoteSetPanel';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { IconPlay, IconStop } from '../components/Icons';
import { StaffView } from '../components/StaffView';
import {
  buildChord,
  buildInterval,
  buildScale,
  CHORD_TYPES,
  hasDoubleAccidental,
  INTERVAL_TYPES,
  inversionLabel,
  ROOTS,
  SCALE_TYPES,
  spellingOf,
} from '../theory';
import type { NoteSet } from '../theory';
import type { PlayMode, Settings } from '../storage';
import type { ExploreRequest } from '../navigation';

type Kind = 'scale' | 'chord' | 'interval';

interface Props {
  settings: Settings;
  onSettingsChange: (patch: Partial<Settings>) => void;
  /** 从五度圈等页面带过来的跳转参数 */
  request?: ExploreRequest | null;
}

const PRESETS: { label: string; kind: Kind; rootPc: number; scaleId?: string; chordId?: string; inversion?: number; intervalId?: string }[] = [
  { label: 'C 大调', kind: 'scale', rootPc: 0, scaleId: 'major' },
  { label: 'F♯ 大调', kind: 'scale', rootPc: 6, scaleId: 'major' },
  { label: 'A 自然小调', kind: 'scale', rootPc: 9, scaleId: 'minor' },
  { label: 'C 大三和弦', kind: 'chord', rootPc: 0, chordId: 'major' },
  { label: 'A 小三 第一转位', kind: 'chord', rootPc: 9, chordId: 'minor', inversion: 1 },
  { label: 'C–E 大三度', kind: 'interval', rootPc: 0, intervalId: 'M3' },
];

export function ExplorePage({ settings, onSettingsChange, request }: Props) {
  const [kind, setKind] = useState<Kind>(request?.kind ?? 'scale');
  const [rootPc, setRootPc] = useState(request?.rootPc ?? 0);
  const [rootName, setRootName] = useState<string | null>(request?.rootName ?? null);
  const [scaleId, setScaleId] = useState(request?.scaleId ?? 'major');
  const [chordId, setChordId] = useState(request?.chordId ?? 'major');
  const [inversion, setInversion] = useState(request?.inversion ?? 0);
  const [intervalId, setIntervalId] = useState(request?.intervalId ?? 'M3');
  const [view, setView] = useState<'staff' | 'fret'>('staff');
  const [fretInstrument, setFretInstrument] = useState<FretInstrument>('guitar');
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      audio.stop();
    },
    [],
  );

  const chordType = CHORD_TYPES.find((t) => t.id === chordId) ?? CHORD_TYPES[0];

  const set: NoteSet = useMemo(() => {
    if (kind === 'scale') return buildScale(rootPc, scaleId, 4, rootName ?? undefined);
    if (kind === 'chord') return buildChord(rootPc, chordId, { inversion, octave: 4, rootName: rootName ?? undefined });
    return buildInterval(60 + rootPc, intervalId, rootName ?? ROOTS[rootPc].label);
  }, [kind, rootPc, rootName, scaleId, chordId, inversion, intervalId]);

  const labels = useMemo(() => {
    const map: Record<number, string> = {};
    for (const n of set.notes) {
      map[n.midi] = settings.labelMode === 'degree' ? n.degree : n.label;
    }
    return map;
  }, [set, settings.labelMode]);

  const midis = set.notes.map((n) => n.midi);

  // 谱面保留重升/重降，这里给出一句对照，说明键盘上对应哪个键
  const doubleNotes = useMemo(
    () =>
      [...new Set(set.notes.filter((n) => hasDoubleAccidental(n.label)).map((n) => n.label))].map(
        (label) => ({ label, simple: spellingOf(label).simple }),
      ),
    [set],
  );

  const play = async (mode: PlayMode) => {
    audio.stop();
    const total = await audio.play(midis, { mode, noteMs: kind === 'chord' ? 1500 : 850 });
    setPlaying(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlaying(false), total);
  };

  const stop = () => {
    audio.stop();
    setPlaying(false);
    if (timer.current) window.clearTimeout(timer.current);
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setKind(preset.kind);
    setRootPc(preset.rootPc);
    setRootName(null);
    if (preset.scaleId) setScaleId(preset.scaleId);
    if (preset.chordId) setChordId(preset.chordId);
    if (preset.intervalId) setIntervalId(preset.intervalId);
    setInversion(preset.inversion ?? 0);
  };

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row spread">
          <span className="section-title">选择要看的对象</span>
          <div className="seg">
            <button className={kind === 'scale' ? 'active' : ''} onClick={() => setKind('scale')}>
              音阶
            </button>
            <button className={kind === 'chord' ? 'active' : ''} onClick={() => setKind('chord')}>
              和弦
            </button>
            <button className={kind === 'interval' ? 'active' : ''} onClick={() => setKind('interval')}>
              音程
            </button>
          </div>
        </div>

        <div className="row-wrap">
          <label className="field">
            <span>根音</span>
            <select
              value={rootPc}
              onChange={(e) => {
                setRootPc(Number(e.target.value));
                setRootName(null);
              }}
            >
              {ROOTS.map((r) => (
                <option key={r.pc} value={r.pc}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          {kind === 'scale' && (
            <label className="field">
              <span>音阶类型</span>
              <select value={scaleId} onChange={(e) => setScaleId(e.target.value)}>
                {SCALE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {kind === 'chord' && (
            <>
              <label className="field">
                <span>和弦类型</span>
                <select value={chordId} onChange={(e) => setChordId(e.target.value)}>
                  {CHORD_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}（{t.symbol || '大三'}）
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>转位</span>
                <select value={inversion} onChange={(e) => setInversion(Number(e.target.value))}>
                  {Array.from({ length: chordType.semitones.length }, (_, i) => (
                    <option key={i} value={i}>
                      {inversionLabel(i)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}

          {kind === 'interval' && (
            <label className="field">
              <span>音程</span>
              <select value={intervalId} onChange={(e) => setIntervalId(e.target.value)}>
                {INTERVAL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}（{t.semitones} 半音）
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="chips">
          {PRESETS.map((p) => (
            <button key={p.label} className="chip" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card keyboard-card stack">
        <NoteSetPanel
          set={set}
          showDegrees={settings.labelMode === 'degree'}
          onPlayNote={(midi) => void audio.playNote(midi)}
        />

        <PianoKeyboard
          from={48}
          to={84}
          highlighted={midis}
          labels={labels}
          showCs={settings.labelMode === 'degree'}
          onKey={(midi) => void audio.playNote(midi)}
          ariaLabel="探索：点击任意键试听"
        />

        <div className="row-wrap spread">
          <div className="row-wrap">
            <button className="btn btn-primary btn-sm" onClick={() => void play('block')}>
              <IconPlay size={15} /> 整组
            </button>
            <button className="btn btn-sm" onClick={() => void play('up')}>
              上行
            </button>
            <button className="btn btn-sm" onClick={() => void play('down')}>
              下行
            </button>
            <button className="btn btn-ghost btn-sm" onClick={stop} disabled={!playing}>
              <IconStop size={15} /> 停止
            </button>
          </div>
          <div className="seg">
            <button
              className={settings.labelMode === 'degree' ? 'active' : ''}
              onClick={() => onSettingsChange({ labelMode: 'degree' })}
            >
              级数
            </button>
            <button
              className={settings.labelMode === 'name' ? 'active' : ''}
              onClick={() => onSettingsChange({ labelMode: 'name' })}
            >
              音名
            </button>
          </div>
        </div>
      </div>

      <div className="card stack">
        <div className="row spread">
          <span className="section-title">另一个角度看</span>
          <div className="seg">
            <button className={view === 'staff' ? 'active' : ''} onClick={() => setView('staff')}>
              五线谱
            </button>
            <button className={view === 'fret' ? 'active' : ''} onClick={() => setView('fret')}>
              指板
            </button>
          </div>
        </div>

        {view === 'staff' ? (
          <>
            <StaffView notes={set.notes} stacked={set.kind !== 'scale'} />
            <p className="hint">谱面统一按 C 调记写，变音记号逐音标出，方便看清每个音被升或降在哪里。</p>
            {doubleNotes.length > 0 && (
              <p className="hint">
                谱面保留了理论拼写：
                {doubleNotes.map((d) => `${d.label} = ${d.simple}`).join('、')}
                。上面的音名标签和键盘用的是等音简化写法。
              </p>
            )}
          </>
        ) : (
          <>
            <div className="row-wrap">
              <div className="seg">
                <button
                  className={fretInstrument === 'guitar' ? 'active' : ''}
                  onClick={() => setFretInstrument('guitar')}
                >
                  吉他
                </button>
                <button
                  className={fretInstrument === 'ukulele' ? 'active' : ''}
                  onClick={() => setFretInstrument('ukulele')}
                >
                  尤克里里
                </button>
              </div>
              <button
                className="btn btn-sm"
                onClick={() => onSettingsChange({ showFretNames: !settings.showFretNames })}
              >
                {settings.showFretNames ? '只看高亮音' : '显示全部音名'}
              </button>
            </div>
            <FretboardView
              notes={set.notes}
              instrument={fretInstrument}
              showAllNames={settings.showFretNames}
              onPluck={(midi) => void audio.playNote(midi, 600)}
            />
            <p className="hint">同一个音在多个把位都能弹到。高亮的是当前音阶/和弦用到的音级。</p>
          </>
        )}
      </div>
    </div>
  );
}
