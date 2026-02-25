import { describe, expect, it, vi } from "vitest";
import {
  clamp,
  delay,
  retryWithBackoff,
  runAllSettledWithConcurrency,
  withTimeout,
} from "./translationQueue";

describe("translationQueue utilities", () => {
  it("clamp keeps value within range", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(0, 1, 10)).toBe(1);
    expect(clamp(11, 1, 10)).toBe(10);
  });

  it("delay resolves after given time", async () => {
    const start = Date.now();
    await delay(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });

  it("withTimeout resolves before timeout", async () => {
    await expect(
      withTimeout(Promise.resolve("ok"), 50),
    ).resolves.toBe("ok");
  });

  it("withTimeout rejects after timeout", async () => {
    await expect(
      withTimeout(
        new Promise((resolve) => setTimeout(() => resolve("late"), 30)),
        5,
      ),
    ).rejects.toThrow("Translation timeout");
  });

  it("retryWithBackoff retries and succeeds", async () => {
    const task = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("ok");
    await expect(retryWithBackoff(task, 2, 1)).resolves.toBe("ok");
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("runAllSettledWithConcurrency limits concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 5 }, (_, index) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await delay(5);
      active -= 1;
      return index;
    });

    const results = await runAllSettledWithConcurrency(tasks, 2);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(results).toHaveLength(5);
    expect(results[0].status).toBe("fulfilled");
  });
});
