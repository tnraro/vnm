import { loadConfig, type Config } from "./config";

let currentConfig: Config;

export async function getConfig(reload = false) {
  if (reload || currentConfig == null) {
    currentConfig = await loadConfig();
  }
  return currentConfig;
}

export function getConfigSync() {
  if (currentConfig == null) throw new Error(`config is not loaded yet`);
  return currentConfig;
}
