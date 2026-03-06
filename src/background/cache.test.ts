import { describe, expect, it, vi } from "vitest";
import { TranslationCache, TranslationCacheConfig } from "./cache";

function createConfig(overrides: Partial<TranslationCacheConfig> = {}): TranslationCacheConfig {
  return {
    enabled: true,
    maxEntries: 1000,
    maxBytes: 10 * 1024 * 1024,
    ttlMs: 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

function waitForQueue() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe("TranslationCache", () => {
  it("handles miss then hit for same original text", async () => {
    const cache = new TranslationCache(createConfig(), {
      loadAll: async () => [],
      upsert: async () => {},
      remove: async () => {},
      clear: async () => {},
    });
    await cache.warmup();
    expect(cache.get("hello", "zh-CN")).toBeNull();
    cache.put("hello", "zh-CN", "你好");
    await waitForQueue();
    expect(cache.get("hello", "zh-CN")).toBe("你好");
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(1);
    expect(stats.missCount).toBe(1);
  });

  it("stores multiple language pairs under same text key", async () => {
    const cache = new TranslationCache(createConfig(), {
      loadAll: async () => [],
      upsert: async () => {},
      remove: async () => {},
      clear: async () => {},
    });
    cache.put("world", "zh-CN", "世界");
    cache.put("world", "ja", "世界");
    await waitForQueue();
    expect(cache.get("world", "zh-CN")).toBe("世界");
    expect(cache.get("world", "ja")).toBe("世界");
    expect(cache.get("world", "en")).toBeNull();
  });

  it("supports conditional clearing by language pair", async () => {
    const cache = new TranslationCache(createConfig(), {
      loadAll: async () => [],
      upsert: async () => {},
      remove: async () => {},
      clear: async () => {},
    });
    cache.put("a", "zh-CN", "甲");
    cache.put("b", "en", "b");
    await waitForQueue();
    await cache.clearByFilter({ languagePair: "auto->zh-CN" });
    await waitForQueue();
    expect(cache.get("a", "zh-CN")).toBeNull();
    expect(cache.get("b", "en")).toBe("b");
  });

  it("returns accurate stats for entries and bytes", async () => {
    const cache = new TranslationCache(createConfig(), {
      loadAll: async () => [],
      upsert: async () => {},
      remove: async () => {},
      clear: async () => {},
    });
    cache.put("byte-test", "zh-CN", "字节统计");
    await waitForQueue();
    const stats = cache.getStats();
    expect(stats.entryCount).toBe(1);
    expect(stats.totalBytes).toBeGreaterThan(0);
  });

  it("degrades when storage load fails", async () => {
    const cache = new TranslationCache(createConfig(), {
      loadAll: async () => {
        throw new Error("read failed");
      },
      upsert: async () => {},
      remove: async () => {},
      clear: async () => {},
    });
    await cache.warmup();
    const stats = cache.getStats();
    expect(stats.lastError).toContain("read failed");
    cache.put("x", "zh-CN", "y");
    await waitForQueue();
    expect(cache.get("x", "zh-CN")).toBe("y");
  });

  it("evicts and retries when storage upsert fails", async () => {
    const remove = vi.fn(async () => {});
    let callCount = 0;
    const upsert = vi.fn(async () => {
      callCount += 1;
      if (callCount === 2) {
        throw new Error("QuotaExceededError");
      }
    });
    const cache = new TranslationCache(
      createConfig({
        maxEntries: 10,
      }),
      {
        loadAll: async () => [],
        upsert,
        remove,
        clear: async () => {},
      },
    );
    cache.put("first", "zh-CN", "一");
    cache.put("second", "zh-CN", "二");
    await waitForQueue();
    expect(remove).toHaveBeenCalledWith("first");
    expect(cache.get("second", "zh-CN")).toBe("二");
  });
});
