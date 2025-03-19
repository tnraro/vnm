import { plugins } from "./plugin";

export type Config = Awaited<ReturnType<typeof loadConfig>>;
export async function loadConfig() {
  let result = {
    states: {
      path: "data/states",
      start: "start",
    },
    textAnimation: {
      enable: true,
      delay: {
        __dynamic: true,
        "...": 300,
        ".": 500,
        "?": 500,
        "!": 500,
        ",": 100,
        " ": 0,
        "'": 0,
        '"': 0,
        "`": 0,
      } as unknown as Record<string, number>,
      defaultDelay: 50,
      startDelay: 100,
    },
  };
  for (const plugin of plugins) {
    try {
      const config = structuredClone(result);
      result = await plugin.process(config);
    } catch (e) {
      console.error(plugin.name, e);
    }
  }
  return result;
}
