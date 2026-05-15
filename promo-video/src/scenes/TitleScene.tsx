import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";
import { colors, fonts } from "../styles";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const lineWidth = interpolate(frame, [10, 30], [0, 500], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const taglineOpacity = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [20, 40], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const flashOpacity = interpolate(frame, [0, 8], [0.2, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(ellipse at center, #1a1408 0%, ${colors.bg} 70%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient particles */}
      {Array.from({ length: 30 }).map((_, i) => {
        const x = (i * 137.5) % 100;
        const delay = i * 0.3;
        const y = ((frame * 0.5 + i * 50) % 120) - 10;
        const opacity = 0.1 + (i % 5) * 0.05;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              bottom: `${y}%`,
              width: 3 + (i % 4),
              height: 3 + (i % 4),
              borderRadius: "50%",
              background: colors.gold,
              opacity: opacity * Math.abs(Math.sin(frame * 0.05 + delay)),
            }}
          />
        );
      })}

      {/* Logo */}
      <div
        style={{
          fontFamily: fonts.script,
          fontSize: 140,
          fontWeight: 700,
          color: colors.gold,
          transform: `scale(${logoScale})`,
          textShadow: `0 0 80px ${colors.gold}55`,
          lineHeight: 1,
        }}
      >
        Shot On Me
      </div>

      {/* Sweep line */}
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${colors.gold}, transparent)`,
          marginTop: 16,
        }}
      />

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 30,
          fontWeight: 300,
          color: colors.goldLight,
          letterSpacing: 6,
          marginTop: 24,
          fontFamily: fonts.body,
        }}
      >
        SEND MONEY · SHARE MOMENTS
      </div>

      {/* Flash overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          opacity: flashOpacity,
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
