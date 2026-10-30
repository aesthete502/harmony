import { useEffect, useMemo, useState } from 'react';
import { audio } from '../audio';
import { IconPlay } from '../components/Icons';
import { PianoKeyboard } from '../components/PianoKeyboard';
import { LEVELS, levelMeta } from '../content/levels';
import { createSession } from '../quiz/generators';
import { checkAnswer } from '../quiz/types';
import type { Question, TaskKind } from '../quiz/types';
import { levelAccuracy, recordAnswer, recordSession, type Store } from '../storage';
import { midiToPretty, withTheoryHints } from '../theory';

const KIND_LABELS: Record<TaskKind, string> = {
  'name-to-key': '找到这个键',
  'key-to-name': '这个键叫什么',
  'build-scale': '构音阶',
  'scale-degree': '找音级',
  'scale-membership': '调内音判断',
  'build-interval': '构音程',
  'identify-interval': '认音程',
  'invert-interval': '音程转位',
  'build-chord': '构和弦',
  'identify-chord': '认和弦性质',
  'identify-root': '找根音',
  'identify-inversion': '认转位',
};

const DEFAULT_SESSION_SIZE = 10;

interface Props {
  level: number;
  onLevelChange: (level: number) => void;
  store: Store;
  update: (fn: (s: Store) => Store) => void;
  onSettingsChange: (patch: Partial<Store['settings']>) => void;
}

function resultFor(question: Question, selected: number[]) {
  const expected = question.expectedKeys ?? [];
  return {
    correct: selected.filter((k) => expected.includes(k)),
    wrong: selected.filter((k) => !expected.includes(k)),
    missed: expected.filter((k) => !selected.includes(k)),
  };
}

export function PracticePage({ level, onLevelChange, store, update, onSettingsChange }: Props) {
  const [session, setSession] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [choice, setChoice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredTotal, setAnsweredTotal] = useState(0);
  const [done, setDone] = useState(false);

  const meta = levelMeta(level);
  const accuracy = levelAccuracy(store, level);
  const stat = store.levels[String(level)];
  const question = session?.[index] ?? null;
  const sessionSize = store.settings.sessionSize;
  const endless = sessionSize === 0;

  const reset = () => {
    setSelected([]);
    setChoice(null);
    setRevealed(false);
    setLastCorrect(false);
  };

  const start = () => {
    setSession(createSession(level, endless ? DEFAULT_SESSION_SIZE : sessionSize));
    setIndex(0);
    setCorrectCount(0);
    setAnsweredTotal(0);
    setDone(false);
    reset();
  };

  useEffect(() => {
    setSession(null);
    setIndex(0);
    setCorrectCount(0);
    setAnsweredTotal(0);
    setDone(false);
    reset();
  }, [level]);

  const finish = (ok: boolean, keys: number[], picked: string | null) => {
    setSelected(keys);
    setChoice(picked);
    setRevealed(true);
    setLastCorrect(ok);
    update((s) => recordAnswer(s, level, ok));
    if (ok) setCorrectCount((n) => n + 1);
  };

  const submitKeys = (keys: number[]) => {
    if (!question || revealed) return;
    finish(checkAnswer(question, keys, null), keys, null);
  };

  const handleKey = (midi: number) => {
    if (!question || revealed) return;
    void audio.playNote(midi, 500);
    if (question.answerMode !== 'keys') return;
    const expected = question.expectedKeys ?? [];
    if (expected.length === 1) {
      finish(checkAnswer(question, [midi], null), [midi], null);
      return;
    }
    setSelected((prev) => (prev.includes(midi) ? prev.filter((m) => m !== midi) : [...prev, midi]));
  };

  const handleChoice = (value: string) => {
    if (!question || revealed) return;
    finish(checkAnswer(question, [], value), [], value);
  };

  const finishSession = (total: number) => {
    if (total <= 0) return;
    update((s) => recordSession(s, level, total, correctCount));
    setAnsweredTotal(total);
    setDone(true);
  };

  const next = () => {
    if (!session) return;
    if (!endless && index >= session.length - 1) {
      finishSession(session.length);
      return;
    }
    if (endless && index >= session.length - 1) {
      // 不限题数：一次多生成 10 题，题目是现算的，不会重复用旧题
      setSession([
        ...session,
        ...createSession(level, DEFAULT_SESSION_SIZE, session[session.length - 1]?.kind),
      ]);
    }
    setIndex((i) => i + 1);
    reset();
  };

  const answerLabels = useMemo(() => {
    if (!revealed || !question?.expectedKeys) return undefined;
    if (question.revealLabels) return question.revealLabels;
    const map: Record<number, string> = {};
    for (const midi of question.expectedKeys) map[midi] = midiToPretty(midi);
    return map;
  }, [revealed, question]);

  const levelChips = (
    <div className="card stack">
      <div className="row spread">
        <span className="section-title">选择关卡</span>
        {stat && (
          <span className="badge">
            {stat.attempts} 题 · {accuracy ? Math.round(accuracy * 100) : 0}%
          </span>
        )}
      </div>
      <div className="row-wrap">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            className={`chip${l.id === level ? ' active' : ''}`}
            disabled={!l.ready}
            title={l.ready ? l.goal : '批 2 开放'}
            onClick={() => onLevelChange(l.id)}
          >
            L{l.id} {l.title}
            {!l.ready && ' · 待开放'}
          </button>
        ))}
      </div>
    </div>
  );

  if (!session) {
    return (
      <div className="stack">
        {levelChips}
        <div className="card stack">
          <div>
            <div className="question">L{level} {meta?.title}</div>
            <p className="small muted" style={{ marginTop: 4 }}>
              {meta?.goal}
            </p>
          </div>
          <div className="row-wrap">
            <span className="badge">{endless ? '不限题数' : `一组 ${sessionSize} 题`}</span>
            <span className="badge">通关需累计 {meta?.required} 题 · 正确率 85%</span>
            {stat && <span className="badge ok">已练 {stat.attempts} 题</span>}
          </div>
          <div className="row spread">
            <span className="small muted">本组题数</span>
            <div className="seg">
              {[10, 20, 0].map((n) => (
                <button
                  key={n}
                  className={sessionSize === n ? 'active' : ''}
                  onClick={() => onSettingsChange({ sessionSize: n })}
                >
                  {n === 0 ? '不限' : `${n} 题`}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={start}>
            开始练习
          </button>
          <p className="hint">
            题目是即时随机的，不设题库上限：同一组里不会连续考同一种题型，重开一组就是新题。
            构成题多点几个键再提交，识别题直接点选项，答完会显示答案和构成解释。
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    const total = answeredTotal || session.length;
    const rate = Math.round((correctCount / total) * 100);
    return (
      <div className="stack">
        {levelChips}
        <div className="card stack" style={{ alignItems: 'center', textAlign: 'center' }}>
          <span className="section-title">{endless ? '本轮结束' : '本组完成'}</span>
          <div className="result-score">
            {correctCount}/{total}
          </div>
          <p className="muted small">正确率 {rate}%</p>
          <div className="row-wrap" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={start}>
              再来一组
            </button>
            <button
              className="btn"
              onClick={() => onLevelChange(level + 1)}
              disabled={!LEVELS.some((l) => l.id === level + 1 && l.ready)}
            >
              下一关
            </button>
          </div>
          <p className="hint">
            累计正确率达标后，这一关会在课程页显示为已通关。错题会在批 2 进入错题本。
          </p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const result = revealed && question.answerMode === 'keys' ? resultFor(question, selected) : null;
  const expectedText =
    question.answerMode === 'choice'
      ? question.correctChoice
      : withTheoryHints(
          (question.expectedKeys ?? [])
            .map((midi) => question.revealLabels?.[midi] ?? midiToPretty(midi))
            .join('、'),
        );

  return (
    <div className="stack">
      {levelChips}

      <div className="card stack">
        <div className="row spread">
          <span className="badge accent">{KIND_LABELS[question.kind]}</span>
          <span className="tiny muted">
            第 {index + 1} 题{endless ? ' · 不限题数' : ` / ${session.length}`} · 答对 {correctCount}
          </span>
        </div>
        {endless ? (
          <div className="row spread">
            <span className="tiny muted">做完这道可以继续，也可以随时结束</span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => finishSession(index + (revealed ? 1 : 0))}
              disabled={index === 0 && !revealed}
            >
              结束本组
            </button>
          </div>
        ) : (
          <div className="quiz-progress">
            <div style={{ width: `${(index / session.length) * 100}%` }} />
          </div>
        )}

        <div className="question">{question.prompt}</div>
        {question.hint && !revealed && <p className="hint">{question.hint}</p>}

        {(question.answerMode === 'keys' || (question.highlight?.length ?? 0) > 0) && (
          <PianoKeyboard
            from={question.keyRange[0]}
            to={question.keyRange[1]}
            highlighted={question.highlight}
            selected={question.answerMode === 'keys' ? selected : []}
            result={result}
            labels={answerLabels}
            onKey={handleKey}
            disabled={revealed}
            ariaLabel="答题键盘"
          />
        )}

        {question.answerMode === 'keys' && (
          <div className="row spread">
            <span className="tiny muted">
              已选 {selected.length} 个
              {question.expectedKeys ? ` / 需要 ${question.expectedKeys.length} 个` : ''}
            </span>
            <div className="row-wrap">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelected([])}
                disabled={revealed || selected.length === 0}
              >
                清空
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => submitKeys(selected)}
                disabled={revealed || selected.length === 0}
              >
                提交
              </button>
            </div>
          </div>
        )}

        {question.answerMode === 'choice' && question.choices && (
          <div className="choices">
            {question.choices.map((c) => {
              const cls = ['choice'];
              if (revealed) {
                if (c === question.correctChoice) cls.push('correct');
                else if (c === choice) cls.push('wrong');
              } else if (c === choice) {
                cls.push('picked');
              }
              return (
                <button key={c} className={cls.join(' ')} onClick={() => handleChoice(c)} disabled={revealed}>
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {revealed && (
          <div className={`feedback ${lastCorrect ? 'ok' : 'bad'}`}>
            <div className="fb-title">{lastCorrect ? '答对了' : '答错了'}</div>
            {!lastCorrect && question.answerMode === 'keys' && (
              <div>
                正确答案：<b>{expectedText}</b>
              </div>
            )}
            <div>{withTheoryHints(question.explanation)}</div>
          </div>
        )}

        <div className="row spread">
          <button
            className="btn btn-sm"
            onClick={() => question.playMidis && void audio.play(question.playMidis, { mode: 'up', noteMs: 700 })}
            disabled={!question.playMidis}
          >
            <IconPlay size={14} /> 听一下
          </button>
          {revealed ? (
            <button className="btn btn-primary" onClick={next}>
              {!endless && index >= session.length - 1 ? '查看结果' : '下一题'}
            </button>
          ) : (
            <span className="tiny muted">作答后显示解析</span>
          )}
        </div>
      </div>
    </div>
  );
}
