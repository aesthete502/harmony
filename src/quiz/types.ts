export type TaskKind =
  | 'name-to-key'
  | 'key-to-name'
  | 'build-scale'
  | 'scale-degree'
  | 'scale-membership'
  | 'build-interval'
  | 'identify-interval'
  | 'invert-interval'
  | 'ear-interval'
  | 'build-chord'
  | 'identify-chord'
  | 'identify-root'
  | 'identify-inversion'
  | 'ear-chord'
  | 'build-minor-scale'
  | 'relative-key'
  | 'ear-tonality'
  | 'build-seventh'
  | 'seventh-inversion'
  | 'ear-seventh'
  | 'build-scale-family'
  | 'scale-feature'
  | 'ear-scale-family'
  | 'build-mode'
  | 'mode-feature'
  | 'ear-mode';

export type AnswerMode = 'keys' | 'choice';

/** 听辨题的播放方式：旋律（依次） / 和声（同时） / 跟随设置 */
export type EarStyle = 'melodic' | 'harmonic' | 'setting';

export interface EarSpec {
  /** 参照音（主音或根音），播放时先放它；关掉参照音设置后不播 */
  reference?: number;
  /** 要听的材料 */
  midis: number[];
  style: EarStyle;
  /** 给用户的一句提示，如「先听主音，再听两个音」 */
  note: string;
}

export interface Question {
  id: string;
  level: number;
  kind: TaskKind;
  prompt: string;
  hint?: string;
  answerMode: AnswerMode;
  /** 答题键盘的范围 [from, to] */
  keyRange: [number, number];
  /** 题面已经在键盘上高亮的音 */
  highlight?: number[];
  /** midi -> 键盘上显示的文字（识别题不要给，否则等于送答案） */
  labels?: Record<number, string>;
  choices?: string[];
  correctChoice?: string;
  expectedKeys?: number[];
  /** 作答后键盘上显示的答案文字（按调性拼写） */
  revealLabels?: Record<number, string>;
  /** 是否正确统计里使用 */
  explanation: string;
  /** 作答后可回放的声音 */
  playMidis?: number[];
  /** 是否隐藏键盘上的 C 标记 */
  hideKeyNames?: boolean;
  /** 听辨题：题面不放键盘高亮，靠播放来判断 */
  ear?: EarSpec;
}

export interface Answer {
  questionId: string;
  correct: boolean;
  /** 用户点选的音 */
  keys: number[];
  /** 用户选择的选项 */
  choice: string | null;
}

export function checkAnswer(question: Question, keys: number[], choice: string | null): boolean {
  if (question.answerMode === 'choice') {
    return choice !== null && choice === question.correctChoice;
  }
  const expected = [...(question.expectedKeys ?? [])].sort((a, b) => a - b).join(',');
  const given = [...new Set(keys)].sort((a, b) => a - b).join(',');
  return expected === given;
}

/** 同一道题的稳定签名：错题本用它去重，重新生成到同一道题时不会重复入库 */
export function questionKey(question: Question): string {
  const answer =
    question.answerMode === 'choice'
      ? (question.correctChoice ?? '')
      : [...(question.expectedKeys ?? [])].sort((a, b) => a - b).join(',');
  return `${question.level}|${question.kind}|${question.prompt}|${answer}`;
}
