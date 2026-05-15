import { Composition } from "remotion";
import { TitleScene } from "./scenes/TitleScene";
import { SOMScene } from "./scenes/SOMScene";
import { OutroScene } from "./scenes/OutroScene";
import React from "react";
import { Sequence, useCurrentFrame } from "remotion";

// Full promo composition
const ShotOnMePromo: React.FC = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#000",
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}
    >
      {/* Title: 0-5s (150 frames) */}
      <Sequence from={0} durationInFrames={150}>
        <TitleScene />
      </Sequence>

      {/* SOM: 5s-13s (240 frames = 2 screens x 4s) */}
      <Sequence from={150} durationInFrames={240}>
        <SOMScene />
      </Sequence>

      {/* Outro: 13s-18s (150 frames) */}
      <Sequence from={390} durationInFrames={150}>
        <OutroScene />
      </Sequence>
    </div>
  );
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="ShotOnMePromo"
        component={ShotOnMePromo}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{}}
      />
    </>
  );
};
