import { spellingOf } from '../theory';

interface Props {
  /** 理论音名，如 "B♭♭" */
  name: string;
}

/**
 * 音名标签：重升/重降优先显示等音简化写法，理论拼写用小字跟在下边。
 * 谱面不经过这里，仍然按理论拼写记写。
 */
export function NoteName({ name }: Props) {
  const { simple, theory } = spellingOf(name);
  if (!theory) return <>{name}</>;
  return (
    <>
      {simple}
      <span className="note-theory" title={`理论拼写 ${theory}`}>
        {theory}
      </span>
    </>
  );
}
