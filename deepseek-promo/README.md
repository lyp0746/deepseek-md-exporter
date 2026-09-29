# 深寻全录 — 推广视频

使用 [Remotion](https://www.remotion.dev/) 制作的抖音竖版推广视频，Manim 风格技术动画。

## 视觉风格

参考 B 站 UP 主「**隔壁的程序员老王**」的技术讲解风格：

- **Manim 风格动画**：几何图形（圆环、连线）、渐显、书写动画、粒子效果
- **GitHub Dark 配色**：深色背景 `#0D1117`，蓝 `#58A6FF` / 红 `#F85149` / 绿 `#3FB950` 强调
- **逐步拆解**：痛点 → 问题 → 方案 → 效果 → 功能 → CTA
- **平滑转场**：fade / slide 交替

## 项目结构

```
deepseek-promo/
├── src/
│   ├── index.tsx             # Remotion 入口，注册 Composition
│   └── DeepSeekPromo.tsx     # 6 场景视频组件
├── public/
│   ├── voiceover.mp3         # Edge TTS 配音
│   └── voiceover.srt         # 配音时间轴
├── subtitles.srt             # 视频字幕（音画同步）
├── SCRIPT.md                 # 视频脚本（分镜表）
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

## 6 场景结构

| # | 场景 | 帧数 | 配音 | 内容 |
|---|------|------|------|------|
| 1 | 钩子 | 80 | 0-2.4s | 红字「8轮?!」弹入 + 粒子 + 脉冲光晕 |
| 2 | 问题 | 90 | 2.4-5.1s | 60轮对话列表 + 红色切割线 |
| 3 | 方案 | 98 | 5.1-8.1s | 「深寻全录」弹入 + 步骤卡片 |
| 4 | 效果 | 98 | 8.1-11.1s | Before/After 对比 + 绿色辉光 |
| 5 | 功能 | 105 | 11.1-14.3s | 2×3 功能卡片网格 |
| 6 | CTA | 95 | 14.3-17.2s | GitHub + Star 呼吸脉冲 |

**总时长 17.2 秒**，竖版 1080×1920，30fps。

## Manim 风格组件

| 组件 | 效果 |
|------|------|
| `ManimCircle` | SVG 圆环渐显 + 缩放 |
| `ManimLine` | 连线从起点延伸到终点 |
| `GlowDot` / `ParticleField` | 发光粒子散布 |
| `PulseGlow` | 呼吸式光晕脉冲 |

## 使用

```bash
# 安装依赖
npm install

# 启动预览
npx remotion studio

# 渲染 MP4
npx remotion render DeepSeekPromo out/video.mp4
```

## 配音

使用 Edge TTS（`zh-CN-YunxiNeural`）生成，速率 +10%，音量 ×1.5：

```bash
edge-tts --voice zh-CN-YunxiNeural --rate "+10%" \
  --text "配音文案" \
  --write-media public/voiceover.mp3 \
  --write-subtitles public/voiceover.srt
```

## 背景音乐

使用 FFmpeg 合成简约电子风 BGM（6 层正弦波叠加 + 低通/高通滤波）：

```bash
ffmpeg -y \
  -f lavfi -i "sine=frequency=55:duration=18" \
  -f lavfi -i "sine=frequency=110:duration=18" \
  ... \
  -c:a libmp3lame -b:a 128k public/bgm.mp3
```

### Audio Ducking

BGM 音量根据人声自动调节：
- **人声段**：BGM → 0.12（不干扰听感）
- **静音段**：BGM → 0.30（保持节奏感）
- **200ms 缓冲**：人声前后各留缓冲，避免突变

## 发布

渲染出的 `out/video.mp4` 自带配音 + 烧录字幕，直接上传抖音即可。

推荐标题（≤20 字，前 7 字抓人）：
- 「DeepSeek只能导8轮？一键全导出！」
- 「60轮对话只导8轮？这工具全导出」