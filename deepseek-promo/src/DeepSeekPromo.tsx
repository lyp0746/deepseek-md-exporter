import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";

const COLORS = {
  bg: "#1E1E1E",
  card: "#2D2D2D",
  accent: "#569CD7",
  red: "#F44747",
  green: "#6A9955",
  yellow: "#DCDCAA",
  white: "#D4D4D4",
  dim: "#808080",
  orange: "#CE9178",
};

const FONT = {
  title: { fontFamily: "Microsoft YaHei, sans-serif", fontWeight: 700 },
  body: { fontFamily: "Microsoft YaHei, sans-serif", fontWeight: 400 },
  mono: { fontFamily: "Consolas, monospace", fontWeight: 400 },
};

function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 100 },
  });
  const translateY = interpolate(opacity, [0, 1], [30, 0]);
  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)`, ...style }}>
      {children}
    </div>
  );
}

function ScaleIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 120 },
  });
  return (
    <div style={{ transform: `scale(${scale})`, ...style }}>{children}</div>
  );
}

function TypingText({
  text,
  delay = 0,
  speed = 2,
  style,
}: {
  text: string;
  delay?: number;
  speed?: number;
  style?: React.CSSProperties;
}) {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - delay) / speed));
  return (
    <div style={style}>
      {text.slice(0, chars)}
      {chars < text.length && chars >= 0 && (
        <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0 }}>|</span>
      )}
    </div>
  );
}

function GridBackground() {
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="grid"
            width="60"
            height="60"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="#2A2A2A"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={COLORS.bg} />
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </AbsoluteFill>
  );
}

function Scene1Hook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const shake = frame < 15 ? Math.sin(frame * 2) * 8 * (1 - frame / 15) : 0;
  const pulse = 1 + Math.sin(frame * 0.15) * 0.03;

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `translateX(${shake}px) scale(${pulse})`,
        }}
      >
        <ScaleIn delay={5}>
          <div
            style={{
              background: COLORS.red,
              borderRadius: 24,
              padding: "30px 80px",
              boxShadow: `0 0 60px ${COLORS.red}44`,
            }}
          >
            <div
              style={{
                ...FONT.title,
                fontSize: 80,
                color: "white",
                textAlign: "center",
              }}
            >
              DeepSeek 只能导出 8 轮？！
            </div>
          </div>
        </ScaleIn>
        <FadeIn delay={20}>
          <div
            style={{
              ...FONT.body,
              fontSize: 36,
              color: COLORS.dim,
              marginTop: 40,
              textAlign: "center",
            }}
          >
            长对话全丢了？数学公式全没了？
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene2Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalLines = 12;
  const visibleLines = Math.min(
    totalLines,
    Math.floor(frame / 3) + 1
  );

  const lines = [
    { text: "对话列表", color: COLORS.white },
    { text: "├─ 第 1 轮  🧑 提问", color: COLORS.dim },
    { text: "├─ 第 2 轮  🤖 回答", color: COLORS.dim },
    { text: "├─ ...", color: COLORS.dim },
    { text: "├─ 第 55 轮  🧑 提问", color: COLORS.dim },
    { text: "├─ 第 56 轮  🤖 回答", color: COLORS.dim },
    { text: "├─ 第 57 轮  🧑 提问", color: COLORS.dim },
    { text: "├─ 第 58 轮  🤖 回答", color: COLORS.dim },
    { text: "├─ 第 59 轮  🧑 提问", color: COLORS.dim },
    { text: "└─ 第 60 轮  🤖 回答", color: COLORS.dim },
    { text: "", color: COLORS.dim },
    { text: "点击「导出」→  只剩 8 轮", color: COLORS.red },
  ];

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <FadeIn>
          <div
            style={{
              ...FONT.title,
              fontSize: 48,
              color: COLORS.red,
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            ❌ 官方导出：前 52 轮全部丢失
          </div>
        </FadeIn>
        <div
          style={{
            background: COLORS.card,
            borderRadius: 16,
            padding: "30px 50px",
            width: 700,
          }}
        >
          {lines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              style={{
                ...FONT.mono,
                fontSize: 24,
                color: line.color,
                lineHeight: 1.8,
              }}
            >
              {line.text}
            </div>
          ))}
        </div>
        {visibleLines >= totalLines && (
          <FadeIn delay={totalLines * 3 + 5}>
            <div
              style={{
                ...FONT.body,
                fontSize: 28,
                color: COLORS.orange,
                marginTop: 30,
                textAlign: "center",
              }}
            >
              学了 60 轮线性代数，导出来只剩 8 轮
            </div>
          </FadeIn>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene3Solution() {
  const steps = [
    { num: "①", title: "粘贴对话链接", desc: "https://chat.deepseek.com/a/..." },
    { num: "②", title: "点击「开始导出」", desc: "Playwright 驱动真实浏览器" },
    { num: "③", title: "自动滚动遍历虚拟列表", desc: "scrollTop=0 → 逐屏向下 → 到底" },
    { num: "④", title: "HTML → Markdown 精确转换", desc: "KaTeX / 代码块 / 表格" },
  ];

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <FadeIn>
          <div
            style={{
              ...FONT.title,
              fontSize: 52,
              color: COLORS.accent,
              marginBottom: 50,
              textAlign: "center",
            }}
          >
            ✅ 深寻全录 — 完整导出
          </div>
        </FadeIn>
        <div style={{ width: 800 }}>
          {steps.map((step, i) => (
            <FadeIn key={i} delay={10 + i * 8}>
              <div
                style={{
                  background: COLORS.card,
                  borderRadius: 12,
                  padding: "20px 30px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <div
                  style={{
                    ...FONT.title,
                    fontSize: 36,
                    color: COLORS.accent,
                    width: 50,
                  }}
                >
                  {step.num}
                </div>
                <div>
                  <div
                    style={{ ...FONT.title, fontSize: 28, color: COLORS.white }}
                  >
                    {step.title}
                  </div>
                  <div
                    style={{ ...FONT.mono, fontSize: 18, color: COLORS.dim, marginTop: 4 }}
                  >
                    {step.desc}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene4Result() {
  const frame = useCurrentFrame();

  const leftScale = spring({
    frame: frame - 5,
    fps: 30,
    config: { damping: 15 },
  });
  const rightScale = spring({
    frame: frame - 15,
    fps: 30,
    config: { damping: 15 },
  });

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <FadeIn>
          <div
            style={{
              ...FONT.title,
              fontSize: 48,
              color: COLORS.accent,
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            📊 导出效果对比
          </div>
        </FadeIn>
        <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
          <div
            style={{
              background: COLORS.red + "33",
              border: `2px solid ${COLORS.red}`,
              borderRadius: 20,
              padding: "40px 50px",
              textAlign: "center",
              transform: `scale(${leftScale})`,
              width: 280,
            }}
          >
            <div
              style={{ ...FONT.title, fontSize: 28, color: COLORS.red }}
            >
              官方导出
            </div>
            <div
              style={{
                ...FONT.title,
                fontSize: 96,
                color: COLORS.red,
                marginTop: 20,
              }}
            >
              8
            </div>
            <div style={{ ...FONT.body, fontSize: 20, color: COLORS.dim }}>
              轮
            </div>
            <div
              style={{
                ...FONT.body,
                fontSize: 16,
                color: COLORS.red,
                marginTop: 15,
              }}
            >
              前 52 轮丢失
            </div>
          </div>
          <FadeIn delay={10}>
            <div
              style={{
                ...FONT.title,
                fontSize: 48,
                color: COLORS.dim,
              }}
            >
              VS
            </div>
          </FadeIn>
          <div
            style={{
              background: COLORS.green + "33",
              border: `2px solid ${COLORS.green}`,
              borderRadius: 20,
              padding: "40px 50px",
              textAlign: "center",
              transform: `scale(${rightScale})`,
              width: 280,
            }}
          >
            <div
              style={{ ...FONT.title, fontSize: 28, color: COLORS.green }}
            >
              深寻全录
            </div>
            <div
              style={{
                ...FONT.title,
                fontSize: 96,
                color: COLORS.green,
                marginTop: 20,
              }}
            >
              60
            </div>
            <div style={{ ...FONT.body, fontSize: 20, color: COLORS.dim }}>
              轮
            </div>
            <div
              style={{
                ...FONT.body,
                fontSize: 16,
                color: COLORS.green,
                marginTop: 15,
              }}
            >
              完整无遗漏
            </div>
          </div>
        </div>
        <FadeIn delay={25}>
          <div
            style={{
              ...FONT.body,
              fontSize: 24,
              color: COLORS.yellow,
              marginTop: 40,
              textAlign: "center",
            }}
          >
            KaTeX 公式 · 代码块 · 表格 — 全部完美保留
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene5Features() {
  const features = [
    { icon: "🚀", text: "突破 8 轮限制，完整导出全部历史消息" },
    { icon: "📐", text: "KaTeX 公式 · 代码块 · 表格完美保留" },
    { icon: "📦", text: "批量导出 · 自定义命名 · 自动去重" },
    { icon: "🧹", text: "思考过程默认关闭，只留干货" },
    { icon: "🌙", text: "VSCode Dark+ 暗黑主题" },
    { icon: "🔗", text: "raw → wiki 知识库 → 速查表" },
  ];

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <FadeIn>
          <div
            style={{
              ...FONT.title,
              fontSize: 48,
              color: COLORS.accent,
              marginBottom: 40,
              textAlign: "center",
            }}
          >
            ⚡ 功能全览
          </div>
        </FadeIn>
        <div style={{ width: 700 }}>
          {features.map((feat, i) => (
            <FadeIn key={i} delay={5 + i * 5}>
              <div
                style={{
                  background: COLORS.card,
                  borderRadius: 12,
                  padding: "16px 24px",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ fontSize: 28 }}>{feat.icon}</div>
                <div
                  style={{ ...FONT.body, fontSize: 24, color: COLORS.white }}
                >
                  {feat.text}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Scene6CTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = Math.sin(frame * 0.1) * 0.3 + 0.7;

  return (
    <AbsoluteFill>
      <GridBackground />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <ScaleIn delay={5}>
          <div
            style={{
              ...FONT.title,
              fontSize: 80,
              color: COLORS.accent,
              textAlign: "center",
              letterSpacing: 20,
            }}
          >
            深寻全录
          </div>
        </ScaleIn>
        <FadeIn delay={15}>
          <div
            style={{
              ...FONT.body,
              fontSize: 32,
              color: COLORS.white,
              marginTop: 20,
              textAlign: "center",
            }}
          >
            DeepSeek 对话完整导出工具
          </div>
        </FadeIn>
        <FadeIn delay={25}>
          <div
            style={{
              background: COLORS.accent,
              borderRadius: 20,
              padding: "20px 60px",
              marginTop: 50,
              boxShadow: `0 0 40px ${COLORS.accent}${Math.floor(glow * 99).toString(16).padStart(2, "0")}`,
            }}
          >
            <div
              style={{
                ...FONT.title,
                fontSize: 32,
                color: "white",
                textAlign: "center",
              }}
            >
              ⭐ 开源免费 · MIT License
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={35}>
          <div
            style={{
              ...FONT.mono,
              fontSize: 24,
              color: COLORS.accent,
              marginTop: 40,
              textAlign: "center",
            }}
          >
            github.com/lyp0746/deepseek-md-exporter
          </div>
        </FadeIn>
        <FadeIn delay={45}>
          <div
            style={{
              ...FONT.body,
              fontSize: 22,
              color: COLORS.dim,
              marginTop: 30,
              textAlign: "center",
            }}
          >
            让每个 DeepSeek 对话都不丢失
          </div>
        </FadeIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const DeepSeekPromo: React.FC = () => {
  const { fps } = useVideoConfig();

  const sceneDurations = [90, 100, 100, 90, 90, 75];
  let offset = 0;
  const sequences = [
    { from: offset, duration: sceneDurations[0], Component: Scene1Hook },
    { from: (offset += sceneDurations[0]), duration: sceneDurations[1], Component: Scene2Problem },
    { from: (offset += sceneDurations[1]), duration: sceneDurations[2], Component: Scene3Solution },
    { from: (offset += sceneDurations[2]), duration: sceneDurations[3], Component: Scene4Result },
    { from: (offset += sceneDurations[3]), duration: sceneDurations[4], Component: Scene5Features },
    { from: (offset += sceneDurations[4]), duration: sceneDurations[5], Component: Scene6CTA },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {sequences.map(({ from, duration, Component }, i) => (
        <Sequence key={i} from={from} durationInFrames={duration}>
          <Component />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};