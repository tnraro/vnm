import { sleep } from "bun";
import { expect, spyOn, test } from "bun:test";
import { parseSvnm } from "./svnm-parser";
import { SvnmRuntime } from "./svnm-runtime";

test("이동", async () => {
  const svnm = parseSvnm(`# S
a.
---
이벤트:
  다음:
    - 출력("ㅁㄴㅇ ㅁㄴㅇ")
    - 이동(#A)
# A
b.
---
이벤트:
  다음:
    - 이동(#S)
`);

  const functions = {
    출력: () => {},
    이동: () => {},
  };
  const spy출력 = spyOn(functions, "출력");
  const spy이동 = spyOn(functions, "이동");
  const runtime = new SvnmRuntime(svnm, {
    start: "S",
    functions,
  });
  expect(spy출력).toHaveBeenCalledTimes(0);
  expect(spy이동).toHaveBeenCalledTimes(0);
  runtime.emit("다음");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(1);
  expect(spy이동).toHaveBeenCalledTimes(1);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "A");
  runtime.emit("다음");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(1);
  expect(spy이동).toHaveBeenCalledTimes(2);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "S");
  runtime.emit("다음");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(2);
  expect(spy이동).toHaveBeenCalledTimes(3);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "A");
});
test("이동2", async () => {
  const svnm = parseSvnm(`# S
a.

b.

c.
---
이벤트:
  다음:
    - 이동(#A)
# A
d.

e.
---
이벤트:
  다음:
    - 이동(#S)
`);

  const functions = {
    이동: () => {},
  };
  const spy이동 = spyOn(functions, "이동");
  const runtime = new SvnmRuntime(svnm, {
    start: "S",
    functions,
  });
  expect(spy이동).toHaveBeenCalledTimes(0);
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(1);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "S__seq1");
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(2);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "S__seq2");
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(3);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "A");
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(4);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "A__seq1");
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(5);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "S");
  runtime.emit("다음");
  await sleep(0);
  expect(spy이동).toHaveBeenCalledTimes(6);
  expect(spy이동).toHaveBeenLastCalledWith(runtime, "S__seq1");
});

test("입퇴장", async () => {
  const svnm = parseSvnm(`# S
a.
---
이벤트:
  입장:
    - 출력("enter S")
  퇴장:
    - 출력("exit S")
  다음:
    - 이동(#A)
# A
b.
---
이벤트:
  입장:
    - 출력("enter A")
  퇴장:
    - 출력("exit A")
  다음:
    - 이동(#S)
`);

  const functions = {
    출력: () => {},
  };
  const spy출력 = spyOn(functions, "출력");
  const runtime = new SvnmRuntime(svnm, {
    start: "S",
    functions,
  });
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(1);
  expect(spy출력).toHaveBeenLastCalledWith(runtime, "enter S");
  runtime.emit("다음");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(3);
  expect(spy출력).toHaveBeenNthCalledWith(2, runtime, "exit S");
  expect(spy출력).toHaveBeenNthCalledWith(3, runtime, "enter A");

  runtime.emit("다음");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(5);
  expect(spy출력).toHaveBeenNthCalledWith(4, runtime, "exit A");
  expect(spy출력).toHaveBeenNthCalledWith(5, runtime, "enter S");
});

test("선택지", async () => {
  const svnm = parseSvnm(`# S
a.
---
선택지:
  A:
    - 출력("A")
  B:
    - 출력("B")
`);

  const functions = {
    출력: () => {},
    선택지: () => {},
  };
  const spy출력 = spyOn(functions, "출력");
  const spy선택지 = spyOn(functions, "선택지");
  const runtime = new SvnmRuntime(svnm, {
    start: "S",
    functions,
  });
  expect(spy출력).toHaveBeenCalledTimes(0);
  expect(spy선택지).toHaveBeenCalledTimes(0);
  runtime.emit("완독");
  await sleep(0);
  expect(spy선택지).toHaveBeenCalledTimes(1);
  runtime.select("A");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(1);
  expect(spy선택지).toHaveBeenCalledTimes(1);
});

test("지역변수", async () => {
  const svnm = parseSvnm(`# S
s.
---
전역변수:
  a: 3
이벤트:
  입장:
    - 출력($a)
  다음:
    - 이동(#A)

# A
a.

b.
---
지역변수:
  a: 5
이벤트:
  입장:
    - 출력($a)
  다음:
    - 이동(#B)
# B
c.
---
이벤트:
  입장:
    - 출력($a)
`);

  const functions = {
    출력: () => {},
  };
  const spy출력 = spyOn(functions, "출력");
  const runtime = new SvnmRuntime(svnm, {
    start: "S",
    functions,
  });
  expect(runtime.getVariable("a")).toBe(3);
  expect(spy출력).toHaveBeenCalledTimes(0);
  expect(runtime.currentState?.id).toBe("S");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(1);
  expect(spy출력).toHaveBeenLastCalledWith(runtime, 3);
  runtime.emit("다음");
  await sleep(0);
  expect(runtime.getVariable("a")).toBe(5);
  expect(runtime.currentState?.id).toBe("A");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(2);
  expect(spy출력).toHaveBeenLastCalledWith(runtime, 5);
  runtime.emit("다음");
  await sleep(0);
  expect(runtime.getVariable("a")).toBe(5);
  expect(runtime.currentState?.id).toBe("A__seq1");
  await sleep(0);
  expect(spy출력).toHaveBeenCalledTimes(2);
  expect(spy출력).toHaveBeenLastCalledWith(runtime, 5);
  runtime.emit("다음");
  await sleep(0);
  expect(runtime.getVariable("a")).toBe(3);
  expect(runtime.currentState?.id).toBe("B");
});
