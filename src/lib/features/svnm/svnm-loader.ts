import { join, resolve, resourceDir } from "@tauri-apps/api/path";
import { readDir, readTextFile, type DirEntry } from "@tauri-apps/plugin-fs";
import { getConfig } from "../config/global-config";
import { concatSvnm, parseSvnm, type Svnm } from "./svnm-parser";

export async function loadSvnmAll() {
  const config = await getConfig();
  const root = await resourceDir();
  const path = await resolve(root, config.states.path);
  const entries = await readDir(path);
  const ps: Promise<Svnm>[] = [];
  await processEntriesRecursively(path, entries);
  const svnms = await Promise.all(ps);
  return svnms.reduce(concatSvnm, { stateMap: new Map() });
  async function processEntriesRecursively(
    parent: string,
    entries: DirEntry[]
  ) {
    for (const entry of entries) {
      const path = await join(parent, entry.name);
      if (entry.isFile && entry.name.endsWith(".svnm")) {
        ps.push(loadSvnm(path));
      } else if (entry.isDirectory) {
        await processEntriesRecursively(path, await readDir(path));
      }
    }
  }
}

async function loadSvnm(path: string) {
  const text = await readTextFile(path);

  return parseSvnm(text);
}
