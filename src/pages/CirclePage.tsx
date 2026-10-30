import { useMemo, useState } from 'react';
import { audio } from '../audio';
import { IconPlay } from '../components/Icons';
import { KeySignatureStaff } from '../components/KeySignatureStaff';
import { NoteName } from '../components/NoteName';
import type { ExploreRequest } from '../navigation';
import { useMediaQuery } from '../useMediaQuery';
import {
  buildInterval,
  buildScale,
  CHORD_TYPES,
  INTERVAL_TYPES,
  ROOTS,
  withTheoryHints,
} from '../theory';

/**
 * 五度圈顺序（从 12 点开始顺时针）：
 * 每走一格升一个调号，到 6 点方向是 F♯ / G♭，再往右开始降号。
 */
const CIRCLE_PCS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** 只在七和弦里用到的和弦类型，单独列出来 */
const SEVENTH_TYPES = CHORD_TYPES.filter((t) => t.semitones.length === 4);
const TRIAD_TYPES = CHORD_TYPES.filter((t) => t.semitones.length === 3);

type Mode = 'major' | 'minor';

interface DiatonicChord {
  roman: string;
  label: string;
  /** 根音拼写，如 "G♯"（保留调内写法） */
  rootLabel: string;
  rootPc: number;
  chordId: string;
  midis: number[];
}

export function keySignature(notes: { name: string }[]): { sharps: number; flats: number } {
  let sharps = 0;
  let flats = 0;
  for (const n of notes) {
    for (const ch of n.name.slice(1)) {
      if (ch === '#') sharps += 1;
      else if (ch === 'b') flats += 1;
    }
  }
  return { sharps, flats };
}

function signatureText(sig: { sharps: number; flats: number }): string {
  if (sig.sharps === 0 && sig.flats === 0) return '没有升降号';
  if (sig.sharps > 0) return `${sig.sharps} 个升号`;
  return `${sig.flats} 个降号`;
}

/**
 * 由音阶推顺阶和弦：三度叠置，用半音结构反查和弦性质。
 * 小调用自然小调音阶（♭6、♭7），所以会得到 i ii° III iv v VI VII。
 */
export function diatonicChords(
  rootPc: number,
  seventh: boolean,
  mode: Mode = 'major',
  rootName?: string,
): DiatonicChord[] {
  const scale = buildScale(rootPc, mode === 'major' ? 'major' : 'minor', 4, rootName);
  const ext = [...scale.notes, ...scale.notes.map((n) => ({ ...n, midi: n.midi + 12 }))];
  const types = seventh ? SEVENTH_TYPES : TRIAD_TYPES;

  return ROMAN.map((_, i) => {
    const picked = [ext[i], ext[i + 2], ext[i + 4]];
    if (seventh) picked.push(ext[i + 6]);
    const midis = picked.map((n) => n.midi);
    const intervals = midis.map((m) => m - midis[0]);
    const type =
      types.find((t) => t.semitones.join(',') === intervals.join(',')) ??
      (seventh ? SEVENTH_TYPES[0] : TRIAD_TYPES[0]);

    const chordRootPc = ((midis[0] % 12) + 12) % 12;
    const minorish = type.id === 'minor' || type.id === 'm7';
    const diminished = type.id === 'dim' || type.id === 'dim7' || type.id === 'm7b5';
    let roman = ROMAN[i];
    if (minorish || diminished) roman = roman.toLowerCase();
    if (diminished) roman += '°';
    if (type.id === 'm7b5') roman = `${ROMAN[i].toLowerCase()}ø`;

    const symbol =
      type.id === 'dim'
        ? '°'
        : type.id === 'dim7'
          ? '°7'
          : type.id === 'm7b5'
            ? 'ø7'
            : type.symbol;

    return {
      roman,
      // 用音阶里的拼写（A 大调的第 vii 级是 G♯°，而不是 A♭°）
      label: `${ext[i].label}${symbol}`,
      rootLabel: ext[i].label,
      rootPc: chordRootPc,
      chordId: type.id,
      midis,
    };
  });
}

const INTERVAL_CHOICES = ['m3', 'M3', 'P4', 'P5', 'm6', 'M6', 'M7'];

interface Props {
  onOpenInExplore: (request: ExploreRequest) => void;
}

export function CirclePage({ onOpenInExplore }: Props) {
  /**
   * positionPc 是圈上那一格的大调主音。
   * 圈的选中位置只跟它有关；下方内容看大调还是关系小调由 mode 决定，
   * 所以切页签不会把圈挪走，调性转换的关系仍然是一整圈。
   */
  const [positionPc, setPositionPc] = useState(0);
  const [mode, setMode] = useState<Mode>('major');
  /** 宽屏时外圈放得下 12 个小谱表；窄屏改成下面的网格，避免谱表缩得看不清 */
  const wide = useMediaQuery('(min-width: 600px)');

  /** 圈的半径（相对外框的百分比）。宽屏要把位置让给最外面的调号环。 */
  const majorR = wide ? 30 : 39;
  const minorR = wide ? 20.5 : 26;
  const staffR = 45;

  const majorScale = useMemo(() => buildScale(positionPc, 'major', 4), [positionPc]);
  const majorLabel = ROOTS[positionPc].label;
  const minorLabel = `${majorScale.notes[5].label}m`;
  const minorPc = (positionPc + 9) % 12;

  const rootPc = mode === 'major' ? positionPc : minorPc;
  const rootName = mode === 'major' ? majorLabel : majorScale.notes[5].label;
  const relativeLabel = mode === 'major' ? minorLabel : majorLabel;

  const scale = useMemo(
    () => buildScale(rootPc, mode === 'major' ? 'major' : 'minor', 4, rootName),
    [rootPc, mode, rootName],
  );
  const sig = useMemo(() => keySignature(scale.notes), [scale]);
  const triads = useMemo(
    () => diatonicChords(rootPc, false, mode, rootName),
    [rootPc, mode, rootName],
  );
  const sevenths = useMemo(
    () => diatonicChords(rootPc, true, mode, rootName),
    [rootPc, mode, rootName],
  );

  const circleKeys = CIRCLE_PCS.map((pc, i) => {
    const s = buildScale(pc, 'major', 4);
    const sSig = keySignature(s.notes);
    const angle = (i / CIRCLE_PCS.length) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    return {
      pc,
      majorLabel: ROOTS[pc].label,
      minorLabel: `${s.notes[5].label}m`,
      // VexFlow 的调号写法：C / F# / Ab
      keySpec: ROOTS[pc].label.replace('♯', '#').replace('♭', 'b'),
      accText: sSig.sharps > 0 ? `${sSig.sharps}♯` : sSig.flats > 0 ? `${sSig.flats}♭` : '',
      left: 50 + sin * majorR,
      top: 50 - cos * majorR,
      minorLeft: 50 + sin * minorR,
      minorTop: 50 - cos * minorR,
      staffLeft: 50 + sin * staffR,
      staffTop: 50 - cos * staffR,
    };
  });

  const play = (midis: number[], playMode: 'block' | 'up' = 'block') => {
    void audio.play(midis, { mode: playMode, noteMs: playMode === 'block' ? 1400 : 700 });
  };

  const openScale = () =>
    onOpenInExplore({
      nonce: Date.now(),
      kind: 'scale',
      rootPc,
      rootName: scale.rootName,
      scaleId: mode === 'major' ? 'major' : 'minor',
    });

  const openChord = (chord: DiatonicChord) =>
    onOpenInExplore({
      nonce: Date.now(),
      kind: 'chord',
      rootPc: chord.rootPc,
      rootName: chord.rootLabel,
      chordId: chord.chordId,
      inversion: 0,
    });

  const openInterval = (intervalId: string) =>
    onOpenInExplore({
      nonce: Date.now(),
      kind: 'interval',
      rootPc,
      rootName: scale.rootName,
      intervalId,
    });

  const tonicMidi = scale.rootMidi;

  return (
    <div className="stack">
      <div className="card stack">
        <div className="row spread">
          <span className="section-title">五度圈</span>
          <span className="badge">顺时针升号 +1，逆时针降号 +1</span>
        </div>

        <div className="circle-wrap">
          <svg className="circle-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={majorR} />
            <circle cx="50" cy="50" r={minorR} />
          </svg>

          {circleKeys.map((k) => (
            <button
              key={`minor-${k.pc}`}
              type="button"
              className={`circle-minor${
                mode === 'minor' && positionPc === k.pc ? ' on' : ''
              }`}
              style={{ left: `${k.minorLeft}%`, top: `${k.minorTop}%` }}
              onClick={() => {
                setPositionPc(k.pc);
                setMode('minor');
              }}
              title={`${k.minorLabel} 小调：和 ${k.majorLabel} 大调同调号`}
            >
              {k.minorLabel}
            </button>
          ))}

          {circleKeys.map((k) => (
            <button
              key={k.pc}
              type="button"
              className={`circle-key${
                mode === 'major' && positionPc === k.pc ? ' on' : ''
              }`}
              style={{ left: `${k.left}%`, top: `${k.top}%` }}
              onClick={() => {
                setPositionPc(k.pc);
                setMode('major');
              }}
              aria-pressed={mode === 'major' && positionPc === k.pc}
              title={`${k.majorLabel} 大调${
                k.accText
                  ? ` · ${k.accText.replace('♯', ' 个升号').replace('♭', ' 个降号')}`
                  : ' · 没有升降号'
              }`}
            >
              <span className="ck-name">{k.majorLabel}</span>
              {k.accText && <span className="ck-acc">{k.accText}</span>}
            </button>
          ))}

          {wide &&
            circleKeys.map((k) => {
              const active = positionPc === k.pc;
              const accText = k.accText
                ? k.accText.replace('♯', ' 个升号').replace('♭', ' 个降号')
                : '没有升降号';
              return (
                <button
                  key={`sig-${k.pc}`}
                  type="button"
                  className={`sig-slot${active ? ' on' : ''}`}
                  style={{ left: `${k.staffLeft}%`, top: `${k.staffTop}%` }}
                  onClick={() => {
                    setPositionPc(k.pc);
                    setMode('major');
                  }}
                  aria-label={`${k.majorLabel} 大调调号：${accText}`}
                  aria-pressed={active}
                  title={`${k.majorLabel} 大调 / ${k.minorLabel} 小调 · ${accText}（高音谱）`}
                >
                  <KeySignatureStaff keySpec={k.keySpec} height={60} />
                </button>
              );
            })}

          <div className="circle-center">
            <span className="cc-key">
              {scale.rootName} {mode === 'major' ? '大调' : '小调'}
            </span>
            <span className="cc-sub">
              {sig.sharps > 0 ? `${sig.sharps}♯` : sig.flats > 0 ? `${sig.flats}♭` : '0'}
            </span>
          </div>
        </div>

        {!wide && (
          <div className="sig-grid-wrap">
            <div className="section-title">各调调号（高音谱）</div>
            <div className="sig-grid">
              {circleKeys.map((k) => {
                const active = positionPc === k.pc;
                return (
                  <button
                    key={`sig-cell-${k.pc}`}
                    type="button"
                    className={`sig-cell${active ? ' on' : ''}`}
                    onClick={() => {
                      setPositionPc(k.pc);
                      setMode('major');
                    }}
                    aria-pressed={active}
                    title={`${k.majorLabel} 大调 / ${k.minorLabel} 小调`}
                  >
                    <span className="sig-cell-label">
                      <b>{k.majorLabel}</b>
                      <span className="muted">{k.minorLabel}</span>
                      {k.accText && <span className="sig-cell-acc">{k.accText}</span>}
                    </span>
                    <KeySignatureStaff keySpec={k.keySpec} height={44} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <p className="hint">
          {wide
            ? '最外圈的小五线谱是高音谱调号，可以直接对照每个调升/降哪些音；点谱表也能选中该调。'
            : '外圈是五度圈；手机屏幕放不下 12 个小谱表，调号在下面按同样的顺序排成网格。'}
          点外圈的大调看大调内容，点内圈的关系小调看小调内容。
        </p>
      </div>

      <div className="card stack">
        <div className="row spread">
          <div style={{ fontWeight: 650, fontSize: 16 }}>
            {scale.rootName} {mode === 'major' ? '大调' : '小调'}
          </div>
          <div className="seg">
            <button className={mode === 'major' ? 'active' : ''} onClick={() => setMode('major')}>
              大调
            </button>
            <button className={mode === 'minor' ? 'active' : ''} onClick={() => setMode('minor')}>
              小调
            </button>
          </div>
        </div>

        <div className="row spread">
          <div className="small muted">
            {signatureText(sig)} · 关系{mode === 'major' ? '小调' : '大调'} {relativeLabel}
          </div>
          <button className="btn btn-sm" onClick={openScale}>
            在探索页打开
          </button>
        </div>

        <div className="degree-row">
          {scale.notes.map((n) => (
            <button
              key={n.midi}
              className={`note-pill${n.isRoot ? ' root' : ''}`}
              onClick={() => play([n.midi])}
              title={`试听 ${n.label}`}
              style={{ cursor: 'pointer' }}
            >
              <span className="deg">{n.degree}</span>
              <span className="nm">
                <NoteName name={n.label} />
              </span>
            </button>
          ))}
        </div>

        <button className="btn btn-sm" onClick={() => play(scale.notes.map((n) => n.midi), 'up')}>
          <IconPlay size={14} /> 听整个音阶
        </button>

        <div className="section-title" style={{ marginTop: 4 }}>
          顺阶三和弦{mode === 'minor' ? '（自然小调）' : ''}
        </div>
        <div className="chord-grid">
          {triads.map((c) => (
            <div className="chord-tile" key={`t-${c.roman}`}>
              <button className="tile-main" onClick={() => openChord(c)} title="在探索页打开">
                <span className="tile-roman">{c.roman}</span>
                <span className="tile-name">{c.label}</span>
              </button>
              <button
                className="tile-play"
                onClick={() => play(c.midis)}
                aria-label={`试听 ${c.label}`}
                title="试听"
              >
                <IconPlay size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>
          顺阶七和弦{mode === 'minor' ? '（自然小调）' : ''}
        </div>
        <div className="chord-grid">
          {sevenths.map((c) => (
            <div className="chord-tile" key={`s-${c.roman}`}>
              <button className="tile-main" onClick={() => openChord(c)} title="在探索页打开">
                <span className="tile-roman">{c.roman}</span>
                <span className="tile-name">{c.label}</span>
              </button>
              <button
                className="tile-play"
                onClick={() => play(c.midis)}
                aria-label={`试听 ${c.label}`}
                title="试听"
              >
                <IconPlay size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="section-title" style={{ marginTop: 4 }}>
          主音 {scale.rootName} 上的常用音程
        </div>
        <div className="chord-grid">
          {INTERVAL_CHOICES.map((id) => {
            const type = INTERVAL_TYPES.find((t) => t.id === id);
            if (!type) return null;
            const set = buildInterval(tonicMidi, id, scale.rootName);
            return (
              <div className="chord-tile" key={id}>
                <button
                  className="tile-main interval-main"
                  onClick={() => openInterval(id)}
                  title="在探索页打开"
                >
                  <span className="tile-roman">{type.short}</span>
                  <span className="interval-text">
                    <span className="tile-name">{type.label}</span>
                    <span className="tile-notes">
                      {withTheoryHints(set.notes.map((n) => n.label).join('–'))}
                    </span>
                  </span>
                </button>
                <button
                  className="tile-play"
                  onClick={() => play(set.notes.map((n) => n.midi), 'up')}
                  aria-label={`试听 ${type.label}`}
                  title="试听"
                >
                  <IconPlay size={13} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="hint">
          点名字跳到探索页（可以换成五线谱或指板），点右侧 ▷ 只播放。音程按上行播放。
        </p>
      </div>
    </div>
  );
}
