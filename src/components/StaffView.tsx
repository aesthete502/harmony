import { useEffect, useRef } from 'react';
import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow';
import type { TheoryNote } from '../theory';

interface Props {
  notes: TheoryNote[];
  /** 谱号：批 1 只做高音谱号 */
  clef?: 'treble' | 'bass';
  height?: number;
  /** true 时把这些音画成一个和弦（同时发声），false 时画成旋律（依次排列） */
  stacked?: boolean;
}

/**
 * 五线谱视图。
 * 故意不加调号（统一 C 调），每个变音记号都单独标出来，
 * 这样「构成」是显式的，初学者能直接看到哪个音被升了或降了。
 */
export function StaffView({ notes, clef = 'treble', height = 168, stacked = false }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const draw = () => {
      host.innerHTML = '';
      const noteWidth = 44;
      const width = Math.max(host.clientWidth || 320, notes.length * noteWidth + 80);

      const renderer = new Renderer(host, Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();

      const stave = new Stave(8, 24, width - 16);
      stave.addClef(clef);
      stave.setContext(ctx).draw();

      if (notes.length === 0) return;

      // 和弦/音程只画一个音簇，把它放在谱面偏左三分之一处，避免贴着谱号
      if (stacked) {
        stave.setNoteStartX(stave.getNoteStartX() + Math.max(12, (width - 120) * 0.28));
      }

      const keyOf = (n: TheoryNote) => `${n.name.toLowerCase()}/${n.octave}`;

      const staveNotes = stacked
        ? [
            new StaveNote({
              keys: notes.map(keyOf),
              duration: 'w',
              autoStem: true,
            }),
          ]
        : notes.map((n) =>
            new StaveNote({
              keys: [keyOf(n)],
              duration: 'q',
              autoStem: true,
            }),
          );

      const voice = new Voice({ numBeats: stacked ? 4 : notes.length, beatValue: 4 })
        .setStrict(false)
        .addTickables(staveNotes);

      Accidental.applyAccidentals([voice], 'C');

      new Formatter()
        .joinVoices([voice])
        .format([voice], Math.max(width - 80, stacked ? 80 : notes.length * 34));
      voice.draw(ctx, stave);
    };

    draw();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(host);
    return () => ro.disconnect();
  }, [notes, clef, height, stacked]);

  return (
    <div className="staff-host" data-stacked={stacked ? 'true' : 'false'}>
      <div ref={hostRef} />
    </div>
  );
}
