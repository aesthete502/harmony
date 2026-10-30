export type TaskKind =
  | 'name-to-key'
  | 'key-to-name'
  | 'build-scale'
  | 'scale-degree'
  | 'scale-membership'
  | 'build-interval'
  | 'identify-interval'
  | 'invert-interval'
  | 'build-chord'
  | 'identify-chord'
  | 'identify-root'
  | 'identify-inversion';

export type AnswerMode = 'keys' | 'choice';

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
