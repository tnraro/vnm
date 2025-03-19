import { resolve, resourceDir } from "@tauri-apps/api/path";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { parse } from "yaml";
import { getConfig } from "../config/global-config";

export type State = Awaited<ReturnType<typeof loadState>>;
export async function loadState(id: string) {
  const config = await getConfig();
  const root = await resourceDir();
  const path = await resolve(root, config.states.path, `${id}.svnm`);
  const text = await readTextFile(path);

  const [script, metadata] = text.split(/^---$/m);

  return {
    id,
    script: parseScript(script),
    metadata: parseMetadata(metadata),
  };
}

export type ParagraphToken =
  | {
      type: "text";
      value: string;
      name: string | undefined;
    }
  | {
      type: "command";
      value: string;
      commandType: string;
      commandArgs: string[];
    };

function parseScript(raw: string) {
  const tokenizer =
    /(?<escape>\\.)|(?<command><(?<commandType>[^>\s(]+(?:\((?<commandArgs>[^>)]+)\))?)>)|(?<=^|\n)(?<characterName>[^:]+)(?::\s?)(?!\n|$)|(?<text>.)/gsu;
  return raw
    .trim()
    .split(/\n{2,}/g)
    .map((paragraph) => {
      const tokens: ParagraphToken[] = [];
      for (const match of paragraph.trim().matchAll(tokenizer)) {
        const groups = match.groups!;
        if (groups.escape != null) {
          appendText(groups.escape.slice(1));
        } else if (groups.command != null) {
          tokens.push({
            type: "command",
            value: groups.command,
            commandType: groups.commandType,
            commandArgs: groups.commandArgs?.trim().split(/\s*,\s*/g) ?? [],
          });
        } else if (groups.characterName != null) {
          tokens.push({
            type: "text",
            value: "",
            name: groups.characterName,
          });
        } else if (groups.text != null) {
          appendText(groups.text);
        } else {
          console.error("not implemented", groups);
        }
      }
      return {
        tokens,
      };
      function appendText(text: string) {
        const lastToken = tokens.at(-1);
        if (lastToken?.type === "text") {
          lastToken.value += text;
        } else {
          tokens.push({
            type: "text",
            value: text,
            name: undefined,
          });
        }
      }
    });
}
function parseMetadata(
  raw: string | undefined
): Partial<
  Omit<Record<string, any>, "on"> & { on?: Record<string, string[]> }
> {
  if (raw == null) return {};
  raw = raw.trim();

  return parse(raw);
}
