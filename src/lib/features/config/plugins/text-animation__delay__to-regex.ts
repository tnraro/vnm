import type { ConfigPlugin } from "../plugin";

export const textAnimationDelayToRegexPlugin: ConfigPlugin = {
  name: "text-animation__delay__to-regex",
  process(config) {
    const delays = [...Object.keys(config.textAnimation.delay)].filter(
      (key) => !key.startsWith("__")
    );
    delays.sort((a, b) => b.length - a.length);
    config.textAnimation.tokenizer = new RegExp(
      delays
        .map((key) => key.replaceAll(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"))
        .join("|"),
      "i"
    );
    return config;
  },
};
