import { useMemo, useState } from 'react';
import { audio } from '../audio';
import { IconPlay } from '../components/Icons';
import { NoteSetPanel } from '../components/NoteSetPanel';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { StaffView } from '../components/StaffView';
import { keyboardRange, resolveFigure } from '../content/figure';
import type { Lesson, LessonFigure, LessonQuizItem } from '../content/lessons';
import type { ExploreRequest } from '../navigation';
import { withTheoryHints } from '../theory';

interface Props {
  lesson: Lesson;
  /** L5–L9 的练习还没开放，讲义可以先读 */
  canPractice: boolean;
  onBack: () => void;
  onPractice: () => void;
  onOpenInExplore: (request: ExploreRequest) => void;
}

function FigureCard({
  fig,
  onOpenInExplore,
}: {
  fig: LessonFigure;
  onOpenInExplore: (request: ExploreRequest) => void;
}) {
  const r = useMemo(() => resolveFigure(fig), [fig]);
  const [playing, setPlaying] = useState(false);
  const range = useMemo(() => keyboardRange(r.midis), [r.midis]);

  const play = async () => {
    setPlaying(true);
    if (r.progression) {
      const ms = await audio.playSequence(
        r.progression.map((c) => c.midis),
        { bpm: 88, beatsPerChord: 2 },
      );
      window.setTimeout(() => setPlaying(false), ms);
      return;
    }
    const ms = await audio.play(r.midis, { mode: r.mode, noteMs: r.mode === 'up' ? 520 : 1200, gapMs: 260 });
    window.setTimeout(() => setPlaying(false), ms);
  };

  return (
    <div className="card stack">
      <div className="row spread">
        <div className="grow">
          <div style={{ fontWeight: 650, fontSize: 16 }}>{r.label}</div>
        </div>
        <button className="btn btn-sm" onClick={() => void play()} disabled={playing}>
          <IconPlay size={14} /> {playing ? '播放中' : '试听'}
        </button>
      </div>

      {r.set && <NoteSetPanel set={r.set} hideTitle />}

      {r.progression ? (
        <div className="progression-row">
          {r.progression.map((c, i) => (
            <button
              key={`${c.roman}-${i}`}
              type="button"
              className="progression-step"
              onClick={() => void audio.play(c.midis, { mode: 'block', noteMs: 900 })}
              title={`试听 ${c.name}`}
            >
              <span className="roman">{c.roman}</span>
              <span className="chord">{withTheoryHints(c.name)}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <StaffView notes={r.notes} stacked={r.stacked} />
          <PianoKeyboard
            from={range[0]}
            to={range[1]}
            highlighted={r.midis}
            onKey={(midi) => void audio.playNote(midi)}
            ariaLabel={`${r.label} 键盘`}
            minKeyWidth={26}
          />
        </>
      )}

      <p className="hint">{withTheoryHints(r.caption)}</p>

      {r.explore && (
        <div className="row">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => onOpenInExplore({ nonce: Date.now(), ...r.explore! })}
          >
            在探索页打开
          </button>
        </div>
      )}
    </div>
  );
}

function Quiz({ items }: { items: LessonQuizItem[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => items.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const right = picked.filter((p, i) => p !== null && p === items[i].correct).length;

  return (
    <div className="stack">
      <div className="row spread">
        <span className="section-title">自测</span>
        <span className="small muted">
          {answered === 0 ? `${items.length} 题` : `答对 ${right} / ${items.length}`}
        </span>
      </div>

      {items.map((item, i) => {
        const choice = picked[i];
        const done = choice !== null;
        return (
          <div className="card stack" key={item.question}>
            <div style={{ fontWeight: 600 }}>{`${i + 1}. ${item.question}`}</div>
            <div className="choices">
              {item.choices.map((text, j) => {
                const cls = done
                  ? j === item.correct
                    ? 'choice correct'
                    : choice === j
                      ? 'choice wrong'
                      : 'choice'
                  : 'choice';
                return (
                  <button
                    key={text}
                    type="button"
                    className={cls}
                    disabled={done}
                    onClick={() =>
                      setPicked((prev) => prev.map((p, k) => (k === i ? j : p)))
                    }
                  >
                    {text}
                  </button>
                );
              })}
            </div>
            {done && (
              <div className={`feedback ${choice === item.correct ? 'ok' : 'bad'}`}>
                <div className="fb-title">{choice === item.correct ? '答对了' : '答错了'}</div>
                <div>{item.why}</div>
              </div>
            )}
          </div>
        );
      })}

      {answered > 0 && (
        <div className="row">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setPicked(items.map(() => null))}
          >
            重做自测
          </button>
        </div>
      )}
    </div>
  );
}

export function LessonPage({ lesson, canPractice, onBack, onPractice, onOpenInExplore }: Props) {
  return (
    <div className="stack">
      <div className="row spread">
        <button className="btn btn-sm btn-ghost" onClick={onBack}>
          ← 课程
        </button>
        <button className="btn btn-sm btn-primary" onClick={onPractice} disabled={!canPractice}>
          {canPractice ? '去练习' : '练习待开放'}
        </button>
      </div>

      <div className="card stack">
        <div className="row-wrap" style={{ gap: 8 }}>
          <span className="badge accent">L{lesson.level}</span>
          <span className="small muted">{lesson.title}</span>
        </div>
        <div className="question">{lesson.oneLine}</div>
      </div>

      {lesson.sections.map((section) => (
        <div className="card stack" key={section.heading}>
          <span className="section-title">{section.heading}</span>
          <div className="prose">
            {section.body.map((p, i) => (
              <p key={i}>{withTheoryHints(p)}</p>
            ))}
          </div>
        </div>
      ))}

      <FigureCard fig={lesson.figure} onOpenInExplore={onOpenInExplore} />
      {lesson.contrast && <FigureCard fig={lesson.contrast} onOpenInExplore={onOpenInExplore} />}

      <Quiz items={lesson.quiz} />
    </div>
  );
}
