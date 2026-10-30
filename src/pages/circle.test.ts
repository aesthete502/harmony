import { describe, expect, it } from 'vitest';
import { buildScale } from '../theory';
import { diatonicChords, keySignature } from './CirclePage';

describe('五度圈:调号', () => {
  it('C 大调没有升降号', () => {
    expect(keySignature(buildScale(0, 'major').notes)).toEqual({ sharps: 0, flats: 0 });
  });

  it('升号调数量正确', () => {
    expect(keySignature(buildScale(7, 'major').notes)).toEqual({ sharps: 1, flats: 0 }); // G
    expect(keySignature(buildScale(2, 'major').notes)).toEqual({ sharps: 2, flats: 0 }); // D
    expect(keySignature(buildScale(6, 'major').notes)).toEqual({ sharps: 6, flats: 0 }); // F#
    expect(keySignature(buildScale(1, 'major').notes)).toEqual({ sharps: 7, flats: 0 }); // C#
  });

  it('降号调数量正确', () => {
    expect(keySignature(buildScale(5, 'major').notes)).toEqual({ sharps: 0, flats: 1 }); // F
    expect(keySignature(buildScale(10, 'major').notes)).toEqual({ sharps: 0, flats: 2 }); // Bb
    expect(keySignature(buildScale(3, 'major').notes)).toEqual({ sharps: 0, flats: 3 }); // Eb
    expect(keySignature(buildScale(8, 'major').notes)).toEqual({ sharps: 0, flats: 4 }); // Ab
  });
});

describe('五度圈:顺阶和弦', () => {
  it('C 大调三和弦是 I ii iii IV V vi vii°', () => {
    const chords = diatonicChords(0, false);
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(chords.map((c) => c.label)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°']);
  });

  it('C 大调七和弦是 Imaj7 ii m7 ... viiø7', () => {
    const chords = diatonicChords(0, true);
    expect(chords.map((c) => c.label)).toEqual([
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
      'Am7',
      'Bø7',
    ]);
    expect(chords.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'viiø']);
  });

  it('A 大调的顺阶和弦带正确的升号', () => {
    const chords = diatonicChords(9, false);
    expect(chords.map((c) => c.label)).toEqual([
      'A',
      'Bm',
      'C♯m',
      'D',
      'E',
      'F♯m',
      'G♯°',
    ]);
  });

  it('每个顺阶和弦的根音都在所属大调音阶里', () => {
    const scale = buildScale(3, 'major'); // Eb
    const pcs = new Set(scale.notes.map((n) => n.pc));
    for (const c of diatonicChords(3, false)) expect(pcs.has(c.rootPc)).toBe(true);
  });
});

describe('五度圈:小调', () => {
  it('A 自然小调的三和弦是 i ii° III iv v VI VII', () => {
    const chords = diatonicChords(9, false, 'minor');
    expect(chords.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
    expect(chords.map((c) => c.label)).toEqual(['Am', 'B°', 'C', 'Dm', 'Em', 'F', 'G']);
  });

  it('A 自然小调的七和弦是 Am7 Bø7 Cmaj7 Dm7 Em7 Fmaj7 G7', () => {
    const chords = diatonicChords(9, true, 'minor');
    expect(chords.map((c) => c.label)).toEqual([
      'Am7',
      'Bø7',
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
    ]);
    expect(chords.map((c) => c.roman)).toEqual(['i', 'iiø', 'III', 'iv', 'v', 'VI', 'VII']);
  });

  it('小调可以按调内拼写构建（D♯ 小调不会变成 E♭ 小调）', () => {
    const scale = buildScale(3, 'minor', 4, 'D♯');
    expect(scale.notes.map((n) => n.name)).toEqual([
      'D#',
      'E#',
      'F#',
      'G#',
      'A#',
      'B',
      'C#',
    ]);
    expect(keySignature(scale.notes)).toEqual({ sharps: 6, flats: 0 });
  });
});
