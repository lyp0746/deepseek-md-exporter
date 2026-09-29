import React from "react";
import { registerRoot, Composition, Folder } from "remotion";
import { DeepSeekPromo } from "./DeepSeekPromo";

const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DeepSeekPromo"
        component={DeepSeekPromo}
        durationInFrames={489}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

registerRoot(RemotionRoot);