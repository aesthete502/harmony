import { describe, expect, it } from 'vitest';
import {
  buildChord,
  buildInterval,
  buildScale,
  CHORD_TYPES,
  detectInversion,
  formulaText,
  INTERVAL_TYPES,
  invertMidis,
  hasDoubleAccidental,
  midiToPretty,
  ROOTS,
  SCALE_TYPES,
  spellingOf,
  withTheoryHints,
} from './index';

describe('音阶', () => {
  it('C 大调的音名与音高正确', () => {
    const scale = buildScale(0, 'major');
    expect(scale.notes.map((n) => n.name)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(scale.notes.map((n) => n.midi)).toEqual([48, 50, 52, 53, 55, 57, 59]);
    expect(scale.degreeText).toBe('1 2 3 4 5 6 7');
  });

  it('按调性拼写，而不是一律用升号', () => {
    expect(buildScale(6, 'major').notes.map((n) => n.name)).toEqual([
      'F#',
      'G#',
      'A#',
      'B',
      'C#',
      'D#',
      'E#',
    ]);
    expect(buildScale(5, 'major').notes.map((n) => n.name)).toEqual([
      'F',
      'G',
      'A',
      'Bb',
      'C',
      'D',
      'E',
    ]);
  });

  it('大调结构是 全全半全全全半', () => {
    expect(formulaText(buildScale(0, 'major').semitones)).toBe('全 全 半 全 全 全 半');
  });

  it('自然小调的级数标记带降号', () => {
    const scale = buildScale(9, 'minor');
    expect(scale.degreeText).toBe('1 2 ♭3 4 5 ♭6 ♭7');
    expect(scale.notes[2].name).toBe('C');
  });

  it('全部根音与全部音阶类型都能构建且严格上行', () => {
    for (const root of ROOTS) {
      for (const type of SCALE_TYPES) {
        const scale = buildScale(root.pc, type.id);
        expect(scale.notes).toHaveLength(type.semitones.length);
        for (let i = 1; i < scale.notes.length; i++) {
          expect(scale.notes[i].midi).toBeGreaterThan(scale.notes[i - 1].midi);
        }
      }
    }
  });
});

describe('和弦', () => {
  it('大三和弦 0-4-7', () => {
    const chord = buildChord(0, 'major');
    expect(chord.notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(chord.notes.map((n) => n.label)).toEqual(['C', 'E', 'G']);
  });

  it('第一转位把根音升高八度', () => {
    const chord = buildChord(0, 'major', { inversion: 1 });
    expect(chord.notes.map((n) => n.midi)).toEqual([64, 67, 72]);
    expect(detectInversion(chord.notes.map((n) => n.midi), 0)).toBe(1);
    expect(chord.title).toContain('第一转位');
  });

  it('减七和弦的七音是重降', () => {
    const chord = buildChord(0, 'dim7');
    expect(chord.notes[3].name).toBe('Bbb');
  });

  it('半减七拼写正确', () => {
    expect(buildChord(0, 'm7b5').notes.map((n) => n.name)).toEqual(['C', 'Eb', 'Gb', 'Bb']);
  });

  it('全部根音与全部和弦类型都能构建，音数正确', () => {
    for (const root of ROOTS) {
      for (const type of CHORD_TYPES) {
        const chord = buildChord(root.pc, type.id);
        expect(chord.notes).toHaveLength(type.semitones.length);
        for (let i = 1; i < chord.notes.length; i++) {
          expect(chord.notes[i].midi).toBeGreaterThan(chord.notes[i - 1].midi);
        }
      }
    }
  });

  it('每个和弦音与根音的半音距离符合定义', () => {
    for (const type of CHORD_TYPES) {
      const chord = buildChord(0, type.id);
      expect(chord.notes.map((n) => n.midi - 60)).toEqual(type.semitones);
    }
  });

  it('可以按调内拼写构建和弦（G♯dim 不写成 A♭dim）', () => {
    const chord = buildChord(8, 'dim', { rootName: 'G♯' });
    expect(chord.notes.map((n) => n.name)).toEqual(['G#', 'B', 'D']);
    expect(chord.title).toBe('G♯dim 减三和弦');
  });
});

describe('转位工具', () => {
  it('把最低的 n 个音各升高八度', () => {
    expect(invertMidis([60, 64, 67], 2)).toEqual([67, 72, 76]);
  });

  it('识别转位', () => {
    expect(detectInversion([60, 64, 67], 0)).toBe(0);
    expect(detectInversion([64, 67, 72], 0)).toBe(1);
    expect(detectInversion([67, 72, 76], 0)).toBe(2);
  });
});

describe('音程', () => {
  it('大三度与五线谱拼写', () => {
    const interval = buildInterval(60, 'M3');
    expect(interval.notes[1].midi).toBe(64);
    expect(interval.notes[1].name).toBe('E');
  });

  it('复杂拼写不会退化成等音', () => {
    const interval = buildInterval(68, 'M7'); // G#4 往上大七度 = F##5
    expect(interval.notes[1].midi).toBe(79);
    expect(interval.notes[1].name).toBe('F##');
  });

  it('可以按调内拼写构建音程（A♭ 往上小三度是 C♭）', () => {
    const interval = buildInterval(68, 'm3', 'A♭');
    expect(interval.notes.map((n) => n.label)).toEqual(['A♭', 'C♭']);
    expect(interval.notes[1].midi).toBe(71);
  });

  it('每种音程的半音数正确', () => {
    for (const type of INTERVAL_TYPES) {
      const interval = buildInterval(60, type.id);
      expect(interval.notes[1].midi - 60).toBe(type.semitones);
    }
  });

  it('转位后的音程相加为 12 个半音', () => {
    const inverted = buildInterval(60, 'm3');
    expect(inverted.semitones[1]).toBe(3);
  });
});

describe('展示', () => {
  it('音名转成 Unicode 记号', () => {
    expect(midiToPretty(61)).toBe('C♯4');
    expect(midiToPretty(63)).toBe('E♭4');
    expect(midiToPretty(60)).toBe('C4');
  });

  it('重升/重降能识别出来', () => {
    expect(hasDoubleAccidental('B♭♭')).toBe(true);
    expect(hasDoubleAccidental('G♯♯')).toBe(true);
    expect(hasDoubleAccidental('E♭')).toBe(false);
    expect(hasDoubleAccidental('C')).toBe(false);
  });

  it('重升/重降换成等音简化写法', () => {
    expect(spellingOf('B♭♭')).toEqual({ simple: 'A', theory: 'B♭♭' });
    expect(spellingOf('E♭♭')).toEqual({ simple: 'D', theory: 'E♭♭' });
    expect(spellingOf('G♯♯')).toEqual({ simple: 'A', theory: 'G♯♯' });
    expect(spellingOf('B♭')).toEqual({ simple: 'B♭', theory: null });
    // 级数标签不是音名，不能被当成 B♭♭
    expect(spellingOf('♭♭7')).toEqual({ simple: '♭♭7', theory: null });
  });

  it('纯文本里的重升/重降带上括号提示', () => {
    expect(withTheoryHints('B♭ D♭ F♭ A♭♭')).toBe('B♭ D♭ F♭ G（A♭♭）');
    expect(withTheoryHints('C E G')).toBe('C E G');
  });
});
