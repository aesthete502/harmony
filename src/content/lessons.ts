/**
 * L1–L9 的讲义内容。
 *
 * 每篇的结构固定（沿用 docs/curriculum.md 第 5 节）：
 * 一句话 → 为什么 → 怎么记 → 一张图 + 一个试听例子 → 3 道自测。
 *
 * 图不是静态图片，而是用现有的 buildScale / buildChord / buildInterval
 * 现场生成谱面和键盘，所以调音、拼写规则改了讲义会自动跟着变。
 */

export type LessonFigure =
  /** 单个音，用于 L1 讲中央 C */
  | { kind: 'pitch'; label: string; caption: string; midi: number }
  | {
      kind: 'scale';
      label: string;
      caption: string;
      rootPc: number;
      scaleId: string;
    }
  | {
      kind: 'chord';
      label: string;
      caption: string;
      rootPc: number;
      chordId: string;
      inversion?: number;
    }
  | { kind: 'interval'; label: string; caption: string; rootMidi: number; intervalId: string }
  /** 和弦进行，用于 L9；目前固定 C 大调 */
  | { kind: 'progression'; label: string; caption: string; degrees: string[] };

export interface LessonQuizItem {
  question: string;
  choices: string[];
  /** 正确选项下标 */
  correct: number;
  why: string;
}

export interface Lesson {
  level: number;
  title: string;
  /** 一句话 */
  oneLine: string;
  sections: { heading: string; body: string[] }[];
  figure: LessonFigure;
  /** 可选对比例子，和主图并排放 */
  contrast?: LessonFigure;
  quiz: LessonQuizItem[];
}

export const LESSONS: Lesson[] = [
  {
    level: 1,
    title: '音名与键盘',
    oneLine: '十二个键名、五组黑键，记住这两件事，键盘就不再是一排白条。',
    sections: [
      {
        heading: '为什么',
        body: [
          '一个八度被切成 12 个半音：7 个白键加 5 个黑键。黑键不是均匀分布的，而是「两个一组、三个一组」交替出现。看到两个黑键，左边紧挨的白键就是 C，这是整张键盘的锚点。',
          '只有 E–F 和 B–C 之间没有黑键，它们本来就是半音；其余相邻白键之间都夹着黑键，相隔全音。同一个键可以有两个名字，C♯ 和 D♭ 是等音，写哪个取决于调性，声音完全一样。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '先认 C（两个黑键组的左边白键），再按 C D E F G A B 顺着白键数，数到 B 就回到下一个 C，八度翻倍。要找某个黑键，别数「第几个黑键」，先看它左右的白键，再判断是升还是降。',
        ],
      },
    ],
    figure: {
      kind: 'pitch',
      label: '中央 C',
      caption: '高音谱表的下加一线，也是键盘正中间那组两个黑键的左侧白键。',
      midi: 60,
    },
    contrast: {
      kind: 'scale',
      label: 'C 大调音阶',
      caption: 'C 大调只用白键，从 C 开始按音名顺序走到 B，正好一个八度。',
      rootPc: 0,
      scaleId: 'major',
    },
    quiz: [
      {
        question: '中央 C 在键盘上的位置是？',
        choices: ['两个黑键组的左边白键', '三个黑键组的左边白键', '两个黑键组的右边白键', '第三个白键'],
        correct: 0,
        why: '两个黑键组左侧的白键是 C，也是高音谱表下加一线的位置。',
      },
      {
        question: '下面哪一对相邻白键之间没有黑键？',
        choices: ['E–F', 'C–D', 'F–G', 'A–B'],
        correct: 0,
        why: '只有 E–F 和 B–C 是半音，天生没有黑键。',
      },
      {
        question: 'C♯ 和 D♭ 是什么关系？',
        choices: ['相差全音', '等音，按的是同一个键', '相差八度', '同一个音名的两种写法'],
        correct: 1,
        why: '它们按的是同一个键，只是记法不同，这种关系叫等音。',
      },
    ],
  },

  {
    level: 2,
    title: '大调音阶与音级',
    oneLine: '大调音阶的公式只有一个：全全半全全全半。换调只是换起点。',
    sections: [
      {
        heading: '为什么',
        body: [
          '音阶不是七个随便挑的音，而是按固定间隔排列的一组音。大调里只有第三、四音之间和第七、八音之间是半音，其余都是全音，这个排列就是「明亮」的来源。',
          '第七级离主音只有一个半音，叫导音，它天然想往上解决到主音，所以大调听起来有方向、有归宿。调号只是把这个公式搬到另一个起点：G 大调把 F 升高，F 大调把 B 降低，公式一点没变。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '唱 do re mi fa sol la si，mi–fa 和 si–do 是半音，其余全是全音。换调时先找主音，再按公式往上数；数到该升该降的音，就按调性写升号或降号，不要写成等音。',
        ],
      },
    ],
    figure: {
      kind: 'scale',
      label: 'C 大调',
      caption: '7 个音全在白键上，公式是 全 全 半 全 全 全 半。',
      rootPc: 0,
      scaleId: 'major',
    },
    contrast: {
      kind: 'scale',
      label: 'G 大调',
      caption: '同样的公式从 G 开始，只有 F 变成了 F♯，其余六个音不变。',
      rootPc: 7,
      scaleId: 'major',
    },
    quiz: [
      {
        question: '大调音阶的半音结构是？',
        choices: ['全全半全全全半', '全半全全半全全', '全全全半全全半', '半全全全半全全'],
        correct: 0,
        why: '大调是 全 全 半 全 全 全 半，半音落在第三、四音和第七、八音之间。',
      },
      {
        question: 'G 大调相对 C 大调，改变了哪个音？',
        choices: ['C 变成 C♯', 'F 变成 F♯', 'B 变成 B♭', 'G 变成 G♯'],
        correct: 1,
        why: 'G 大调只把 F 升高，形成 全 全 半 全 全 全 半 的结构。',
      },
      {
        question: '大调里离主音只有半音、最想解决到主音的是？',
        choices: ['第三级', '第五级', '第七级（导音）', '第二级'],
        correct: 2,
        why: '导音离主音只有半音，所以听起来总想往上解决。',
      },
    ],
  },

  {
    level: 3,
    title: '常用音程',
    oneLine: '音程用两个数字描述：度数看音名，性质看半音。',
    sections: [
      {
        heading: '为什么',
        body: [
          '度数数的是音名的格子：C 到 E 经过 C、D、E 三个字母，所以是三度，跟中间隔几个半音无关。半音数才决定听感：C–E 是四个半音的大三度，C–E♭ 是三个半音的小三度，只差一个半音，明暗就完全变了。',
          '三度决定和弦的明暗，五度决定稳定：纯五度听起来空而稳，减五度悬着不落地。纯音程（一、四、五、八）没有大小之分，只有增减。三度和六度听起来协和，二度、七度比较刺耳，配和声时最先用到的就是这些判断。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '先数度数，再数半音。转位有规律：度数相加等于 9，大变小、小变大，纯音程仍然是纯音程。所以大六度转位是小三度，纯四度转位是纯五度。',
        ],
      },
    ],
    figure: {
      kind: 'interval',
      label: 'C–E 大三度',
      caption: '四个半音，听起来明亮，是大三和弦的底子。',
      rootMidi: 60,
      intervalId: 'M3',
    },
    contrast: {
      kind: 'interval',
      label: 'C–E♭ 小三度',
      caption: '只有三个半音，比大三度暗一个半音，这就是大小调的差别。',
      rootMidi: 60,
      intervalId: 'm3',
    },
    quiz: [
      {
        question: 'C 到 E 是什么音程？',
        choices: ['大三度', '小三度', '纯四度', '大二度'],
        correct: 0,
        why: 'C–E 是四个半音，字母跨三个，所以是大三度。',
      },
      {
        question: '小三度包含几个半音？',
        choices: ['2', '3', '4', '5'],
        correct: 1,
        why: '小三度是三个半音，大三度是四个半音。',
      },
      {
        question: '大六度的转位是什么？',
        choices: ['大三度', '小六度', '小三度', '纯四度'],
        correct: 2,
        why: '度数相加等于 9，大变小：6 + 3 = 9，所以大六度转位是小三度。',
      },
    ],
  },

  {
    level: 4,
    title: '三和弦与转位',
    oneLine: '三个音按三度叠起来是三和弦；转位只换最低音，不换根音。',
    sections: [
      {
        heading: '为什么',
        body: [
          '三和弦由根音、三音、五音组成，相邻两个音都隔三度。三音决定大小：大三度在上面是大三和弦，小三度在上面是小三和弦；五音决定稳定：纯五稳定，减五悬空，增五更紧张。',
          '转位是把最低的音搬到高八度。第一转位最低音是三音，第二转位最低音是五音。听起来像是换了个形状，但根音始终没动，这是最容易搞错的地方。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '判转位只看最低音是谁：根音在底下是原位，三音在底下是第一转位，五音在底下是第二转位。构和弦时先摆根音，再往上数两个三度，最后检查有没有写错升降号。',
        ],
      },
    ],
    figure: {
      kind: 'chord',
      label: 'C 大三和弦',
      caption: '原位：C 在最底下，半音结构 0–4–7。',
      rootPc: 0,
      chordId: 'major',
    },
    contrast: {
      kind: 'chord',
      label: 'C 大三和弦 · 第一转位',
      caption: '把 C 搬到上面，最低音变成三音 E，根音还是 C。',
      rootPc: 0,
      chordId: 'major',
      inversion: 1,
    },
    quiz: [
      {
        question: '大三和弦的半音结构是？',
        choices: ['0–3–7', '0–3–6', '0–4–7', '0–4–8'],
        correct: 2,
        why: '根音到三音四个半音，到五音七个半音，所以是 0–4–7。',
      },
      {
        question: '第一转位时，最低音是哪个角色？',
        choices: ['根音', '三音', '五音', '七音'],
        correct: 1,
        why: '第一转位把根音搬到上面，最低音就成了原来的三音。',
      },
      {
        question: '减三和弦与小三和弦只差哪个音？',
        choices: ['五音', '三音', '根音', '八度'],
        correct: 0,
        why: '减三和弦把小三和弦的纯五度再降低半音，变成减五度。',
      },
    ],
  },

  {
    level: 5,
    title: '全部音程与自然小调',
    oneLine: '补齐二度、七度和三全音；小调不是「降三个音的大调」，而是换了个中心。',
    sections: [
      {
        heading: '为什么',
        body: [
          '自然小调的结构是全半全全半全全。它和关系大调共用同一批音，只是把主音换了个位置：A 自然小调和 C 大调按的键完全一样，听起来却是 A 在当家。小调的暗淡来自小三度和降六度。',
          '三全音是两个音相隔六个半音，增四和减五是它的两个写法，听感相同、写法不同。它最不稳定，讲到属七和弦时还会再见到它。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '关系大小调：小调主音在大调主音下方小三度，A 小调配 C 大调。平行大小调则是同一个主音、不同的音，比如 C 大调和 C 小调，两者不要混。',
        ],
      },
    ],
    figure: {
      kind: 'scale',
      label: 'A 自然小调',
      caption: '和 C 大调按同一批白键，但主音是 A，所以听起来收在 A 上。',
      rootPc: 9,
      scaleId: 'minor',
    },
    contrast: {
      kind: 'scale',
      label: 'C 大调',
      caption: '同样的七个白键，主音换成 C，感觉立刻变明亮。',
      rootPc: 0,
      scaleId: 'major',
    },
    quiz: [
      {
        question: '自然小调的音阶结构是？',
        choices: ['全半全全半全全', '全全半全全全半', '全半全全全半全', '半全全半全全全'],
        correct: 0,
        why: '自然小调是 全 半 全 全 半 全 全。',
      },
      {
        question: 'A 自然小调的关系大调是？',
        choices: ['A 大调', 'C 大调', 'E 大调', 'G 大调'],
        correct: 1,
        why: '关系小调的主音在大调主音下方小三度，A 的上方小三度是 C。',
      },
      {
        question: '增四度和减五度相差几个半音？',
        choices: ['都是 6 个半音，听感相同', '5 个和 6 个', '6 个和 7 个', '4 个和 5 个'],
        correct: 0,
        why: '两者都是 6 个半音，只是记法不同，合称三全音。',
      },
    ],
  },

  {
    level: 6,
    title: '七和弦与转位',
    oneLine: '三和弦再加一个七音，和弦就有了方向和张力。',
    sections: [
      {
        heading: '为什么',
        body: [
          '七音和根音相隔七度，本身不协和，所以七和弦总想往前走。属七（0–4–7–10）里藏着三全音，解决欲望最强，通常回到主和弦；大七只把七音升高一个半音，就从紧张变成明亮。',
          '半减七是小三和弦加小七音，减七是三个小三度叠起来，对称、没有明确调性，常用来过渡。小七和属七只差三音一个半音，是流行乐里最容易混的一对。属七回到主和弦时，三音往上、七音往下，两个音一起解决，这就是最典型的收束感。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '先听三和弦的底子，再听最上面的七音：贴着根音的是大七，离得远一点的是小七。记结构比记名字可靠：maj7 是 0–4–7–11，7 是 0–4–7–10。',
        ],
      },
    ],
    figure: {
      kind: 'chord',
      label: 'Cmaj7 大七和弦',
      caption: '七音 B 离根音只有一个半音，所以听起来亮而紧张。',
      rootPc: 0,
      chordId: 'maj7',
    },
    contrast: {
      kind: 'chord',
      label: 'C7 属七和弦',
      caption: '只把七音降了半音，B 变成 B♭，就多了一股想回到 F 的拉力。',
      rootPc: 0,
      chordId: '7',
    },
    quiz: [
      {
        question: '属七和弦的半音结构是？',
        choices: ['0–4–7–11', '0–4–7–10', '0–3–7–10', '0–3–6–10'],
        correct: 1,
        why: '属七是 0–4–7–10，七音比大七低一个半音。',
      },
      {
        question: '大七和弦和属七和弦只差哪个音？',
        choices: ['三音', '五音', '七音', '根音'],
        correct: 2,
        why: '大七的七音是 11，属七是 10，只差七音一个半音。',
      },
      {
        question: '减七和弦由几个小三度叠成？',
        choices: ['2 个', '3 个', '4 个', '1 个'],
        correct: 1,
        why: '减七是 0–3–6–9，三个小三度叠起来，所以对称。',
      },
    ],
  },

  {
    level: 7,
    title: '五声与和声小调',
    oneLine: '换音阶不要背公式，记住每个音阶的特征音就够了。',
    sections: [
      {
        heading: '为什么',
        body: [
          '和声小调把自然小调的第七级升高，于是第六、七级之间出现增二度，这就是那股异域感；旋律小调上行时把六、七级一起升高，是为了让旋律走得更顺。',
          '五声音阶没有半音，也没有三全音，所以怎么弹都不刺耳；大调五声就是大调去掉第四、七级，小调五声是小调去掉第二、六度。布鲁斯在小调五声上再加一个降五级，那个音就是布鲁斯的味道。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '拿自然小调当基准：和声小调只改第七级，旋律小调改第六、七级。拿大调当基准：大调五声去掉第四、七级。先记住差在哪，再去听。',
        ],
      },
    ],
    figure: {
      kind: 'scale',
      label: 'C 和声小调',
      caption: '第七级 B 升高后，第六级 A♭ 到 B 之间是增二度，这是它的标志。',
      rootPc: 0,
      scaleId: 'harmonic-minor',
    },
    contrast: {
      kind: 'scale',
      label: 'C 自然小调',
      caption: '同样的主音，第七级是 B♭，少了那个增二度，就少了一股异域感。',
      rootPc: 0,
      scaleId: 'minor',
    },
    quiz: [
      {
        question: '和声小调相对自然小调，改变了哪一级？',
        choices: ['第六级', '第七级', '第三级', '第五级'],
        correct: 1,
        why: '和声小调把第七级升高半音，制造出导音和增二度。',
      },
      {
        question: '大调五声音阶去掉了大调的哪两级？',
        choices: ['第二、六级', '第四、七级', '第三、七级', '第四、六级'],
        correct: 1,
        why: '大调去掉第四、七级，就没有半音和三全音了。',
      },
      {
        question: '布鲁斯音阶在小调五声上加了哪个音？',
        choices: ['降五级', '升四级', '大七度', '降二级'],
        correct: 0,
        why: '那个降五级就是布鲁斯味道的来源。',
      },
    ],
  },

  {
    level: 8,
    title: '七种调式',
    oneLine: '同一批音，换一个中心，就是另一种调式。',
    sections: [
      {
        heading: '为什么',
        body: [
          '七个教会调式用的是同一组白键，区别在于以谁为主音。C 大调的音从 D 开始就是 D Dorian，从 E 开始是 E Phrygian。主音一变，哪些音成了「家」、哪些音成了「特征」，全都跟着变。',
          'Dorian 的大六度让它既暗又亮，Phrygian 的小二度有压迫感，Lydian 的增四度让它飘起来，Mixolydian 的小七度更松弛，Locrian 的减五度几乎不能当稳定调性。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '以 C 大调为基准，记「改哪一个音」：Lydian 升四级，Mixolydian 降七级，Dorian 降三、七级，Phrygian 再降二级，Locrian 再加降五级。别背七套公式。',
          '调式和音阶的区别不在音，而在重心：同一批音里你反复回到哪个音，耳朵就会把它当成主音。所以练调式最有效的办法是配一个持续的低音，让中心一直很清楚。',
        ],
      },
    ],
    figure: {
      kind: 'scale',
      label: 'C Lydian',
      caption: '比 C 大调只多一个 F♯，那个增四度就是它飘起来的原因。',
      rootPc: 0,
      scaleId: 'lydian',
    },
    contrast: {
      kind: 'scale',
      label: 'C 大调（Ionian）',
      caption: '把 F♯ 还原成 F，就回到最熟悉的大调。',
      rootPc: 0,
      scaleId: 'major',
    },
    quiz: [
      {
        question: 'D Dorian 用的是哪一组音？',
        choices: ['C 大调的白键', 'D 大调的音', 'G 大调的音', '全是黑键'],
        correct: 0,
        why: 'Dorian 就是同一组白键以 D 为中心，所以用的是 C 大调那七个音。',
      },
      {
        question: 'Lydian 相对大调，改的是哪一级？',
        choices: ['降七级', '升四级', '降三级', '降六级'],
        correct: 1,
        why: 'Lydian 的特征是升四级，也就是增四度。',
      },
      {
        question: 'Mixolydian 的特征音是？',
        choices: ['大七度', '小七度', '增四度', '小二度'],
        correct: 1,
        why: 'Mixolydian 相对大调降七级，所以特征音是小七度。',
      },
    ],
  },

  {
    level: 9,
    title: '和声功能与进行',
    oneLine: '和弦不是孤立的，它们按功能走成一条路：主 → 下属 → 属 → 主。',
    sections: [
      {
        heading: '为什么',
        body: [
          'I、vi、iii 属于主功能，最稳定；IV、ii 是下属，负责离开；V、vii° 是属，张力最大，最想回到 I。所以最基础的是 I–IV–V–I，功能圈转一圈又回到主。',
          '流行歌爱用 I–V–vi–IV 和 vi–IV–I–V，四个和弦绕一圈；ii–V–I 是爵士的基本句型。V 本该回 I 却去了 vi，叫假终止，听起来像话没说完。',
        ],
      },
      {
        heading: '怎么记',
        body: [
          '听进行先听低音线，再注意最后一个和弦有没有「回家」。小调里的 V 通常用和声小调的大三和弦，这是小调最反直觉的地方。功能圈的意思是：可以先离开主，但最后要经过属再回来，否则听起来像半路停下。写歌时先定低音线的走向，再往上配和弦，比一个个试要快得多。',
        ],
      },
    ],
    figure: {
      kind: 'progression',
      label: 'I–V–vi–IV',
      caption: '流行四和弦。点单个和弦可以听，也可以整段播放。',
      degrees: ['I', 'V', 'vi', 'IV'],
    },
    contrast: {
      kind: 'progression',
      label: 'V–vi 假终止',
      caption: 'V 本该回 I，却拐去了 vi，所以听起来没有结束。',
      degrees: ['V', 'vi'],
    },
    quiz: [
      {
        question: 'I–IV–V–I 里，V 属于什么功能？',
        choices: ['主功能', '下属功能', '属功能', '没有功能'],
        correct: 2,
        why: 'V 和 vii° 属于属功能，张力最大，最想回到 I。',
      },
      {
        question: 'I–V–vi–IV 的最后一个和弦是？',
        choices: ['I', 'IV', 'V', 'vi'],
        correct: 1,
        why: '这个进行是 I→V→vi→IV，最后一个停在 IV 上。',
      },
      {
        question: 'V 本该回 I 却去了 vi，这种终止叫什么？',
        choices: ['正格终止', '变格终止', '半终止', '假终止'],
        correct: 3,
        why: 'V–vi 叫假终止，因为听感上像是故意不回家。',
      },
    ],
  },
];

export function lessonFor(level: number): Lesson | undefined {
  return LESSONS.find((l) => l.level === level);
}

/** 大调七个级数对应的和弦，L9 的进行用（目前固定 C 大调） */
export const MAJOR_DEGREE_CHORDS: Record<string, { pc: number; chordId: string }> = {
  I: { pc: 0, chordId: 'major' },
  ii: { pc: 2, chordId: 'minor' },
  iii: { pc: 4, chordId: 'minor' },
  IV: { pc: 5, chordId: 'major' },
  V: { pc: 7, chordId: 'major' },
  vi: { pc: 9, chordId: 'minor' },
  'vii°': { pc: 11, chordId: 'dim' },
};
