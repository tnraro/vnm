import { describe, expect, test } from "bun:test";
import {
  parseCommand,
  parseConditionArg,
  parseFunctionCommand,
} from "./command";
import { concatSvnm, parseSvnm, type SvnmState } from "./svnm-parser";

describe("svnm parsing", () => {
  test("a paragraph", () => {
    const svnm = `# state
a.`;
    const state = parseSvnm(svnm);
    expect(state).toStrictEqual({
      stateMap: new Map([
        [
          "state",
          {
            id: "state",
            scope: "state",
            paragraph: "a.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {},
          },
        ],
      ]),
    });
  });
  test("a paragraph with metadata", () => {
    const svnm = `# state
a.

---

전역변수:
  변수: 1
지역변수:
  변수: 2
선택지:
  선택지1:
    - 출력("선택지1")
이벤트:
  사용자_이벤트:
    - 출력("사용자 이벤트")`;
    const state = parseSvnm(svnm);
    expect(state).toStrictEqual({
      stateMap: new Map([
        [
          "state",
          {
            id: "state",
            scope: "state",
            paragraph: "a.",
            globalVariables: { 변수: 1 },
            localVariables: { 변수: 2 },
            options: [
              {
                name: "선택지1",
                condition: undefined,
                commands: [parseCommand("출력('선택지1')")],
              },
            ],
            events: {
              사용자_이벤트: [parseCommand("출력('사용자 이벤트')")],
              완독: [parseCommand("선택지()")],
            },
          },
        ],
      ]),
    });
  });
  test("paragraphs", () => {
    const svnm = `# state
a.

b.`;
    const state = parseSvnm(svnm);
    expect(state).toStrictEqual({
      stateMap: new Map<string, SvnmState>([
        [
          "state",
          {
            id: "state",
            scope: "state",
            paragraph: "a.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {
              다음: [parseCommand(`이동(#state__seq1)`)],
            },
          },
        ],
        [
          "state__seq1",
          {
            id: "state__seq1",
            scope: "state",
            paragraph: "b.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {},
          },
        ],
      ]),
    });
  });
  test("paragraphs with metadata", () => {
    const svnm = `# state
a.

b.

c.
---
전역변수:
  변수: 1
지역변수:
  변수: 2
선택지:
  선택지1:
    - 출력("선택지1")
이벤트:
  사용자_이벤트:
    - 출력("사용자 이벤트")`;
    const state = parseSvnm(svnm);
    expect(state).toStrictEqual({
      stateMap: new Map<string, SvnmState>([
        [
          "state",
          {
            id: "state",
            scope: "state",
            paragraph: "a.",
            globalVariables: { 변수: 1 },
            localVariables: { 변수: 2 },
            options: undefined,
            events: {
              다음: [parseCommand(`이동(#state__seq1)`)],
            },
          },
        ],
        [
          "state__seq1",
          {
            id: "state__seq1",
            scope: "state",
            paragraph: "b.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {
              다음: [parseCommand(`이동(#state__seq2)`)],
            },
          },
        ],
        [
          "state__seq2",
          {
            id: "state__seq2",
            scope: "state",
            paragraph: "c.",
            globalVariables: undefined,
            localVariables: undefined,
            options: [
              {
                name: "선택지1",
                condition: undefined,
                commands: [parseCommand("출력('선택지1')")],
              },
            ],
            events: {
              사용자_이벤트: [parseCommand("출력('사용자 이벤트')")],
              완독: [parseCommand("선택지()")],
            },
          },
        ],
      ]),
    });
  });

  test("options", () => {
    const svnm = `# S
a.
---
선택지:
  공격:
    - 이동(#S)
  ($hp > 1) 이면, 방어:
    - 이동(#S)
  회피:
    - 이동(#S)`;
    expect(parseSvnm(svnm)).toStrictEqual({
      stateMap: new Map<string, SvnmState>([
        [
          "S",
          {
            id: "S",
            scope: "S",
            paragraph: "a.",
            globalVariables: undefined,
            localVariables: undefined,
            options: [
              {
                name: "공격",
                condition: undefined,
                commands: [parseCommand("이동(#S)")],
              },
              {
                name: "방어",
                condition: parseConditionArg("$hp > 1"),
                commands: [parseCommand("이동(#S)")],
              },
              {
                name: "회피",
                condition: undefined,
                commands: [parseCommand("이동(#S)")],
              },
            ],
            events: {
              완독: [parseCommand("선택지()")],
            },
          },
        ],
      ]),
    });
  });

  test("customize scope", () => {
    const svnm = `# S
a.
---
변수범위: 역사`;
    expect(parseSvnm(svnm)).toStrictEqual({
      stateMap: new Map<string, SvnmState>([
        [
          "S",
          {
            id: "S",
            scope: "역사",
            paragraph: "a.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {},
          },
        ],
      ]),
    });
  });

  test("multi states", () => {
    const svnm = `# S
a.

b.

c.
---
이벤트:
  다음:
    - 이동(#A)

# A

This is an A.

---
선택지:
  B로 가기:
    - 이동(#B)
  C로 가기:
    - 이동(#C)

# B

This is a B.
---
이벤트:
  다음:
    - 이동(#D)
# C

This is a C.
---
이벤트:
  다음:
    - 이동(#D)

# D
This is a D end.`;
    const state = parseSvnm(svnm);
    expect(state.stateMap.get("S")).toStrictEqual({
      id: "S",
      scope: "S",
      paragraph: "a.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {
        다음: [parseCommand(`이동(#S__seq1)`)],
      },
    });
    expect(state.stateMap.get("S__seq1")).toStrictEqual({
      id: "S__seq1",
      scope: "S",
      paragraph: "b.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {
        다음: [parseCommand(`이동(#S__seq2)`)],
      },
    });
    expect(state.stateMap.get("S__seq2")).toStrictEqual({
      id: "S__seq2",
      scope: "S",
      paragraph: "c.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {
        다음: [parseCommand(`이동(#A)`)],
      },
    });
    expect(state.stateMap.get("A")).toStrictEqual({
      id: "A",
      scope: "A",
      paragraph: "This is an A.",
      globalVariables: undefined,
      localVariables: undefined,
      options: [
        {
          name: "B로 가기",
          condition: undefined,
          commands: [parseCommand(`이동(#B)`)],
        },
        {
          name: "C로 가기",
          condition: undefined,
          commands: [parseCommand(`이동(#C)`)],
        },
      ],
      events: {
        완독: [parseCommand(`선택지()`)],
      },
    });
    expect(state.stateMap.get("B")).toStrictEqual({
      id: "B",
      scope: "B",
      paragraph: "This is a B.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {
        다음: [parseCommand(`이동(#D)`)],
      },
    });
    expect(state.stateMap.get("C")).toStrictEqual({
      id: "C",
      scope: "C",
      paragraph: "This is a C.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {
        다음: [parseCommand(`이동(#D)`)],
      },
    });
    expect(state.stateMap.get("D")).toStrictEqual({
      id: "D",
      scope: "D",
      paragraph: "This is a D end.",
      globalVariables: undefined,
      localVariables: undefined,
      options: undefined,
      events: {},
    });
  });
  test("events", () => {
    const svnm = `# S
a.

b.

c.
---
이벤트:
  입장:
    - 출력(5)
  퇴장:
    - 출력(3)
  사용자정의이벤트:
    - 출력(1)
  완독:
    - 출력(2)
`;
    expect(parseSvnm(svnm)).toStrictEqual({
      stateMap: new Map<string, SvnmState>([
        [
          "S",
          {
            id: "S",
            scope: "S",
            paragraph: "a.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {
              입장: [parseFunctionCommand("출력(5)")],
              다음: [parseFunctionCommand("이동(#S__seq1)")],
            },
          },
        ],
        [
          "S__seq1",
          {
            id: "S__seq1",
            scope: "S",
            paragraph: "b.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {
              다음: [parseFunctionCommand("이동(#S__seq2)")],
            },
          },
        ],
        [
          "S__seq2",
          {
            id: "S__seq2",
            scope: "S",
            paragraph: "c.",
            globalVariables: undefined,
            localVariables: undefined,
            options: undefined,
            events: {
              퇴장: [parseFunctionCommand("출력(3)")],
              사용자정의이벤트: [parseFunctionCommand("출력(1)")],
              완독: [parseFunctionCommand("출력(2)")],
            },
          },
        ],
      ]),
    });
  });
});

describe("concat svnm", () => {
  test("[1,2], [3,4]", () => {
    const s = concatSvnm(
      {
        stateMap: new Map([
          ["1", { id: "1", scope: "1", paragraph: "asd", events: {} }],
          ["2", { id: "2", scope: "2", paragraph: "qwe", events: {} }],
        ]),
      },
      {
        stateMap: new Map([
          ["3", { id: "3", scope: "3", paragraph: "asd", events: {} }],
          ["4", { id: "4", scope: "4", paragraph: "qwe", events: {} }],
        ]),
      }
    );
    expect(s).toStrictEqual({
      stateMap: new Map([
        ["1", { id: "1", scope: "1", paragraph: "asd", events: {} }],
        ["2", { id: "2", scope: "2", paragraph: "qwe", events: {} }],
        ["3", { id: "3", scope: "3", paragraph: "asd", events: {} }],
        ["4", { id: "4", scope: "4", paragraph: "qwe", events: {} }],
      ]),
    });
  });
  test("[1], [1] must be throw a Error", () => {
    expect(() =>
      concatSvnm(
        {
          stateMap: new Map([
            ["1", { id: "1", scope: "1", paragraph: "1", events: {} }],
          ]),
        },
        {
          stateMap: new Map([
            ["1", { id: "1", scope: "1", paragraph: "2", events: {} }],
          ]),
        }
      )
    ).toThrowError(Error);
  });
});
