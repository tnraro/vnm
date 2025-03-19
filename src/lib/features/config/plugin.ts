import { readConfigJsonPlugin } from "./plugins/read-config-json";
import { textAnimationDelayToRegexPlugin } from "./plugins/text-animation__delay__to-regex";

export interface ConfigPlugin {
  name: string;
  process: (config: any) => Promise<any> | any;
}

export const plugins: ConfigPlugin[] = [
  readConfigJsonPlugin,
  textAnimationDelayToRegexPlugin,
];
