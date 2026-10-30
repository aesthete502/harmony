import { useEffect, useMemo, useRef, useState } from 'react';
import { chroma, isBlackKey, midiToPretty, octaveOf, spellingOf } from '../theory';

export interface KeyboardResult {
  correct: number[];
  wrong: number[];
  missed: number[];
}

interface Props {
  from: number;
  to: number;
  /** 作为题面/答案高亮的音 */
  highlighted?: number[];
  /** 用户已选的音 */
  selected?: number[];
  result?: KeyboardResult | null;
  /** midi -> 显示文字（音级或音名） */
  labels?: Record<number, string>;
  /** 是否在白键上标出所有 C */
  showCs?: boolean;
  onKey?: (midi: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
  /** 每个白键的最小宽度（px），算出来更窄时才会横向滚动 */
  minKeyWidth?: number;
}

export function PianoKeyboard({
  from,
  to,
  highlighted = [],
  selected = [],
  result = null,
  labels,
  showCs = true,
  onKey,
  disabled = false,
  ariaLabel = '钢琴键盘',
  minKeyWidth = 28,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(0);
  const [tapped, setTapped] = useState<number | null>(null);
  const tapTimer = useRef<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWrapWidth(Math.round(el.clientWidth));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (tapTimer.current) window.clearTimeout(tapTimer.current);
    },
    [],
  );

  /** 点键时给对方一个暖色闪光，和「常亮高亮」以及判题颜色区分开 */
  const flash = (midi: number) => {
    setTapped(midi);
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    tapTimer.current = window.setTimeout(() => setTapped(null), 340);
  };

  const { whites, blacks } = useMemo(() => {
    const whiteList: number[] = [];
    for (let m = from; m <= to; m++) if (!isBlackKey(m)) whiteList.push(m);

    const indexOf = new Map(whiteList.map((m, i) => [m, i]));
    const blackList: { midi: number; leftPct: number; widthPct: number }[] = [];
    const whiteWidth = 100 / whiteList.length;
    const blackWidth = whiteWidth * 0.62;

    for (let m = from; m <= to; m++) {
      if (!isBlackKey(m)) continue;
      const leftWhiteIndex = indexOf.get(m - 1);
      if (leftWhiteIndex === undefined) continue;
      blackList.push({
        midi: m,
        leftPct: (leftWhiteIndex + 1) * whiteWidth - blackWidth / 2,
        widthPct: blackWidth,
      });
    }
    return { whites: whiteList, blacks: blackList };
  }, [from, to]);

  const highlightedSet = useMemo(() => new Set(highlighted), [highlighted]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const correctSet = useMemo(() => new Set(result?.correct ?? []), [result]);
  const wrongSet = useMemo(() => new Set(result?.wrong ?? []), [result]);
  const missedSet = useMemo(() => new Set(result?.missed ?? []), [result]);

  const classesFor = (midi: number, black: boolean) => {
    const cls = ['key', black ? 'black' : 'white'];
    if (highlightedSet.has(midi)) cls.push('on');
    if (selectedSet.has(midi)) cls.push('on');
    if (correctSet.has(midi)) cls.push('correct');
    if (wrongSet.has(midi)) cls.push('wrong');
    if (missedSet.has(midi)) cls.push('missed');
    // 点击闪光优先于上面所有状态
    if (tapped === midi) cls.push('tapped');
    return cls.join(' ');
  };

  const labelFor = (midi: number) => {
    const custom = labels?.[midi];
    // 键面窄，重升/重降只显示等音简化写法，理论拼写在 title 里
    if (custom) return spellingOf(custom).simple;
    if (showCs && !isBlackKey(midi) && chroma(midi) === 0) return `C${octaveOf(midi)}`;
    return '';
  };

  const theoryFor = (midi: number) => spellingOf(labels?.[midi] ?? '').theory;

  const handle = (midi: number) => {
    if (disabled) return;
    flash(midi);
    onKey?.(midi);
  };

  // 先尽量铺满容器，太窄时退回最小可点宽度（小屏可横向滚动）
  const fitWidth = wrapWidth > 0 ? wrapWidth / whites.length : minKeyWidth;
  const whiteKeyWidth = Math.max(minKeyWidth, Math.min(56, fitWidth));
  const totalWidth = whites.length * whiteKeyWidth;
  const offset = wrapWidth > 0 ? Math.max(0, (wrapWidth - totalWidth) / 2) : 0;

  // 键盘比屏幕宽时，把题面高亮的音滚到可见区域中间
  const lastScroll = useRef<number | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || wrapWidth === 0 || totalWidth <= wrapWidth) return;
    const focus = highlighted.find((m) => m >= from && m <= to);
    if (focus === undefined) return;
    const whiteIndex = whites.filter((m) => m < focus).length;
    const target = offset + whiteIndex * whiteKeyWidth + whiteKeyWidth / 2 - wrapWidth / 2;
    const next = Math.max(0, Math.min(target, totalWidth - wrapWidth));
    if (lastScroll.current === next) return;
    lastScroll.current = next;
    el.scrollTo({ left: next, behavior: 'smooth' });
  }, [highlighted, from, to, wrapWidth, totalWidth, whiteKeyWidth, offset, whites]);

  const scrollable = wrapWidth > 0 && totalWidth > wrapWidth + 2;

  return (
    <div className="keyboard-outer">
      <div className="keyboard-wrap" ref={wrapRef}>
        <div
          className="keyboard"
          style={{ width: totalWidth, marginLeft: offset }}
          role="group"
          aria-label={ariaLabel}
        >
        <div className="whites">
          {whites.map((midi) => (
            <button
              key={midi}
              type="button"
              className={classesFor(midi, false)}
              aria-label={midiToPretty(midi)}
              aria-pressed={selectedSet.has(midi) || highlightedSet.has(midi)}
              title={theoryFor(midi) ? `理论拼写 ${theoryFor(midi)}` : undefined}
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault();
                handle(midi);
              }}
            >
              <span className="key-label">{labelFor(midi)}</span>
            </button>
          ))}
        </div>
        {blacks.map(({ midi, leftPct, widthPct }) => (
          <button
            key={midi}
            type="button"
            className={classesFor(midi, true)}
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            aria-label={midiToPretty(midi)}
            aria-pressed={selectedSet.has(midi) || highlightedSet.has(midi)}
            title={theoryFor(midi) ? `理论拼写 ${theoryFor(midi)}` : undefined}
            disabled={disabled}
            onPointerDown={(e) => {
              e.preventDefault();
              handle(midi);
            }}
          >
            <span className="key-label">{labelFor(midi)}</span>
          </button>
        ))}
        </div>
      </div>
      {scrollable && <p className="keyboard-hint">键盘可以左右滑动，查看其余的音</p>}
    </div>
  );
}
