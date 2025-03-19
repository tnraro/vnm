import { CommandType } from "./command";
import type { Svnm } from "./svnm-parser";

export function lintSvnm(svnm: Svnm) {
  const log: { type: "error" | "warn"; messages: any[] }[] = [];
  for (const [id, state] of svnm.stateMap) {
    if (state.id !== id) {
      error(`state id mismatch: "${state.id}" != "${id}"`);
    }
    if (state.options != null) {
      for (const option of state.options) {
        for (const command of option.commands) {
          if (command.type === CommandType.Function) {
            for (const arg of command.args) {
              if (arg.type === CommandType.State) {
                if (!svnm.stateMap.has(arg.id)) {
                  error(`No state found for "${arg.id}"`);
                }
              }
            }
          }
        }
      }
    }
    for (const [name, commands] of Object.entries(state.events)) {
      for (const command of commands) {
        if (command.type === CommandType.Function) {
          for (const arg of command.args) {
            if (arg.type === CommandType.State) {
              if (!svnm.stateMap.has(arg.id)) {
                error(`No state found for "${arg.id}"`);
              }
            }
          }
        }
      }
    }
  }

  if (log.length > 0) {
    throw log;
  }

  function error(...messages: any[]) {
    log.push({ type: "error", messages });
  }
  function warn(...messages: any[]) {
    log.push({ type: "warn", messages });
  }
}
