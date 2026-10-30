/** 从其他页面跳到「探索」时带的参数；nonce 变化才会重新应用 */
export interface ExploreRequest {
  nonce: number;
  kind: 'scale' | 'chord' | 'interval';
  rootPc: number;
  /** 根音拼写（如 "G♯"），用来保留调内写法；不传则用标准 12 根音 */
  rootName?: string;
  scaleId?: string;
  chordId?: string;
  inversion?: number;
  intervalId?: string;
}
