import {
  CommandType,
  type Command,
  type Condition,
  type PrimitiveCommand,
  type StateCommand,
  type ValueCommand,
} from "./command";
import type { Svnm, SvnmState } from "./svnm-parser";

export interface SvnmRuntimeConfig {
  start: string;
  functions: Partial<
    Record<
      string,
      (runtime: SvnmRuntime, ...args: any[]) => Promise<void> | void
    >
  >;
}

export class SvnmRuntime {
  #svnm;
  #currentState: SvnmState | undefined;
  get currentState() {
    return this.#currentState;
  }
  #config;
  #globalVariables = new Map<string, any>();
  #localVariables = new Map<string, any>();
  #internalFunctions: Partial<
    Record<string, (...args: any[]) => Promise<any[] | void> | any[] | void>
  > = {
    이동: (state: StateCommand) => {
      this.#goto(state.id);
      return [state.id];
    },
    선택지: () => {
      this.#localVariables.set("__is_options_open", true);
      return [];
    },
    출력: (...args: PrimitiveCommand[]) => {
      return args.map((arg) => {
        switch (arg.type) {
          case CommandType.Boolean:
          case CommandType.Numeric:
          case CommandType.String:
          case CommandType.Variable:
            return this.getValue(arg);
          default:
            return arg;
        }
      });
    },
  };
  constructor(svnm: Svnm, config: SvnmRuntimeConfig) {
    this.#svnm = svnm;
    this.#config = config;
    this.#goto(config.start);
  }
  #goto(stateId: string) {
    const state = this.#svnm.stateMap.get(stateId);
    if (state == null) {
      throw new Error(`No state found for "${stateId}"`);
    }
    if (this.#currentState != null) {
      this.emit("퇴장");
      this.#call("퇴장");
    }
    if (this.#currentState?.scope != state.scope) {
      this.#localVariables.clear();
      this.#call("changeScope");
    }
    if (state.globalVariables != null) {
      for (const [name, variable] of Object.entries(state.globalVariables)) {
        this.#globalVariables.set(name, variable);
      }
    }
    if (state.localVariables != null) {
      for (const [name, variable] of Object.entries(state.localVariables)) {
        this.#localVariables.set(name, variable);
      }
    }
    this.#currentState = state;
    this.#call("입장");
    this.emit("입장");
  }
  readonly emit = (eventType: string) => {
    const commands = this.#currentState?.events?.[eventType];
    if (commands == null) return;
    commands.forEach(this.#runCommand);
  };
  readonly select = (name: string) => {
    if (this.#currentState == null) throw new Error(`current state not found`);
    const isOptionsOpen =
      this.#localVariables.get("__is_options_open") ?? false;
    if (this.#currentState.options == null)
      throw new Error(`options not found in current state`);
    if (!isOptionsOpen) throw new Error(`options are not open`);
    const option = this.#currentState.options.find(
      (option) => option.name === name
    );
    if (option == null)
      throw new Error(`option name "${name}" not found in current state`);
    if (!this.checkCondition(option.condition)) return;
    option.commands.forEach(this.#runCommand);
  };
  #runCommand = (command: Command) => {
    switch (command.type) {
      case CommandType.Function: {
        if (this.checkCondition(command.condition)) {
          this.#call(command.name, ...command.args);
        }
        return;
      }
    }
  };
  readonly #call = (name: string, ...args: PrimitiveCommand[]) => {
    queueMicrotask(async () => {
      const internalFunction = this.#internalFunctions[name];
      let modifiedArgs: any[] = args;
      if (internalFunction != null) {
        const res = await internalFunction?.(...modifiedArgs);
        if (res == null) {
          return;
        }
        modifiedArgs = res;
      }
      await this.#config.functions[name]?.(this, ...modifiedArgs);
    });
  };
  checkCondition(condition: Condition | undefined) {
    if (condition == null) return true;
    const left = this.getValue(condition.left);
    if (condition.right == null) {
      return left === true;
    }
    const right = this.getValue(condition.right.value);
    switch (condition.right.op) {
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case "=":
        return left === right;
      case ">":
        return left > right;
      case ">=":
        return left >= right;
    }
    throw new Error(`"${condition.right.op}" is not valid operator`);
  }
  readonly getValue = (command: ValueCommand) => {
    switch (command.type) {
      case CommandType.String:
        return command.value;
      case CommandType.Numeric:
        return command.value;
      case CommandType.Boolean:
        return command.value;
      case CommandType.Variable: {
        return this.getVariable(command.name);
      }
    }
    throw new Error(`"${command}" is not value`);
  };
  readonly getVariable = (name: string) => {
    const localVariable = this.#localVariables.get(name);
    if (localVariable != null) return localVariable;
    const globalVariable = this.#globalVariables.get(name);
    if (globalVariable != null) return globalVariable;
    throw new ReferenceError(`"${name}" is not defined`);
  };
  readonly setVariable = (name: string, value: any) => {
    if (this.#localVariables.has(name)) {
      return this.#localVariables.set(name, value);
    }
    if (this.#globalVariables.has(name)) {
      return this.#globalVariables.set(name, value);
    }
    throw new ReferenceError(`"${name}" is not defined`);
  };
}
