import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
  Sequence,
} from "remotion";
import { Phone } from "../components/Phone";
import { colors, fonts } from "../styles";

const SCREEN_DUR = 120; // frames per screen at 30fps = 4 seconds

// ── SOM Welcome Screen ──
const SOMWelcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.somBg,
        padding: "12px 16px",
        fontFamily: fonts.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 8,
          fontWeight: 600,
          color: colors.gold,
          letterSpacing: 2,
          marginBottom: 4,
        }}
      >
        THE NIGHTLIFE SOCIAL APP
      </div>
      <div
        style={{
          textAlign: "center",
          fontFamily: fonts.script,
          fontSize: 32,
          fontWeight: 700,
          color: colors.gold,
          textShadow: `0 0 30px ${colors.gold}44`,
        }}
      >
        Shot On Me
      </div>
      <div
        style={{
          width: 60,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${colors.gold}88, transparent)`,
          margin: "6px auto",
        }}
      />
      <div style={{ textAlign: "center", fontSize: 11, color: "#ccc" }}>
        Buy someone a drink.
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: colors.gold,
          marginBottom: 10,
        }}
      >
        Make a night to remember.
      </div>
      {/* Social proof */}
      <div
        style={{
          textAlign: "center",
          fontSize: 8,
          color: colors.goldLight,
          padding: "5px 0",
          border: `1px solid ${colors.gold}33`,
          borderRadius: 12,
          background: `${colors.gold}0d`,
          marginBottom: 10,
          opacity: interpolate(frame, [10, 25], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        👥 2,400+ shots sent this week
      </div>
      {/* Feature cards */}
      {[
        {
          icon: "🍻",
          title: "Send a drink to anyone",
          desc: "Buy a round or surprise a stranger — all from your phone.",
        },
        {
          icon: "📍",
          title: "Discover where to be tonight",
          desc: "See which venues your crew is at and what's happening now.",
        },
        {
          icon: "✨",
          title: "Make every night a story",
          desc: "Check in, connect, and share the moments that matter.",
        },
      ].map((f, i) => {
        const delay = 15 + i * 10;
        const a = interpolate(frame, [delay, delay + 15], [0, 1], {
          extrapolateRight: "clamp",
        });
        const x = interpolate(frame, [delay, delay + 15], [30, 0], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });
        return (
          <div
            key={i}
            style={{
              opacity: a,
              transform: `translateX(${x}px)`,
              display: "flex",
              gap: 8,
              padding: "8px 10px",
              background: colors.dark,
              borderRadius: 10,
              border: `1px solid ${colors.gold}22`,
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#eee",
                  marginBottom: 2,
                }}
              >
                {f.title}
              </div>
              <div style={{ fontSize: 8, color: "#999", lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          </div>
        );
      })}
      {/* Venue discovery */}
      <div
        style={{
          marginTop: 8,
          opacity: interpolate(frame, [50, 65], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: colors.gold,
            marginBottom: 4,
          }}
        >
          📍 Discover Venues
        </div>
        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
          {["All", "Indianapolis", "Chicago", "Louisville"].map((c, i) => (
            <div
              key={c}
              style={{
                fontSize: 7,
                padding: "3px 8px",
                borderRadius: 8,
                background: i === 0 ? `${colors.gold}33` : "#1a1a1a",
                border: `1px solid ${i === 0 ? colors.gold : "#333"}`,
                color: i === 0 ? colors.gold : "#888",
              }}
            >
              {c}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { n: "The Rooftop Bar", cat: "Bar" },
            { n: "Brewhouse Tavern", cat: "Pub" },
            { n: "Club Luxe", cat: "Nightclub" },
          ].map((v) => (
            <div
              key={v.n}
              style={{
                width: 95,
                background: colors.dark,
                borderRadius: 8,
                border: `1px solid ${colors.gold}15`,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 36,
                  background: "#1a1a1a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                }}
              >
                🏛️
              </div>
              <div style={{ padding: "4px 6px" }}>
                <div
                  style={{ fontSize: 7, fontWeight: 600, color: "#eee" }}
                >
                  {v.n}
                </div>
                <div
                  style={{
                    fontSize: 6,
                    color: colors.gold,
                    marginTop: 2,
                    background: `${colors.gold}22`,
                    display: "inline-block",
                    padding: "1px 5px",
                    borderRadius: 4,
                  }}
                >
                  {v.cat}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* CTA */}
      <div
        style={{
          marginTop: "auto",
          background: colors.gold,
          borderRadius: 10,
          padding: "10px 0",
          textAlign: "center",
          fontWeight: 700,
          fontSize: 13,
          color: "#000",
        }}
      >
        Get Started
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 7,
          color: "#666",
          marginTop: 6,
        }}
      >
        Available at any tap & pay venue · IN · IL · KY · TN · MI · OH
      </div>
    </div>
  );
};

// ── SOM Home Screen ──
const SOMHome: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: colors.somBg,
        padding: "8px 14px",
        fontFamily: fonts.body,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontFamily: fonts.script,
          fontSize: 22,
          fontWeight: 700,
          color: colors.gold,
          marginBottom: 8,
        }}
      >
        Shot On Me
      </div>
      {/* Wallet */}
      <div
        style={{
          background: `linear-gradient(135deg, #1a1408, #0d0b06)`,
          border: `1px solid ${colors.gold}44`,
          borderRadius: 14,
          padding: "12px 16px",
          textAlign: "center",
          marginBottom: 10,
          boxShadow: `0 0 20px ${colors.gold}15`,
        }}
      >
        <div style={{ fontSize: 9, color: "#888", letterSpacing: 1 }}>
          AVAILABLE BALANCE
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 900,
            color: colors.gold,
            lineHeight: 1.2,
          }}
        >
          $247.50
        </div>
        <div style={{ fontSize: 8, color: `${colors.gold}88` }}>
          💳 Tap to Pay Ready
        </div>
      </div>
      {/* Deals */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          marginBottom: 6,
        }}
      >
        🔥 LIVE DEALS NEAR YOU
      </div>
      {[
        {
          n: "Half-Price Margaritas",
          v: "The Rooftop Bar",
          b: "Happy Hour",
          c: colors.amber,
        },
        {
          n: "$5 Craft Beers",
          v: "Brewhouse Tavern",
          b: "Flash Deal",
          c: colors.rose,
        },
        {
          n: "VIP Bottle Service",
          v: "Club Luxe",
          b: "VIP",
          c: colors.purple,
        },
        {
          n: "2-for-1 Cocktails",
          v: "Skyline Lounge",
          b: "Happy Hour",
          c: colors.amber,
        },
      ].map((d, i) => {
        const a = interpolate(frame, [8 + i * 6, 16 + i * 6], [0, 1], {
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              opacity: a,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: colors.dark,
              border: `1px solid ${colors.gold}15`,
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 5,
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#eee" }}>
                {d.n}
              </div>
              <div style={{ fontSize: 9, color: "#777" }}>📍 {d.v}</div>
            </div>
            <div
              style={{
                fontSize: 8,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 8,
                background: `${d.c}22`,
                color: d.c,
              }}
            >
              {d.b}
            </div>
          </div>
        );
      })}
      {/* Friends */}
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: colors.gold,
          margin: "8px 0 4px",
        }}
      >
        👥 FRIENDS NEARBY
      </div>
      {[
        { n: "Sarah K.", d: "0.2 mi", v: "The Rooftop Bar" },
        { n: "Jake M.", d: "0.5 mi", v: "Brewhouse Tavern" },
      ].map((f, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            background: colors.dark,
            border: `1px solid ${colors.gold}15`,
            borderRadius: 8,
            padding: "6px 10px",
            marginBottom: 4,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: `${colors.gold}44`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 9,
                fontWeight: 700,
                color: colors.gold,
              }}
            >
              {f.n[0]}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#eee" }}>
                {f.n} · {f.d}
              </div>
              <div style={{ fontSize: 8, color: "#777" }}>📍 {f.v}</div>
            </div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, color: colors.gold }}>
            Send →
          </div>
        </div>
      ))}
      {/* Nav */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          justifyContent: "space-around",
          borderTop: `1px solid ${colors.gold}22`,
          paddingTop: 6,
        }}
      >
        {["🏠", "📍", "📰", "💰", "👤"].map((ic, i) => (
          <div
            key={i}
            style={{
              fontSize: 16,
              opacity: i === 0 ? 1 : 0.4,
              filter: i === 0 ? "none" : "grayscale(1)",
            }}
          >
            {ic}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main SOM Scene ──
export const SOMScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const screens = [
    { label: "Welcome", Component: SOMWelcome },
    { label: "Home", Component: SOMHome },
  ];

  const currentScreenIndex = Math.min(
    Math.floor(frame / SCREEN_DUR),
    screens.length - 1
  );
  const Current = screens[currentScreenIndex].Component;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `radial-gradient(ellipse at 40% 50%, #1a1408 0%, ${colors.bg} 70%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 30,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.script,
            fontSize: 30,
            fontWeight: 700,
            color: colors.gold,
          }}
        >
          Shot On Me
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#555",
            letterSpacing: 3,
            marginTop: 4,
          }}
        >
          CONSUMER APP
        </div>
      </div>

      {/* Active phone */}
      <Phone glowColor={colors.gold} scale={1.15}>
        <Current />
      </Phone>

      {/* Thumbnail strip at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          display: "flex",
          gap: 16,
          alignItems: "flex-end",
        }}
      >
        {screens.map((s, i) => {
          if (i >= currentScreenIndex) return null;
          const shrink = spring({
            frame: frame - (i + 1) * SCREEN_DUR,
            fps,
            config: { damping: 15, stiffness: 80 },
          });
          return (
            <div key={i} style={{ textAlign: "center", opacity: 0.8 }}>
              <div
                style={{
                  transform: `scale(${0.25 * shrink})`,
                  transformOrigin: "bottom center",
                }}
              >
                <Phone glowColor={colors.gold} scale={0.3}>
                  <s.Component />
                </Phone>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: colors.gold,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
