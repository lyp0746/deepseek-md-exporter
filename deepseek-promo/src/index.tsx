import { registerRoot, Composition } from "remotion";
import { DeepSeekPromo } from "./DeepSeekPromo";

const FPS = 30;
const SCENE_DURATIONS = [80, 90, 98, 98, 105, 95];
const TRANSITION_FRAMES = 10;
const TOTAL_FRAMES =
  SCENE_DURATIONS.reduce((a, b) => a + b, 0) - TRANSITION_FRAMES * 5;

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DeepSeekPromo"
        component={DeepSeekPromo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};

registerRoot(RemotionRoot);