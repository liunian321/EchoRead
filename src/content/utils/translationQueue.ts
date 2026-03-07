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
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (onTimeout) onTimeout();
      reject(new Error("Translation timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
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
  options?: {
    signal?: AbortSignal;
    abortOnFirstReject?: boolean;
  },
): Promise<SettledResult<T>[]> {
  const results: SettledResult<T>[] = [];
  let nextIndex = 0;
  let active = 0;
  let aborted = false;
  const signal = options?.signal;
  const abortOnFirstReject = options?.abortOnFirstReject ?? false;
  // Track whether any task has succeeded yet — only abort-on-first-reject
  // when zero tasks have succeeded so far (i.e. the very first request failed).
  let hasAnySuccess = false;

  return new Promise((resolve) => {
    const finish = () => {
      aborted = true;
      resolve(results);
    };

    // Listen for external abort signal
    if (signal) {
      if (signal.aborted) {
        resolve(results);
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          if (!aborted) finish();
        },
        { once: true },
      );
    }

    const schedule = () => {
      if (aborted) return;

      if (nextIndex >= tasks.length && active === 0) {
        if (!aborted) finish();
        return;
      }

      while (!aborted && active < concurrency && nextIndex < tasks.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        active += 1;

        tasks[currentIndex]()
          .then((value) => {
            results[currentIndex] = { status: "fulfilled", value };
            hasAnySuccess = true;
          })
          .catch((reason) => {
            results[currentIndex] = { status: "rejected", reason };
            // If no task has ever succeeded and this is a rejection,
            // abort all remaining tasks (the API is likely misconfigured).
            if (abortOnFirstReject && !hasAnySuccess) {
              console.warn(
                "EchoRead: first translation request failed, skipping remaining tasks",
                reason,
              );
              aborted = true;
            }
          })
          .finally(() => {
            active -= 1;
            schedule();
          });
      }

      // After setting aborted=true in catch, drain remaining active tasks
      if (aborted && active === 0) {
        finish();
      }
    };

    schedule();
  });
}
