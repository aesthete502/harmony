import { useEffect, useRef } from 'react';
import { Renderer, Stave } from 'vexflow';

interface Props {
  /** VexFlow 调号（用关系大调的写法），如 "C"、"F#"、"Ab" */
  keySpec: string;
  /** 五线谱高度（CSS 像素），宽度按调号里的升降号数量自动裁切 */
  height?: number;
}

/** 先在够宽的画布上渲染，再裁切；纵向留出高音谱号上下的墨迹（谱线在 y=40.5~80.5） */
const BASE_WIDTH = 240;
const BASE_HEIGHT = 120;
const STAVE_Y = 0;
const VIEW_TOP = 16;
const VIEW_BOTTOM = 104;

/**
 * 高音谱号 + 调号的小谱表。
 * 五度圈外圈用它显示每个调到底升/降哪些音（调号位置是标准写法）。
 */
export function KeySignatureStaff({ keySpec, height = 60 }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(BASE_WIDTH, BASE_HEIGHT);
    const ctx = renderer.getContext();

    const stave = new Stave(4, STAVE_Y, BASE_WIDTH - 8);
    stave.addClef('treble');
    stave.addKeySignature(keySpec);
    stave.setContext(ctx).draw();

    const svg = host.querySelector('svg');
    if (!svg) return;

    // VexFlow 会在容器里额外塞一个用于量字体宽度的 svg，删掉以免影响布局
    for (const extra of Array.from(host.querySelectorAll('svg'))) {
      if (extra !== svg) extra.remove();
    }

    // 横向裁到调号结束处，纵向裁到谱号墨迹的范围
    const used = Math.min(Math.ceil(stave.getNoteStartX()) + 2, BASE_WIDTH);
    const boxHeight = VIEW_BOTTOM - VIEW_TOP;

    svg.setAttribute('viewBox', `0 ${VIEW_TOP} ${used} ${boxHeight}`);
    svg.style.width = `${((used / boxHeight) * height).toFixed(2)}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
  }, [keySpec, height]);

  return <span className="sig-staff" ref={hostRef} />;
}
