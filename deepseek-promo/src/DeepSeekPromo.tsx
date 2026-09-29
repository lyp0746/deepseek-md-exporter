import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Sequence,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

const COLORS = {
  bg: "#0D1117",
  surface: "#161B22",
  card: "#21262D",
  border: "#30363D",
  blue: "#58A6FF",
  red: "#F85149",
  green: "#3FB950",
  orange: "#D29922",
  purple: "#BC8CFF",
  text: "#E6EDF3",
  gray: "#8B949E",
};

const SPRING = { mass: 0.6, damping: 14, stiffness: 180 };
const FPS = 30;

const SCENE_DURATIONS = [80, 90, 98, 98, 105, 95];
const TRANSITION_FRAMES = 10;
const TOTAL_FRAMES = SCENE_DURATIONS.reduce((a, b) => a + b, 0) - TRANSITION_FRAMES * 5;

const GlowDot: React.FC<{
  x: number;
  y: number;
  color: string;
  delay: number;
}> = ({ x, y, color, delay }) => {
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

const ParticleField: React.FC<{ count?: number; color?: string }> = ({
  count = 30,
  color = COLORS.blue,
}) => {
  const particles = React.useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * 1080,
        y: Math.random() * 1920,
        delay: Math.random() * 40,
        c: [COLORS.blue, COLORS.purple, COLORS.green, color][
          Math.floor(Math.random() * 4)
        ],
      });
    }
    return arr;
  }, [count, color]);
  return (
    <>
      {particles.map((p, i) => (
        <GlowDot key={i} x={p.x} y={p.y} color={p.c} delay={p.delay} />
      ))}
    </>
  );
};

const ManimCircle: React.FC<{
  cx: number;
  cy: number;
  r: number;
  color: string;
  delay: number;
}> = ({ cx, cy, r, color, delay }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame - delay, [0, 15], [0, 0.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg
      style={{
        position: "absolute",
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        opacity,
      }}
    >
      <circle
        cx={r}
        cy={r}
        r={r * progress}
        fill="none"
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  );
};

const ManimLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  delay: number;
}> = ({ x1, y1, x2, y2, color, delay }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame - delay, [0, 15], [0, 0.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cx = x1 + (x2 - x1) * progress;
  const cy = y1 + (y2 - y1) * progress;
  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1080,
        height: 1920,
        opacity,
        pointerEvents: "none",
      }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={cx}
        y2={cy}
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  );
};

const PulseGlow: React.FC<{
  x: number;
  y: number;
  color: string;
  size?: number;
}> = ({ x, y, color, size = 200 }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(frame, [0, 30], [0.6, 1], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 15], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        transform: `scale(${pulse})`,
      }}
    />
  );
};

const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, ...SPRING });
  const subtitleOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulseScale = interpolate(frame, [0, 45, 90], [1, 1.05, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ParticleField count={35} color={COLORS.red} />
      <ManimCircle cx={540} cy={960} r={300} color={COLORS.red} delay={5} />
      <ManimCircle cx={540} cy={960} r={200} color={COLORS.orange} delay={10} />
      <PulseGlow x={540} y={960} color={COLORS.red} size={500} />

      <div
        style={{
          fontSize: 160,
          fontWeight: 900,
          color: COLORS.red,
          transform: `scale(${titleSpring * pulseScale})`,
          textShadow: `0 0 60px ${COLORS.red}, 0 0 120px rgba(248,81,73,0.3)`,
          zIndex: 10,
          letterSpacing: -4,
        }}
      >
        8轮?!
      </div>

      <div
        style={{
          fontSize: 36,
          color: COLORS.gray,
          opacity: subtitleOpacity,
          marginTop: 30,
          zIndex: 10,
        }}
      >
        DeepSeek 官方导出限制
      </div>

      <div
        style={{
          position: "absolute",
          top: 160,
          right: 80,
          fontSize: 28,
          color: COLORS.red,
          opacity: interpolate(frame, [15, 30], [0, 0.8], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          border: `2px solid ${COLORS.red}`,
          borderRadius: 8,
          padding: "8px 16px",
          zIndex: 10,
        }}
      >
        ⚠ 仅最近8轮
      </div>
    </div>
  );
};

const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = [
    "第1轮：什么是机器学习？",
    "第2轮：解释一下神经网络",
    "第3轮：CNN的原理是什么？",
    "...",
    "第58轮：如何优化模型？",
    "第59轮：损失函数怎么选？",
    "第60轮：总结一下重点",
  ];

  const cutProgress = interpolate(frame, [30, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 40,
      }}
    >
      <ManimCircle cx={200} cy={400} r={150} color={COLORS.purple} delay={5} />
      <ManimCircle cx={880} cy={1500} r={120} color={COLORS.blue} delay={8} />

      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: 40,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        60轮对话
      </div>

      <div style={{ width: 800, zIndex: 10 }}>
        {lines.map((line, i) => {
          const lineDelay = i * 5;
          const lineOpacity = interpolate(
            frame - lineDelay,
            [0, 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const isCut = i < lines.length - 3 && cutProgress > (i + 1) / (lines.length - 2);
          const isKept = i >= lines.length - 3;

          return (
            <div
              key={i}
              style={{
                fontSize: 28,
                color: isCut ? COLORS.gray : isKept ? COLORS.text : COLORS.text,
                opacity: lineOpacity * (isCut ? 0.3 : 1),
                padding: "8px 16px",
                marginBottom: 6,
                borderRadius: 8,
                background: isKept
                  ? `linear-gradient(90deg, ${COLORS.card} 0%, transparent 100%)`
                  : "transparent",
                textDecoration: isCut ? "line-through" : "none",
                transition: "all 0.3s",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      <svg
        style={{
          position: "absolute",
          left: 140,
          top: 400 + cutProgress * 800,
          width: 800,
          height: 4,
          opacity: cutProgress > 0 ? 0.8 : 0,
          zIndex: 20,
        }}
      >
        <line x1={0} y1={0} x2={800} y2={0} stroke={COLORS.red} strokeWidth={3} />
      </svg>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: COLORS.red,
          marginTop: 30,
          opacity: interpolate(frame, [50, 70], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 10,
        }}
      >
        → 只剩8轮?!
      </div>
    </div>
  );
};

const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, ...SPRING });
  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const steps = [
    { icon: "🔑", text: "登录 DeepSeek" },
    { icon: "📋", text: "粘贴对话链接" },
    { icon: "▶", text: "一键完整导出" },
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ParticleField count={20} color={COLORS.blue} />
      <ManimCircle cx={540} cy={960} r={350} color={COLORS.blue} delay={3} />
      <PulseGlow x={540} y={800} color={COLORS.blue} size={600} />

      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          color: COLORS.blue,
          transform: `scale(${titleSpring})`,
          textShadow: `0 0 40px ${COLORS.blue}, 0 0 80px rgba(88,166,255,0.3)`,
          zIndex: 10,
          letterSpacing: 8,
        }}
      >
        深寻全录
      </div>

      <div
        style={{
          fontSize: 32,
          color: COLORS.gray,
          opacity: subtitleOpacity,
          marginTop: 20,
          zIndex: 10,
        }}
      >
        突破8轮限制 · 完整导出
      </div>

      <div style={{ marginTop: 60, zIndex: 10 }}>
        {steps.map((step, i) => {
          const delay = 25 + i * 15;
          const stepSpring = spring({
            frame: frame - delay,
            fps,
            ...SPRING,
          });
          const stepOpacity = interpolate(frame - delay, [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: "20px 32px",
                marginBottom: 16,
                width: 600,
                opacity: stepOpacity,
                transform: `translateY(${(1 - stepSpring) * 40}px)`,
                borderLeft: `4px solid ${COLORS.blue}`,
              }}
            >
              <span style={{ fontSize: 36, marginRight: 20 }}>{step.icon}</span>
              <span style={{ fontSize: 28, color: COLORS.text, fontWeight: 600 }}>
                {step.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Scene4Effect: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const beforeSpring = spring({ frame, fps, ...SPRING });
  const afterSpring = spring({ frame: frame - 30, fps, ...SPRING });
  const arrowProgress = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const beforeItems = Array.from({ length: 8 }, (_, i) => `第${i + 1}轮`);
  const afterItems = Array.from({ length: 20 }, (_, i) => `第${i + 1}轮`);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        gap: 40,
        padding: 60,
      }}
    >
      <ManimLine x1={270} y1={600} x2={270} y2={1300} color={COLORS.red} delay={5} />
      <ManimLine x1={810} y1={400} x2={810} y2={1500} color={COLORS.green} delay={35} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${beforeSpring})`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.red,
            marginBottom: 20,
          }}
        >
          Before
        </div>
        <div
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 24,
            width: 380,
            border: `2px solid ${COLORS.red}`,
          }}
        >
          {beforeItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 22,
                color: COLORS.gray,
                padding: "4px 8px",
                opacity: 0.5,
              }}
            >
              {item}
            </div>
          ))}
          <div
            style={{
              fontSize: 22,
              color: COLORS.red,
              padding: "8px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            ... 仅8轮
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 60,
          color: COLORS.green,
          opacity: arrowProgress,
          zIndex: 10,
        }}
      >
        →
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${afterSpring})`,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.green,
            marginBottom: 20,
          }}
        >
          After
        </div>
        <div
          style={{
            backgroundColor: COLORS.card,
            borderRadius: 16,
            padding: 24,
            width: 380,
            border: `2px solid ${COLORS.green}`,
            boxShadow: `0 0 30px rgba(63,185,80,0.2)`,
          }}
        >
          {afterItems.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 22,
                color: COLORS.text,
                padding: "4px 8px",
              }}
            >
              {item}
            </div>
          ))}
          <div
            style={{
              fontSize: 22,
              color: COLORS.green,
              padding: "8px",
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            ... 全部60轮 ✓
          </div>
        </div>
      </div>
    </div>
  );
};

const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { icon: "📋", text: "完整导出", color: COLORS.blue },
    { icon: "🔄", text: "批量处理", color: COLORS.green },
    { icon: "🔍", text: "自动去重", color: COLORS.orange },
    { icon: "🧠", text: "思维链", color: COLORS.purple },
    { icon: "📝", text: "精确转换", color: COLORS.blue },
    { icon: "🔐", text: "登录保持", color: COLORS.green },
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: 60,
      }}
    >
      <ManimCircle cx={540} cy={960} r={400} color={COLORS.purple} delay={3} />
      <ManimCircle cx={300} cy={600} r={100} color={COLORS.blue} delay={8} />
      <ManimCircle cx={780} cy={1300} r={120} color={COLORS.green} delay={12} />

      <div
        style={{
          fontSize: 44,
          fontWeight: 700,
          color: COLORS.text,
          marginBottom: 50,
          opacity: interpolate(frame, [0, 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          zIndex: 10,
        }}
      >
        核心功能
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          zIndex: 10,
        }}
      >
        {features.map((feat, i) => {
          const delay = 10 + i * 8;
          const featSpring = spring({
            frame: frame - delay,
            fps,
            ...SPRING,
          });
          const featOpacity = interpolate(frame - delay, [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 16,
                padding: "24px 28px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: 420,
                opacity: featOpacity,
                transform: `scale(${featSpring})`,
                borderLeft: `4px solid ${feat.color}`,
                boxShadow: `0 0 20px rgba(0,0,0,0.3)`,
              }}
            >
              <span style={{ fontSize: 36 }}>{feat.icon}</span>
              <span
                style={{
                  fontSize: 28,
                  color: COLORS.text,
                  fontWeight: 600,
                }}
              >
                {feat.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, ...SPRING });
  const subtitleSpring = spring({ frame: frame - 15, fps, ...SPRING });
  const breathe = interpolate(frame, [0, 30, 60, 75], [1, 1.08, 1, 1.08], {
    extrapolateRight: "clamp",
  });
  const starOpacity = interpolate(frame, [25, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <ParticleField count={25} color={COLORS.green} />
      <ManimCircle cx={540} cy={960} r={300} color={COLORS.green} delay={5} />
      <PulseGlow x={540} y={900} color={COLORS.green} size={500} />

      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          color: COLORS.text,
          transform: `scale(${titleSpring})`,
          zIndex: 10,
          letterSpacing: 6,
        }}
      >
        深寻全录
      </div>

      <div
        style={{
          fontSize: 32,
          color: COLORS.green,
          marginTop: 20,
          transform: `scale(${subtitleSpring})`,
          zIndex: 10,
        }}
      >
        开源免费 · 完整导出
      </div>

      <div
        style={{
          marginTop: 50,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 26,
            color: COLORS.gray,
            fontFamily: "Consolas, monospace",
            opacity: starOpacity,
          }}
        >
          github.com/username/deepseek-md-exporter
        </div>

        <div
          style={{
            fontSize: 48,
            color: COLORS.orange,
            opacity: starOpacity,
            transform: `scale(${breathe})`,
            textShadow: `0 0 20px ${COLORS.orange}`,
          }}
        >
          ⭐ Star
        </div>
      </div>
    </div>
  );
};

const CaptionOverlay: React.FC<{
  captions: Array<{ startMs: number; endMs: number; text: string }>;
}> = ({ captions }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const active = captions.find(
    (c) => currentMs >= c.startMs && currentMs <= c.endMs
  );
  if (!active) return null;
  const progress =
    (currentMs - active.startMs) / (active.endMs - active.startMs);
  const chars = Math.ceil(active.text.length * Math.min(progress * 1.5, 1));

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 44,
        fontWeight: 700,
        color: "white",
        textShadow: "0 2px 12px rgba(0,0,0,0.9)",
        zIndex: 100,
      }}
    >
      <span>{active.text.slice(0, chars)}</span>
      <span style={{ opacity: 0.3 }}>{active.text.slice(chars)}</span>
    </div>
  );
};

const SRT_CAPTIONS = [
  { startMs: 100, endMs: 2413, text: "DeepSeek只能导出8轮？" },
  { startMs: 2363, endMs: 5147, text: "学了60轮，导出只剩8轮" },
  { startMs: 5147, endMs: 8079, text: "深寻全录，一键完整导出" },
  { startMs: 8079, endMs: 11090, text: "8轮对比60轮，完整无遗漏" },
  { startMs: 11090, endMs: 14329, text: "批量导出，自动去重，只留干货" },
  { startMs: 14329, endMs: 17204, text: "开源免费，Star支持一下" },
];

const BgmWithDucking: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgmVolumeCallback = React.useCallback(
    (f: number) => {
      const currentMs = (f / fps) * 1000;
      const isSpeaking = SRT_CAPTIONS.some(
        (c) => currentMs >= c.startMs - 300 && currentMs <= c.endMs + 300
      );
      return isSpeaking ? 0.15 : 0.40;
    },
    [fps]
  );

  return <Audio src={staticFile("bgm.mp3")} volume={bgmVolumeCallback} />;
};

export const DeepSeekPromo: React.FC = () => {
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        backgroundColor: COLORS.bg,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[0]}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[1]}>
          <Scene2Problem />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[2]}>
          <Scene3Solution />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[3]}>
          <Scene4Effect />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[4]}>
          <Scene5Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS[5]}>
          <Scene6CTA />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CaptionOverlay captions={SRT_CAPTIONS} />

      <Audio src={staticFile("voiceover.mp3")} volume={() => 1.5} />
      <BgmWithDucking />
    </div>
  );
};