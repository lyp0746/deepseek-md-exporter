import React from "react";
import { registerRoot, Composition } from "remotion";
import { DeepSeekPromo } from "./DeepSeekPromo";

const RemotionRoot = () => {
  return React.createElement(Composition, {
    id: "DeepSeekPromo",
    component: DeepSeekPromo,
    durationInFrames: 545,
    fps: 30,
    width: 1080,
    height: 1920,
  });
};

registerRoot(RemotionRoot);