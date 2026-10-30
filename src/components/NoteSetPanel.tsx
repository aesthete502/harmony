import { withTheoryHints, type NoteSet } from '../theory';
import { NoteName } from './NoteName';

interface Props {
  set: NoteSet;
  /** 级数 or 音名，指的是标签下方的第二行 */
  showDegrees?: boolean;
  /** 传入后每个音变成可点的试听按钮 */
  onPlayNote?: (midi: number) => void;
  /** 外面已经有标题时（比如讲义卡片）不再重复显示 set.title */
  hideTitle?: boolean;
}

export function NoteSetPanel({ set, showDegrees = true, onPlayNote, hideTitle = false }: Props) {
  return (
    <div className="stack">
      <div className="row spread">
        <div className="grow">
          {!hideTitle && <div style={{ fontWeight: 650, fontSize: 16 }}>{set.title}</div>}
          <div className="small muted">{withTheoryHints(set.subtitle)}</div>
        </div>
        <span className="badge accent">{set.notes.length} 个音</span>
      </div>

      <div className="degree-row">
        {set.notes.map((n) =>
          onPlayNote ? (
            <button
              key={n.midi}
              type="button"
              className={`note-pill${n.isRoot ? ' root' : ''}`}
              onClick={() => onPlayNote(n.midi)}
              title={`试听 ${withTheoryHints(n.label)}`}
            >
              <span className="deg">{showDegrees ? n.degree : `${n.octave}`}</span>
              <span className="nm">
                <NoteName name={n.label} />
              </span>
            </button>
          ) : (
            <div key={n.midi} className={`note-pill${n.isRoot ? ' root' : ''}`}>
              <span className="deg">{showDegrees ? n.degree : `${n.octave}`}</span>
              <span className="nm">
                <NoteName name={n.label} />
              </span>
            </div>
          ),
        )}
      </div>

      <div className="formula">
        <span>
          半音 <b>{set.semitones.join(' – ')}</b>
        </span>
        {set.kind === 'scale' && (
          <span>
            结构 <b>{set.formula}</b>
          </span>
        )}
        {set.kind === 'chord' && <span className="tiny">{set.hint}</span>}
      </div>
    </div>
  );
}
