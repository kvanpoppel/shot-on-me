import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Phone: React.FC<{
  children: React.ReactNode;
  glowColor?: string;
  scale?: number;
  enterDelay?: number;
}> = ({ children, glowColor = "#B8945A", scale = 1, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - enterDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const s = interpolate(entrance, [0, 1], [0.85, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `scale(${scale * s})`,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Phone body */}
      <div
        style={{
          width: 375,
          height: 812,
          borderRadius: 50,
          background: "#0c0c0c",
          border: "3px solid #444",
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${glowColor}33`,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            width: 120,
            height: 32,
            borderRadius: 16,
            background: "#000",
            zIndex: 10,
          }}
        />
        {/* Status bar */}
        <div
          style={{
            height: 54,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 24px 6px",
            fontSize: 12,
            fontWeight: 600,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <span>9:41</span>
          <span style={{ fontSize: 10 }}>●●●● ▎🔋</span>
        </div>
        {/* Screen content */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {children}
        </div>
        {/* Home indicator */}
        <div
          style={{
            height: 24,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 100,
              height: 4,
              borderRadius: 2,
              background: "#555",
            }}
          />
        </div>
      </div>
    </div>
  );
};
