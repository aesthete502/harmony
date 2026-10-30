# Harmony 乐理

音阶与和弦的构成、听辨训练。纯前端 PWA，电脑和 Android 手机都能用，装到主屏后可离线，没有服务器和账号。

## 本地运行

需要 Node 22 以上。本机当前使用免安装版 Node：

```powershell
$env:PATH = "$env:LOCALAPPDATA\node-v24.22.1;$env:PATH"
npm install
npm run dev
```

常用命令：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发，默认 http://localhost:5173 |
| `npm run build` | 类型检查 + 构建到 `dist/` |
| `npm run preview` | 预览构建产物 |
| `npm test` | 跑理论层与出题器的单元测试 |
| `npm run typecheck` | 只做类型检查 |

## 部署

推送到 `main` 后由 `.github/workflows/deploy.yml` 自动构建并发布到 GitHub Pages。
第一次需要到仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（仓库级的 Actions token 没有创建 Pages 站点的权限，这一步只能手动点一次）。

项目站点会部署在 `https://<用户名>.github.io/<仓库名>/`，工作流已自动把 `BASE_PATH` 设为 `/<仓库名>/`。
如果用的是用户站点（`<用户名>.github.io` 仓库），把工作流里的 `BASE_PATH` 改成 `/`。

## 结构

```
src/
├─ theory/      纯函数：音名、音阶、和弦、音程（配单元测试）
├─ audio/       Web Audio 音源与调度（Instrument 接口，方便以后换钢琴采样）
├─ components/  键盘 / 五线谱 / 指板 / 图标
├─ quiz/        题目模型与生成器
├─ pages/       探索、五度圈、练习、课程、讲义、进度
├─ content/     关卡定义、L1–L9 讲义正文与插图解析
├─ storage.ts   localStorage 进度与导入导出
└─ styles.css   移动端优先的样式表
docs/
└─ curriculum.md  L1–L9 课程内容大纲
```

## 当前进度

- 批 1：三视图、探索页、五度圈、L1–L4 构成题、PWA 离线、单元测试。
- 练习页的题目都是即时随机生成，一组可选 10 / 20 题或不限题数；探索页点音阶/和弦里的单个音也能单独试听。五度圈保留完整的大小调关系，下方内容可切换看大调或关系小调，并查看该调的顺阶三和弦、七和弦和主音音程。宽屏时五度圈最外圈用高音谱小谱表标出每个调的调号（窄屏改成同顺序的网格）。
- 遇到重升/重降（如 B♭dim7 的 A♭♭）时，音名标签优先显示等音简化写法（A），理论拼写用小字提示；五线谱仍按理论拼写记写，谱面下方给出一句对照。L1–L4 的题目会避开会写出重升/重降的根音组合，留到以后讲变音记号时再出现。
- 讲义：课程页点关卡进入 L1–L9 每关一篇（200–400 字），含「为什么 / 怎么记」两节、一张现场生成的谱面+键盘图（L9 是和弦进行方块）、试听、3 道自测和「在探索页打开」。L5–L9 可以先读，练习仍按批次逐步开放。
- 批 2：相对听辨、L5–L8、错题本与统计。
- 批 3：绝对音高、和声进行 L9、钢琴采样音源。
- 批 4：麦克风唱准与听写。

进度只存在本机浏览器，不同设备之间用「进度 → 导出/导入 JSON」手动同步。
