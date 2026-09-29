import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  staticFile,
  Audio,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Highlight, Circle } from "@remotion/rough-notation";
import { parseSrt } from "@remotion/captions";
import type { Caption } from "@remotion/captions";

const W = 1080;
const H = 1920;
const FPS = 30;

const C = {
  bg: "#0D1117",
  surface: "#161B22",
  card: "#21262D",
  border: "#30363D",
  accent: "#58A6FF",
  green: "#3FB950",
  red: "#F85149",
  orange: "#D29922",
  purple: "#BC8CFF",
  text: "#E6EDF3",
  muted: "#8B949E",
  white: "#FFFFFF",
};

const springCfg = { mass: 0.6, damping: 14, stiffness: 180 };

function useSpringIn(frame: number, startFrame: number, fps: number) {
  return spring({ frame: frame - startFrame, fps, ...springCfg });
}

const GlowDot: React.FC<{ x: number; y: number; color: string; delay: number }> = ({
  x, y, color, delay,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        opacity,
        transform: `scale(${scale})`,
        boxShadow: `0 0 12px ${color}`,
      }}
    />
  );
};

const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame, fps, ...springCfg });
  const redPulse = interpolate(frame, [20, 35, 50, 65, 80], [1, 1.15, 1, 1.1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame - 25, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeOpacity = interpolate(frame - 40, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", opacity: 0.15 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <GlowDot
            key={i}
            x={50 + (i * 97) % (W - 100)}
            y={100 + (i * 137) % (H - 200)}
            color={i % 3 === 0 ? C.accent : i % 3 === 1 ? C.red : C.purple}
            delay={i * 3}
          />
        ))}
      </div>

      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: C.red,
          transform: `scale(${titleScale * redPulse})`,
          textShadow: `0 0 40px ${C.red}80, 0 0 80px ${C.red}40`,
          lineHeight: 1.2,
          textAlign: "center",
          padding: "0 40px",
        }}
      >
        只能导出
        <br />
        <span style={{ fontSize: 160 }}>8 轮？！</span>
      </div>

      <div
        style={{
          marginTop: 40,
          fontSize: 44,
          color: C.muted,
          opacity: subOpacity,
          textAlign: "center",
        }}
      >
        DeepSeek 长对话，导出全丢了
      </div>

      <div
        style={{
          marginTop: 30,
          padding: "12px 32px",
          background: `${C.red}20`,
          border: `2px solid ${C.red}60`,
          borderRadius: 12,
          fontSize: 32,
          color: C.red,
          opacity: badgeOpacity,
          fontWeight: 600,
        }}
      >
        ⚠ 前 52 轮全部丢失
      </div>
    </AbsoluteFill>
  );
};

const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = [
    { text: "🧑 提问 1", color: C.accent },
    { text: "🤖 回答 1", color: C.green },
    { text: "🧑 提问 2", color: C.accent },
    { text: "🤖 回答 2", color: C.green },
    { text: "…", color: C.muted },
    { text: "🧑 提问 58", color: C.accent, dim: true },
    { text: "🤖 回答 58", color: C.green, dim: true },
    { text: "🧑 提问 59", color: C.accent, dim: true },
    { text: "🤖 回答 59", color: C.green, dim: true },
    { text: "🧑 提问 60", color: C.accent, dim: true },
    { text: "🤖 回答 60", color: C.green, dim: true },
  ];

  const titleS = spring({ frame, fps, ...springCfg });
  const cutLineY = interpolate(frame - 20, [0, 25], [-600, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: C.text,
          marginBottom: 50,
          transform: `scale(${titleS})`,
        }}
      >
        60 轮完整对话
      </div>

      <div style={{ position: "relative", width: 600, overflow: "hidden" }}>
        {lines.map((line, i) => {
          const lineOpacity = interpolate(frame - (8 + i * 4), [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const isDim = line.dim;
          return (
            <div
              key={i}
              style={{
                fontSize: 32,
                color: line.color,
                opacity: lineOpacity * (isDim ? 0.4 : 1),
                padding: "8px 0",
                fontFamily: "monospace",
                textDecoration: isDim ? "line-through" : "none",
                textDecorationColor: isDim ? C.red : undefined,
              }}
            >
              {line.text}
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            top: cutLineY,
            left: -20,
            right: -20,
            height: 3,
            background: C.red,
            boxShadow: `0 0 20px ${C.red}`,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: cutLineY + 10,
            left: 0,
            right: 0,
            fontSize: 36,
            fontWeight: 700,
            color: C.red,
            textAlign: "center",
            opacity: interpolate(frame - 40, [0, 10], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          ✂ 只剩 8 轮
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, ...springCfg });
  const subtitleOpacity = interpolate(frame - 15, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const steps = [
    { icon: "📋", text: "粘贴链接" },
    { icon: "▶️", text: "开始导出" },
    { icon: "🔄", text: "自动滚动遍历" },
    { icon: "✅", text: "精确转换" },
  ];

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: C.accent,
          transform: `scale(${logoS})`,
          textShadow: `0 0 30px ${C.accent}60`,
          letterSpacing: 8,
        }}
      >
        深寻全录
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: 36,
          color: C.muted,
          opacity: subtitleOpacity,
        }}
      >
        一键导出 DeepSeek 全部对话
      </div>

      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
        {steps.map((step, i) => {
          const s = spring({ frame: frame - (25 + i * 10), fps, ...springCfg });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 36px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                fontSize: 36,
                color: C.text,
                transform: `translateY(${(1 - s) * 40}px)`,
                opacity: s,
                boxShadow: `0 4px 20px ${C.bg}`,
              }}
            >
              <span style={{ fontSize: 40 }}>{step.icon}</span>
              <span style={{ fontWeight: 600 }}>{step.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Scene4Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftS = spring({ frame, fps, ...springCfg });
  const rightS = spring({ frame: frame - 10, fps, ...springCfg });
  const vsS = spring({ frame: frame - 20, fps, ...springCfg });

  const rightGlow = interpolate(frame - 30, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <div
          style={{
            width: 380,
            padding: "40px 24px",
            background: C.surface,
            border: `2px solid ${C.border}`,
            borderRadius: 20,
            textAlign: "center",
            transform: `scale(${leftS})`,
            opacity: leftS,
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 900, color: C.red }}>8</div>
          <div style={{ fontSize: 28, color: C.muted, marginTop: 8 }}>轮</div>
          <div style={{ fontSize: 22, color: C.red, marginTop: 16 }}>❌ 不完整</div>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: C.muted,
            transform: `scale(${vsS})`,
            opacity: vsS,
          }}
        >
          VS
        </div>

        <div
          style={{
            width: 380,
            padding: "40px 24px",
            background: C.surface,
            border: `2px solid ${C.green}`,
            borderRadius: 20,
            textAlign: "center",
            transform: `scale(${rightS})`,
            opacity: rightS,
            boxShadow: rightGlow > 0 ? `0 0 40px ${C.green}40, 0 0 80px ${C.green}20` : "none",
          }}
        >
          <div style={{ fontSize: 72, fontWeight: 900, color: C.green }}>60</div>
          <div style={{ fontSize: 28, color: C.muted, marginTop: 8 }}>轮</div>
          <div style={{ fontSize: 22, color: C.green, marginTop: 16 }}>✅ 完整无遗漏</div>
        </div>
      </div>

      <div
        style={{
          marginTop: 50,
          fontSize: 32,
          color: C.muted,
          opacity: interpolate(frame - 40, [0, 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        KaTeX 公式 · 代码块 · 表格 — 全部保留
      </div>
    </AbsoluteFill>
  );
};

const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "📦", text: "批量导出", color: C.accent },
    { icon: "✏️", text: "自定义命名", color: C.purple },
    { icon: "🔍", text: "自动去重", color: C.green },
    { icon: "🧹", text: "去除思考过程", color: C.orange },
    { icon: "🌙", text: "VSCode 暗黑主题", color: C.accent },
    { icon: "🔄", text: "Playwright 驱动", color: C.purple },
  ];

  const titleS = spring({ frame, fps, ...springCfg });

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontSize: 52,
          fontWeight: 700,
          color: C.text,
          marginBottom: 50,
          transform: `scale(${titleS})`,
        }}
      >
        不仅如此
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          padding: "0 60px",
          width: "100%",
          maxWidth: 900,
        }}
      >
        {features.map((f, i) => {
          const s = spring({ frame: frame - (10 + i * 7), fps, ...springCfg });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "20px 24px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${f.color}`,
                borderRadius: 12,
                fontSize: 30,
                color: C.text,
                transform: `translateY(${(1 - s) * 30}px)`,
                opacity: s,
              }}
            >
              <span style={{ fontSize: 36 }}>{f.icon}</span>
              <span style={{ fontWeight: 600 }}>{f.text}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoS = spring({ frame, fps, ...springCfg });
  const subOpacity = interpolate(frame - 15, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlOpacity = interpolate(frame - 25, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const starPulse = interpolate(frame - 35, [0, 15, 30, 45], [0, 1.2, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontSize: 90,
          fontWeight: 900,
          color: C.accent,
          transform: `scale(${logoS})`,
          textShadow: `0 0 40px ${C.accent}60`,
          letterSpacing: 6,
        }}
      >
        深寻全录
      </div>

      <div
        style={{
          marginTop: 24,
          fontSize: 36,
          color: C.muted,
          opacity: subOpacity,
        }}
      >
        开源免费 · 开箱即用
      </div>

      <div
        style={{
          marginTop: 40,
          padding: "16px 40px",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          fontSize: 28,
          fontFamily: "monospace",
          color: C.accent,
          opacity: urlOpacity,
        }}
      >
        github.com/lyp0746/deepseek-md-exporter
      </div>

      <div
        style={{
          marginTop: 30,
          fontSize: 48,
          color: C.orange,
          transform: `scale(${starPulse})`,
          opacity: urlOpacity,
        }}
      >
        ⭐ Star 支持一下
      </div>
    </AbsoluteFill>
  );
};

const srtText = `1\n00:00:00,100 --> 00:00:02,413\nDeepSeek 只能导出8轮？\n\n2\n00:00:02,363 --> 00:00:05,147\n学了60轮，导出只剩8轮\n\n3\n00:00:05,147 --> 00:00:08,079\n深寻全录，一键完整导出\n\n4\n00:00:08,079 --> 00:00:11,090\n8轮对比60轮，完整无遗漏\n\n5\n00:00:11,090 --> 00:00:14,329\n批量导出，自动去重，只留干货\n\n6\n00:00:14,329 --> 00:00:17,204\n开源免费，Star支持一下`;

const { captions: parsedCaptions } = parseSrt({ input: srtText });

const CaptionOverlay: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const active = captions.find(
    (c) => currentMs >= c.startMs && currentMs <= c.endMs
  );

  if (!active) return null;

  const progress = (currentMs - active.startMs) / (active.endMs - active.startMs);
  const chars = Math.ceil(active.text.length * Math.min(progress * 1.5, 1));
  const visibleText = active.text.slice(0, chars);

  return (
    <div
      style={{
        fontSize: 44,
        fontWeight: 700,
        color: C.white,
        textShadow: "0 2px 12px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5)",
        textAlign: "center",
        lineHeight: 1.4,
        maxWidth: 900,
      }}
    >
      {visibleText}
      <span style={{ opacity: 0.3 }}>{active.text.slice(chars)}</span>
    </div>
  );
};

export const DeepSeekPromo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90} name="Hook">
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={100} name="Problem">
          <Scene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
        <TransitionSeries.Sequence durationInFrames={100} name="Solution">
          <Scene3Solution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={90} name="Result">
          <Scene4Result />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide()}
          timing={linearTiming({ durationInFrames: 10 })}
        />
        <TransitionSeries.Sequence durationInFrames={90} name="Features">
          <Scene5Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 12 })}
        />
        <TransitionSeries.Sequence durationInFrames={75} name="CTA">
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <Audio src={staticFile("voiceover.mp3")} volume={1} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 100,
        }}
      >
        <CaptionOverlay captions={parsedCaptions} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};