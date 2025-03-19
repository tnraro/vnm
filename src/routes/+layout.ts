// Tauri doesn't have a Node.js server to do proper SSR
// so we will use adapter-static to prerender the app (SSG)

import { getConfig } from "$lib/features/config/global-config";
import { lintSvnm } from "$lib/features/svnm/svnm-linter";
import { loadSvnmAll } from "$lib/features/svnm/svnm-loader";
import { measureTime } from "$lib/features/time/measure-time";

// See: https://v2.tauri.app/start/frontend/sveltekit/ for more info
export const prerender = true;
export const ssr = false;

export async function load() {
  const config = await getConfig();
  const svnm = await measureTime(loadSvnmAll);
  await measureTime(lintSvnm, svnm);

  return {
    config,
    svnm,
  };
}
