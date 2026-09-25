# 深寻全录 — DeepSeek 对话导出工具

导出 DeepSeek 网页版**完整对话**为 Markdown 文件。

突破 DeepSeek 官方"仅导出最近 8 轮"的限制，通过 Playwright 控制真实浏览器，遍历虚拟列表抓取全部历史消息。

## 功能特性

- **完整导出**：突破 8 轮限制，导出对话全部轮次
- **思考过程**：支持导出 DeepSeek R1 的思维链（默认关闭，信噪比低；可按需开启）
- **精确转换**：HTML → Markdown，支持代码块、KaTeX 公式、表格、列表、引用等
- **批量导出**：支持一次粘贴多个对话链接
- **重命名**：导出时可自定义文件名
- **去重检测**：导出时自动检测同目录是否存在相似文件，避免重复导出
- **后处理工具**：一键批量去除已有 .md 文件中的 `<details>` 思考过程块
- **登录保持**：浏览器登录态保存在本地，只需登录一次
- **暗黑主题**：VSCode Dark+ 风格界面
- **自定义图标**：使用 `icon.png` 作为窗口/任务栏/桌面/应用内图标

## 快速开始

### 环境要求

- Python ≥ 3.10
- [uv](https://docs.astral.sh/uv/) 包管理器
- Windows（已测试）

### 安装

```bash
# 克隆项目
cd deepseek-md-exporter

# 安装依赖
uv sync

# 安装 Playwright 浏览器
uv run playwright install chromium
```

### 运行

```bash
uv run deepseek-exporter
```

或直接：

```bash
uv run python -m deepseek_exporter.main
```

## 使用步骤

1. **登录**：点击「🔑 打开浏览器登录」，在弹出的 Chromium 中手动登录 DeepSeek。登录状态保存在 `.deepseek_exporter/chrome_profile`，只需操作一次。

2. **粘贴链接**：在文本框中粘贴对话链接，每行一个，支持批量。链接格式如：
   ```
   https://chat.deepseek.com/a/chat/s/xxxxxxxx
   ```

3. **保存设置**：
   - 导出目录：默认 `D:\0_Note\raw`
   - 文件命名：留空则使用对话标题，也可输入自定义名称

4. **开始导出**：点击「▶ 开始导出」，日志区会实时显示滚动进度和收集状态。

## 项目结构

```
deepseek-md-exporter/
├── pyproject.toml                  # 项目配置
├── entry.py                        # 打包入口（绝对导入）
├── icon.png                        # 应用图标（PNG 源文件）
├── icon.ico                        # 打包用图标（自动生成）
├── deepseek-exporter.spec          # PyInstaller 打包配置
├── build_exe.bat                   # 一键打包脚本
├── src/
│   └── deepseek_exporter/
│       ├── __init__.py
│       ├── main.py                 # 入口点
│       ├── gui.py                  # VSCode Dark 风格 GUI
│       ├── browser.py              # Playwright 浏览器抓取
│       ├── converter.py            # HTML → Markdown 转换
│       └── exporter.py             # Markdown 渲染与保存
├── .deepseek_exporter/             # 浏览器登录数据（运行后生成）
└── uv.lock
```

## 核心模块说明

### browser.py — 浏览器抓取

- 自动检测 DeepSeek 虚拟列表的真实滚动容器
- 强制 `scrollTop=0` 回溯到最顶部，验证到达后才停止
- 逐屏向下滚动收集，基于 `scrollTop/scrollHeight` 精确判定到底
- 稳定性签名机制避免过早判定结束

关键 DOM 选择器：

| 用途 | 选择器 |
|------|--------|
| 消息容器 | `[data-virtual-list-item-key]` |
| 用户消息 | `.fbb737a4 .ds-collapsible-text` |
| 思考过程 | `.ds-think-content .ds-markdown` |
| 正式回答 | `.ds-markdown.ds-assistant-message-main-content` |

### converter.py — HTML → Markdown

自研轻量 HTML 解析器，支持：

- KaTeX 公式 → `$...$` / `$$...$$`
- 代码块 → 围栏代码块（含语言标识）
- 表格、有序/无序列表、标题
- 加粗、斜体、链接、引用块
- DeepSeek 特有 `ds-markdown-paragraph` 段落

### exporter.py — Markdown 渲染

- user / assistant 独立编号，不假设严格交替配对
- 思考过程以 `<details>` 折叠块呈现（默认不导出）
- 支持自定义文件名
- 末尾附带统计摘要
- 去重检测：导出前与同目录已有文件比较标题+首问答内容
- 思考剥离工具：`strip_thinking_from_file()` / `strip_thinking_from_dir()` 可批量去除已有文件中的思考块

## 打包为 EXE

```bash
# 一键打包
build_exe.bat

# 或手动执行
uv sync --extra pack
uv run pyinstaller deepseek-exporter.spec --noconfirm --clean
```

生成的 EXE 位于 `dist/深寻全录.exe`。

> **注意**：运行 EXE 时需要 Playwright 浏览器运行时。首次使用前请执行 `playwright install chromium`，或将 `%LOCALAPPDATA%\ms-playwright` 目录一并分发。

## 设置说明

| 选项 | 说明 |
|------|------|
| 导出思考过程 | 默认关闭。思考过程是模型内部推理，信噪比低（约占 20-30% 体积但几乎不产生新知识条目），仅保留正式回答更干净 |
| 无头模式 | 后台运行浏览器（登录时需关闭此项） |
| 去除思考过程 | 后处理工具，批量去除导出目录中已有 .md 文件的 `<details>` 思考块 |

## 关于思考过程

根据实际使用经验（对线性代数和微分拓扑两本书共 83 轮对话的导出分析）：

- **默认不导出思考过程**，不是因为完全没有信息，而是信噪比太低
- 思考过程通常包含：重述计划、草稿措辞、自我更正、未采用的推测，与正式回答高度重叠
- 偶尔包含有价值的信息（定义动机、直观类比、备选思路），正确做法是将这些提炼进知识库，而非原样保留
- 如果手上只有带思考的版本，可导出后使用「去除思考过程」工具一键清理

## 下游工作流

导出的 Markdown 文件可作为知识库管道的输入（raw → wiki → output）：

1. **raw**：导出的 .md 文件作为原始素材
2. **wiki**：按概念建立结构化知识页（中文命名、双向链接）
3. **output**：生成章节地图、概念速查表、学习路线等

本工具是管道的第一步，确保导出内容完整、格式干净。

## 数据路径

| 路径 | 说明 |
|------|------|
| `.deepseek_exporter/chrome_profile/` | 浏览器登录数据（项目当前目录下） |
| `D:\0_Note\raw/` | 默认导出目录 |

## 许可

MIT