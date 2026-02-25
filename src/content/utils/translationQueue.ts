export type SettledResult<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout?: () => void,
): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(new Error("Translation timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export async function retryWithBackoff<T>(
  task: () => Promise<T>,
  retries: number,
  baseDelayMs: number,
) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= retries) throw error;
      await delay(baseDelayMs * (attempt + 1));
      attempt += 1;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function runAllSettledWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<SettledResult<T>[]> {
  const results: SettledResult<T>[] = [];
  let nextIndex = 0;
  let active = 0;

  return new Promise((resolve) => {
    const schedule = () => {
      if (nextIndex >= tasks.length && active === 0) {
        resolve(results);
        return;
      }

      while (active < concurrency && nextIndex < tasks.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        active += 1;

        tasks[currentIndex]()
          .then((value) => {
            results[currentIndex] = { status: "fulfilled", value };
          })
          .catch((reason) => {
            results[currentIndex] = { status: "rejected", reason };
          })
          .finally(() => {
            active -= 1;
            schedule();
          });
      }
    };

    schedule();
  });
}
