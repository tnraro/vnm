import { resolve, resourceDir } from "@tauri-apps/api/path";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import type { ConfigPlugin } from "../plugin";

export const readConfigJsonPlugin: ConfigPlugin = {
  name: "read-config-json",
  async process(config) {
    const root = await resourceDir();
    const configPath = await resolve(root, "data/config.json");
    if (await exists(configPath)) {
      try {
        const text = await readTextFile(configPath);
        const config = JSON.parse(text);
        for (const { paths, value } of travelJson(config, [])) {
          const parent = getNode(config, paths.slice(0, -1));
          const defaultValue =
            paths.length === 0 ? parent : parent[paths.at(-1)!];
          if (parent.__dynamic !== true && defaultValue == null) {
            console.warn(`.${paths.join(".")} not found`);
          } else if (
            parent.__dynamic !== true &&
            typeof defaultValue !== typeof value
          ) {
            console.warn(
              `.${paths.join(
                "."
              )} not matched type: expected. ${typeof defaultValue}, actual: ${typeof value}`
            );
          } else {
            parent[paths.at(-1)!] = value;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return config;
    function* travelJson(
      root: any,
      paths: string[]
    ): Generator<
      { paths: string[]; value: number | boolean | string },
      void,
      unknown
    > {
      let currentNode = getNode(root, paths);
      if (typeof currentNode === "object") {
        for (const key of Object.keys(currentNode)) {
          for (const result of travelJson(root, [...paths, key])) {
            yield result;
          }
        }
      } else {
        yield {
          paths,
          value: currentNode,
        };
      }
    }
    function getNode(root: any, paths: string[]) {
      return paths.reduce((node, path) => node?.[path], root);
    }
  },
};
