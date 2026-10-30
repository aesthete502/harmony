import { midiToPitchLabel } from '../theory';
import type { TheoryNote } from '../theory';

export type FretInstrument = 'guitar' | 'ukulele';

interface Tuning {
  label: string;
  /** 从高音弦到低音弦，与谱面/指板显示顺序一致 */
  strings: { midi: number; label: string }[];
}

export const TUNINGS: Record<FretInstrument, Tuning> = {
  guitar: {
    label: '吉他（标准调弦）',
    strings: [
      { midi: 64, label: 'E' },
      { midi: 59, label: 'B' },
      { midi: 55, label: 'G' },
      { midi: 50, label: 'D' },
      { midi: 45, label: 'A' },
      { midi: 40, label: 'E' },
    ],
  },
  ukulele: {
    label: '尤克里里（标准调弦）',
    strings: [
      { midi: 67, label: 'G' },
      { midi: 60, label: 'C' },
      { midi: 64, label: 'E' },
      { midi: 69, label: 'A' },
    ],
  },
};

interface Props {
  notes?: TheoryNote[];
  instrument: FretInstrument;
  onPluck?: (midi: number) => void;
  maxFret?: number;
  /** false 时只在被高亮的音上显示音名 */
  showAllNames?: boolean;
}

/** 指板音位图：同一个音在多个把位出现，这是它和键盘最大的不同 */
export function FretboardView({
  notes = [],
  instrument,
  onPluck,
  maxFret = 12,
  showAllNames = true,
}: Props) {
  const tuning = TUNINGS[instrument];
  const degreeByPc = new Map<number, string>();
  let rootPc: number | null = null;
  for (const n of notes) {
    degreeByPc.set(n.pc, n.degree);
    if (n.isRoot) rootPc = n.pc;
  }

  const frets = Array.from({ length: maxFret + 1 }, (_, i) => i);

  return (
    <div className="fret-scroll">
      <div className="fretboard">
        <div className="fret-strings">
          {tuning.strings.map((str) => (
            <div className="fret-row" key={str.midi}>
              <div className="fret-open">{str.label}</div>
              <div className="fret-cells">
                {frets.map((fret) => {
                  const midi = str.midi + fret;
                  const pc = ((midi % 12) + 12) % 12;
                  const marked = degreeByPc.has(pc);
                  const isRoot = rootPc !== null && pc === rootPc;
                  const cls = ['fret-cell', fret === 0 ? 'nut' : '', marked ? 'on' : '', isRoot ? 'root' : '']
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={fret}
                      type="button"
                      className={cls}
                      onClick={() => onPluck?.(midi)}
                      aria-label={`${str.label} 弦第 ${fret} 品 ${midiToPitchLabel(midi)}`}
                      title={marked ? (degreeByPc.get(pc) ?? '') : undefined}
                    >
                      {marked ? (
                        <span className="fret-deg">{degreeByPc.get(pc)}</span>
                      ) : showAllNames ? (
                        midiToPitchLabel(midi)
                      ) : (
                        ''
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="fret-nums">
          {frets.map((fret) => (
            <div className="fret-num" key={fret}>
              {fret === 0 ? '0' : fret}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
