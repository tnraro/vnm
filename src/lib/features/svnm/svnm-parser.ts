import { Type, type Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { parse } from "yaml";
import {
  parseCommand,
  parseConditionPrefix,
  parseFunctionCommand,
  type Command,
  type Condition,
} from "./command";

export interface Svnm {
  stateMap: Map<string, SvnmState>;
}

export type SvnmGlobalVaraibles = Record<string, any>;
export type SvnmLocalVariables = Record<string, any>;
export type SvnmOptions = {
  name: string;
  condition?: Condition;
  commands: Command[];
}[];
export type SvnmEvents = Record<string, Command[]>;

export function parseSvnm(text: string): Svnm {
  const states = text.trim().split(/(?=^# ?\S+$)/gm);

  return states.map(parseStateText).reduce(concatSvnm, { stateMap: new Map() });
}

export function concatSvnm(a: Svnm, b: Svnm): Svnm {
  const stateMap = new Map(a.stateMap);
  for (const [id, state] of b.stateMap) {
    if (stateMap.has(id)) {
      throw new Error(`State ID "${id}" must be unique.`);
    }
    stateMap.set(id, state);
  }
  return {
    stateMap,
  };
}
function parseStateText(text: string) {
  text = text.trim();
  const [first, second] = text.split(/^---$/gm);
  const firstPart = parseFirstPart(first.trim());
  const secondPart = parseSecondPart(second?.trim());

  return {
    stateMap: createStateSequence(firstPart, secondPart),
  };
}

export interface SvnmState {
  id: string;
  scope: string;
  paragraph: string;
  globalVariables?: SvnmGlobalVaraibles | undefined;
  localVariables?: SvnmLocalVariables | undefined;
  options?: SvnmOptions | undefined;
  events: SvnmEvents;
}
function createStateSequence(firstPart: FirstPart, secondPart: SecondPart) {
  return new Map(
    firstPart.paragraphs.map(
      (paragraph, i, paragraphs): [string, SvnmState] => {
        const id = createStateId(firstPart.id, i);
        const scope = firstPart.id;
        const isFirst = i === 0;
        const isLast = i + 1 === paragraphs.length;
        const nextId = createStateId(firstPart.id, i + 1);
        const globalVariables = createStateGlobalVariables(secondPart, isFirst);
        const localVariables = createStateLocalVariables(secondPart, isFirst);
        const options = createStateOptions(secondPart, isLast);
        const events = createStateEvents(
          secondPart,
          isFirst,
          isLast,
          nextId,
          options != null
        );
        return [
          id,
          {
            id,
            scope: createScope(secondPart.변수범위, scope),
            paragraph,
            globalVariables,
            localVariables,
            options,
            events,
          },
        ];
      }
    )
  );
}

function createStateId(id: string, seqIndex: number) {
  if (seqIndex === 0) return id;
  return `${id}__seq${seqIndex}`;
}

function createScope(scope: string | undefined, fallback: string) {
  scope = scope?.trim();
  if (scope) return scope;
  return fallback;
}

function createStateEvents(
  secondPart: SecondPart,
  isFirst: boolean,
  isLast: boolean,
  nextId: string,
  hasOptions: boolean
): SvnmEvents {
  const firstEventNames = new Set(["입장"]);
  const result: SvnmEvents = {};
  if (secondPart.이벤트 != null) {
    for (const [name, commands] of Object.entries(secondPart.이벤트)) {
      if (isFirst) {
        if (firstEventNames.has(name)) {
          result[name] = commands.map(parseCommand);
        }
      }
      if (isLast) {
        if (!firstEventNames.has(name)) {
          result[name] = commands.map(parseCommand);
        }
      }
    }
  }
  if (isLast) {
    if (hasOptions) {
      result["완독"] = [parseFunctionCommand(`선택지`)];
    }
  } else {
    result["다음"] = [parseFunctionCommand(`이동(#${nextId})`)];
  }
  return result;
}

function createStateOptions(
  secondPart: SecondPart,
  isLast: boolean
): SvnmOptions | undefined {
  if (isLast) {
    if (secondPart.선택지 == null) return;
    return [...Object.entries(secondPart.선택지)].map(([key, commands]) => {
      const { postfix, condition } = parseConditionPrefix(key);

      return {
        name: postfix,
        condition,
        commands: commands.map(parseCommand),
      };
    });
  }
  return;
}

function createStateLocalVariables(secondPart: SecondPart, isFirst: boolean) {
  if (isFirst) return secondPart.지역변수;
  return;
}
function createStateGlobalVariables(secondPart: SecondPart, isFirst: boolean) {
  if (isFirst) return secondPart.전역변수;
  return;
}

interface FirstPart {
  id: string;
  paragraphs: string[];
}
function parseFirstPart(text: string): FirstPart {
  const [first, second] = text.split(/(?<=^# ?\S+)\n+/);

  const id = parseFirstPartId(first);
  const paragraphs = parseFirstPartParagraphs(second);

  return { id, paragraphs };
}

function parseFirstPartId(text: string) {
  return text.slice(1).trim(); // To eat first #
}

function parseFirstPartParagraphs(text: string) {
  return text.split(/\n{2,}/g).map((x) => x.trim());
}

function parseSecondPart(text: string | undefined): SecondPart {
  if (text == null) return {};
  const result = parse(text);

  Value.Assert(SecondPart, result);
  return result;
}

const VariableValue = Type.Recursive(
  (This) =>
    Type.Union([
      Type.Number(),
      Type.String(),
      Type.Boolean(),
      Type.Array(This),
      Type.Record(Type.String(), This),
    ]),
  { $id: "VariableValue" }
);

const SecondPart = Type.Partial(
  Type.Object({
    전역변수: Type.Record(Type.String(), VariableValue),
    변수범위: Type.String(),
    지역변수: Type.Record(Type.String(), VariableValue),
    선택지: Type.Record(Type.String(), Type.Array(Type.String())),
    이벤트: Type.Record(Type.String(), Type.Array(Type.String())),
  })
);
type SecondPart = Static<typeof SecondPart>;
