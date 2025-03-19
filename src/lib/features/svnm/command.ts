export type CommandString = string;

export type Command = PrimitiveCommand | FunctionCommand;

export type PrimitiveCommand = StateCommand | KeywordCommand | ValueCommand;
export type ValueCommand =
  | VariableCommand
  | NumericCommand
  | StringCommand
  | BooleanCommand;

export enum CommandType {
  State,
  Variable,
  Numeric,
  Boolean,
  String,
  Function,
  Keyword,
}

const keywords = new Set([] as const);
export type Keyword = typeof keywords extends Set<infer T> ? T : never;

export interface KeywordCommand {
  type: CommandType.Keyword;
  value: Keyword;
}
export interface FunctionCommand {
  type: CommandType.Function;
  name: string;
  condition: ReturnType<typeof parseConditionArg>;
  args: PrimitiveCommand[];
}

export interface StateCommand {
  type: CommandType.State;
  id: string;
}
export interface VariableCommand {
  type: CommandType.Variable;
  name: string;
}
export interface NumericCommand {
  type: CommandType.Numeric;
  value: number;
}
export interface StringCommand {
  type: CommandType.String;
  value: string;
}
export interface BooleanCommand {
  type: CommandType.Boolean;
  value: boolean;
}

type Parser<C extends Command> = (command: CommandString) => C;

export function parseCommand(command: CommandString): Command {
  try {
    return parsePrimitiveCommand(command);
  } catch (e) {}
  try {
    return parseFunctionCommand(command);
  } catch (e) {}
  throw new SyntaxError(`"${command}" is not command`);
}

export function parseFunctionCommand(command: CommandString): FunctionCommand {
  command = command.trim();
  const { postfix, condition } = parseConditionPrefix(command);

  const match = postfix.match(
    /^(?<functionName>[^(\s]+)(?:\((?<functionArgs>[^)]*)\))?$/
  );
  if (match == null) {
    throw new SyntaxError(`${command} doesn't match the pattern`);
  }
  const groups = match.groups!;
  if (groups.functionName == null) {
    throw new SyntaxError(`"${command}" is not function command`);
  }
  return {
    type: CommandType.Function,
    name: groups.functionName,
    args: parseFunctionArguments(groups.functionArgs).map(
      parsePrimitiveCommand
    ),
    condition,
  };
}

function parseFunctionArguments(args: string | undefined) {
  if (args == null) return [];
  args = args.trim();
  let i = 0;
  const result = [];
  for (const match of args.matchAll(/(?<string>\'[^']+\'|\"[^"]+\")|,|$/g)) {
    const groups = match.groups!;
    if (groups.string != null) {
      result.push(groups.string);
    } else {
      const arg = args.slice(i, match.index).trim();
      if (arg.length > 0) result.push(arg);
    }
    i = match.index + match[0].length;
  }
  return result;
}

export function parseConditionPrefix(command: string) {
  command = command.trim();
  const match = command.match(/^\((?<condition>[^)]+)\)\s*이?면,\s*/);
  if (match == null) {
    return {
      postfix: command,
      condition: undefined,
    };
  }
  const { condition } = match.groups!;
  return {
    postfix: command.slice(match[0].length),
    condition: parseConditionArg(condition),
  };
}
export interface Condition {
  left: ValueCommand;
  right?: {
    op: OperatorType;
    value: ValueCommand;
  };
}
export function parseConditionArg(
  condition: string | undefined
): Condition | undefined {
  if (condition == null) return;
  condition = condition.trim();
  const match = condition?.match(
    /^(?<left>.+?)\s*(?:(?<op>\<|\<\=|\=|\>\=|\>)\s*(?<right>.+?))?$/
  );
  if (match == null)
    throw new SyntaxError(`"${condition}" is not function condition`);
  const groups = match.groups!;
  const left = parseValueCommand(groups.left);
  if (groups.op == null || groups.right == null) {
    return {
      left,
    };
  }
  const op = parseOperator(groups.op);
  const right = parseValueCommand(groups.right);
  return {
    left,
    right: {
      op: op,
      value: right,
    },
  };
}
export const parseStateCommand: Parser<StateCommand> = (command) => {
  command = command.trim();
  if (/^#\S+$/.test(command)) {
    return {
      type: CommandType.State,
      id: command.slice(1),
    };
  }
  throw new SyntaxError(`"${command}" is not state`);
};
export const parseVariableCommand: Parser<VariableCommand> = (command) => {
  command = command.trim();
  if (/^\$\S+$/.test(command)) {
    return {
      type: CommandType.Variable,
      name: command.slice(1),
    };
  }
  throw new SyntaxError(`"${command}" is not variable`);
};
export const parseNumericCommand: Parser<NumericCommand> = (command) => {
  command = command.trim();
  if (command.length > 0 && Number.isFinite(Number(command))) {
    return {
      type: CommandType.Numeric,
      value: Number(command),
    };
  }
  throw new SyntaxError(`"${command}" is not numeric`);
};
export const parseStringCommand: Parser<StringCommand> = (command) => {
  command = command.trim();
  if (/^".*"|'.*'$/.test(command)) {
    return {
      type: CommandType.String,
      value: command.slice(1, -1),
    };
  }
  throw new SyntaxError(`"${command}" is not string`);
};
export const parseBooleanCommand: Parser<BooleanCommand> = (command) => {
  command = command.trim();
  const match = command.match(
    /^(?:(?<true>[tT]rue|참)|(?<false>[fF]alse|거짓))$/
  );
  if (match != null) {
    return {
      type: CommandType.Boolean,
      value: match.groups!.true != null,
    };
  }
  throw new SyntaxError(`"${command}" is not string`);
};
export const parseKeywordCommand: Parser<KeywordCommand> = (command) => {
  command = command.trim();
  if (keywords.has(command as Keyword)) {
    return {
      type: CommandType.Keyword,
      value: command as Keyword,
    };
  }
  throw new SyntaxError(`"${command}" is not keyword`);
};
function parseOneOf<Parsers extends Parser<any>[]>(
  name: string,
  parsers: Parsers
): (command: CommandString) => ReturnType<Parsers[number]> {
  return (command) => {
    for (const parse of parsers) {
      try {
        return parse(command);
      } catch (_) {}
    }
    throw new SyntaxError(`"${command}" is not ${name}`);
  };
}
export const parseValueCommand = parseOneOf(
  "string, numeric, boolean, or variable",
  [
    parseVariableCommand,
    parseNumericCommand,
    parseStringCommand,
    parseBooleanCommand,
  ]
);
export const parsePrimitiveCommand = parseOneOf("primitive", [
  parseStateCommand,
  parseValueCommand,
  parseKeywordCommand,
]);

type OperatorType = typeof operators extends Set<infer T> ? T : never;
const operators = new Set(["<", "<=", "=", ">=", ">"] as const);

function parseOperator(operator: string): OperatorType {
  operator = operator.trim();
  if (!operators.has(operator as OperatorType)) {
    throw new SyntaxError(`"${operator}" is not an operator`);
  }
  return operator as OperatorType;
}
