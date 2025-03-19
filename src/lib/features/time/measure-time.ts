export async function measureTime<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R> | R,
  ...args: Args
) {
  const t0 = performance.now();
  try {
    return await fn(...args);
  } catch (e) {
    throw e;
  } finally {
    const delta = performance.now() - t0;
    console.info(`${fn.name} takes ${formatTime(delta)}`);
  }
}

function formatTime(ms: number) {
  let result = [];
  ms = Math.trunc(ms);
  if (ms === 0) {
    return `0 ms`;
  }
  if (ms % 1000 > 0) {
    result.unshift(`${ms % 1000} ms`);
  }
  ms = Math.trunc(ms / 1000);
  if (ms % 60 > 0) {
    result.unshift(`${ms % 60} s`);
  }
  ms = Math.trunc(ms / 60);
  if (ms % 60 > 0) {
    result.unshift(`${ms % 60} m`);
  }
  ms = Math.trunc(ms / 60);
  if (ms % 24 > 0) {
    result.unshift(`${ms % 24} h`);
  }
  ms = Math.trunc(ms / 24);
  if (ms % 7 > 0) {
    result.unshift(`${ms % 7} d`);
  }

  return result.join(" ");
}
