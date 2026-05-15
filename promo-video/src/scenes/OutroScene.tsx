import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { colors, fonts } from "../styles";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 60 },
  });

  const taglineOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateRight: "clamp",
  });

  const urlOpacity = interpolate(frame, [40, 55], [0, 1], {
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
        gap: 20,
      }}
    >
      <div
        style={{
          fontFamily: fonts.script,
          fontSize: 120,
          fontWeight: 700,
          color: colors.gold,
          transform: `scale(${logoScale})`,
          textShadow: `0 0 80px ${colors.gold}55`,
        }}
      >
        Shot On Me
      </div>
      <div
        style={{
          opacity: taglineOpacity,
          fontSize: 32,
          fontWeight: 300,
          color: colors.goldLight,
          letterSpacing: 6,
          fontFamily: fonts.body,
        }}
      >
        SEND MONEY · SHARE MOMENTS
      </div>
      <div
        style={{
          opacity: ctaOpacity,
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          padding: "12px 44px",
          border: `2px solid ${colors.gold}`,
          borderRadius: 30,
          letterSpacing: 3,
          fontFamily: fonts.body,
          boxShadow: `0 0 20px ${colors.gold}33`,
        }}
      >
        COMING SOON
      </div>
      <div
        style={{
          opacity: urlOpacity,
          fontSize: 20,
          color: colors.gold,
          letterSpacing: 2,
          fontFamily: fonts.body,
        }}
      >
        shotonme.com
      </div>
    </div>
  );
};
