import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Laptop: React.FC<{
  children: React.ReactNode;
  url?: string;
  scale?: number;
  enterDelay?: number;
}> = ({ children, url = "", scale = 1, enterDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - enterDelay,
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  const s = interpolate(entrance, [0, 1], [0.9, 1]);
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
      {/* Screen */}
      <div
        style={{
          width: 1000,
          height: 625,
          borderRadius: 14,
          background: "#0c0c0c",
          border: "2.5px solid #555",
          boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            height: 36,
            background: "#161616",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 7,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              color: "#666",
            }}
          >
            {url}
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {children}
        </div>
      </div>
      {/* Base */}
      <div
        style={{
          width: 1060,
          height: 8,
          borderRadius: 4,
          background: "linear-gradient(to right, #222, #333, #222)",
          marginTop: -1,
        }}
      />
    </div>
  );
};
