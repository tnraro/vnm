type LiteralUnion<T extends string> = T | (string & {});
const intrinsicEventName = new Set([
  "initial",
  "reset",
  "enter",
  "exit",
] as const);
type IntrinsicEventName = typeof intrinsicEventName extends Set<infer X>
  ? X
  : never;
export class Machine<
  State extends {
    id: string;
    metadata: Partial<Record<string, any> & { on: Record<string, string[]> }>;
  }
> {
  #currentState: State | undefined;
  get currentState() {
    return this.#currentState;
  }
  readonly #options;
  constructor(options: {
    start: string;
    on: Partial<
      Record<
        LiteralUnion<IntrinsicEventName>,
        (machine: Machine<State>, ...args: string[]) => void
      >
    >;
    loadState: (id: string) => Promise<State> | State;
  }) {
    this.#options = options;
    this.#call("initial");
    this.reset();
  }
  async reset() {
    this.#call("reset");
    await this.goto(this.#options.start);
  }
  async goto(id: string) {
    if (this.#currentState?.id != null)
      this.#call("exit", this.#currentState.id);
    const state = await this.#options.loadState(id);
    this.#currentState = state;
    this.#call("enter", this.#currentState.id);
  }
  readonly call = (
    name: Omit<string, IntrinsicEventName>,
    ...args: string[]
  ) => {
    if (intrinsicEventName.has(name as IntrinsicEventName)) {
      console.error(`User can't call intrinsic event "${name}"`);
      return;
    }
    this.#call(name as LiteralUnion<IntrinsicEventName>, ...args);
  };
  readonly #call = (
    name: LiteralUnion<IntrinsicEventName>,
    ...args: string[]
  ) => {
    queueMicrotask(() => {
      const fn = this.#options.on[name];
      if (fn == null) return;
      fn(this, ...args);
    });
    queueMicrotask(() => {
      const commands = this.currentState?.metadata.on?.[name];
      if (!Array.isArray(commands)) return;
      this.runCommands(commands);
    });
  };
  readonly runCommands = (commands: string[]) => {
    commands.forEach(this.runCommand);
  };
  readonly runCommand = (command: string | undefined) => {
    command = command?.trim();
    if (!command) return;
    queueMicrotask(() => {
      const match = command.match(
        /^(?:\((?<condition>[^)]+)\)\s*이면,\s*)?(?<functionName>[^(]+)(?:\((?<functionArgs>[^)]*)\))?$/
      );
      if (match == null) {
        console.error(`${command} doesn't match the pattern`);
        return;
      }
      const groups = match.groups!;
      if (groups.functionName != null) {
        const fn = this.#options.on[groups.functionName];
        if (fn == null) {
          console.warn(
            `user-defined function "${groups.functionName}" doesn't exist`
          );
          return;
        }
        // const condition = groups.condition?.match(
        //   /(?<left>.+?)\s*(?<op>\<|\>|\=|\<\=|\>\=)\s*(?<right>.+?)/
        // );
        // if (condition != null) {
        //   const left = condition.groups!.left.trim();
        //   const leftValue = this.#currentState?.metadata[left];
        //   if (left == null) {
        //     console.warn(`condition "${left}" doesn't exists`);
        //     return;
        //   }
        //   const op = condition.groups!.op?.trim();
        //   const right = condition.groups!.right?.trim();
        //   if (op != null && right != null) {
        //   } else {
        //   }
        // }
        const args = groups.functionArgs?.split(/\s*,\s*/g) ?? [];
        this.call(groups.functionName, ...args);
        return;
      }
      console.error(`Unexpected command ${command}`);
    });
  };
}
