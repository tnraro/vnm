import { describe, expect, test } from "bun:test";
import {
  CommandType,
  parseConditionArg,
  parseConditionPrefix,
  parseFunctionCommand,
  parsePrimitiveCommand,
} from "./command";
describe("primitive", () => {
  describe("numeric", () => {
    test("0", () => {
      expect(parsePrimitiveCommand("0")).toStrictEqual({
        type: CommandType.Numeric,
        value: 0,
      });
    });
    test(".53", () => {
      expect(parsePrimitiveCommand(".53")).toStrictEqual({
        type: CommandType.Numeric,
        value: 0.53,
      });
    });
    test("-53", () => {
      expect(parsePrimitiveCommand("-53")).toStrictEqual({
        type: CommandType.Numeric,
        value: -53,
      });
    });
  });
  describe("state", () => {
    test("#state-id", () => {
      expect(parsePrimitiveCommand("#state-id")).toStrictEqual({
        type: CommandType.State,
        id: "state-id",
      });
    });
    test("#state id must throw a SyntaxError", () => {
      expect(() => parsePrimitiveCommand("#state id")).toThrowError(
        SyntaxError
      );
    });
    test("# must throw a SyntaxError", () => {
      expect(() => parsePrimitiveCommand("#")).toThrowError(SyntaxError);
    });
  });

  describe("string", () => {
    test("''", () => {
      expect(parsePrimitiveCommand("''")).toStrictEqual({
        type: CommandType.String,
        value: "",
      });
    });
    test("'str'", () => {
      expect(parsePrimitiveCommand("'str'")).toStrictEqual({
        type: CommandType.String,
        value: "str",
      });
    });
    test("'st'r'", () => {
      expect(parsePrimitiveCommand("'st'r'")).toStrictEqual({
        type: CommandType.String,
        value: "st'r",
      });
    });
    test('"str"', () => {
      expect(parsePrimitiveCommand('"str"')).toStrictEqual({
        type: CommandType.String,
        value: "str",
      });
    });
    test('"s"tr"', () => {
      expect(parsePrimitiveCommand('"s"tr"')).toStrictEqual({
        type: CommandType.String,
        value: 's"tr',
      });
    });
    test("true", () => {
      expect(parsePrimitiveCommand("true")).toStrictEqual({
        type: CommandType.Boolean,
        value: true,
      });
    });
    test("false", () => {
      expect(parsePrimitiveCommand("false")).toStrictEqual({
        type: CommandType.Boolean,
        value: false,
      });
    });
  });

  describe("variable", () => {
    test("$asd", () => {
      expect(parsePrimitiveCommand("$asd")).toStrictEqual({
        type: CommandType.Variable,
        name: "asd",
      });
    });
    test("$asd f must throw a SyntaxError", () => {
      expect(() => parsePrimitiveCommand("$asd f")).toThrowError(SyntaxError);
    });
    test("$ must throw a SyntaxError", () => {
      expect(() => parsePrimitiveCommand("$")).toThrowError(SyntaxError);
    });
  });

  test("empty string must throw a SyntaxError", () => {
    expect(() => parsePrimitiveCommand("")).toThrowError(SyntaxError);
  });
});

describe("condition", () => {
  test("(1)이면,foo", () => {
    expect(parseConditionPrefix("(1)이면,foo")).toStrictEqual({
      postfix: "foo",
      condition: parseConditionArg("1"),
    });
  });
  test("(1 > 2)면, foo", () => {
    expect(parseConditionPrefix("(1 > 2)면, foo")).toStrictEqual({
      postfix: "foo",
      condition: parseConditionArg("1>2"),
    });
  });
});

describe("function", () => {
  test("foo", () => {
    expect(parseFunctionCommand("foo")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [],
      condition: undefined,
    });
  });
  test("foo()", () => {
    expect(parseFunctionCommand("foo()")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [],
      condition: undefined,
    });
  });
  test("foo(#state)", () => {
    expect(parseFunctionCommand("foo(#state)")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [
        {
          type: CommandType.State,
          id: "state",
        },
      ],
      condition: undefined,
    });
  });
  test('foo("a,b,5",3)', () => {
    expect(parseFunctionCommand('foo("a,b,5",3)')).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [
        {
          type: CommandType.String,
          value: "a,b,5",
        },
        {
          type: CommandType.Numeric,
          value: 3,
        },
      ],
      condition: undefined,
    });
  });
  test("foo(#state,5,3)", () => {
    expect(parseFunctionCommand("foo(#state,5,3)")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [
        {
          type: CommandType.State,
          id: "state",
        },
        {
          type: CommandType.Numeric,
          value: 5,
        },
        {
          type: CommandType.Numeric,
          value: 3,
        },
      ],
      condition: undefined,
    });
  });
  test("(5)이면,foo", () => {
    expect(parseFunctionCommand("(5)이면,foo")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [],
      condition: {
        left: { type: CommandType.Numeric, value: 5 },
      },
    });
  });
  test("($val >= 3)이면, foo", () => {
    expect(parseFunctionCommand("($val >= 3)이면, foo")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [],
      condition: {
        left: { type: CommandType.Variable, name: "val" },
        right: {
          op: ">=",
          value: { type: CommandType.Numeric, value: 3 },
        },
      },
    });
  });
  test("($a<$b)면,foo", () => {
    expect(parseFunctionCommand("($a<$b)면,foo")).toStrictEqual({
      type: CommandType.Function,
      name: "foo",
      args: [],
      condition: {
        left: { type: CommandType.Variable, name: "a" },
        right: {
          op: "<",
          value: { type: CommandType.Variable, name: "b" },
        },
      },
    });
  });
});
