export type TranslationCacheConfig = {
  enabled: boolean;
  maxEntries: number;
  maxBytes: number;
  ttlMs: number;
};

export type CacheStats = {
  entryCount: number;
  totalBytes: number;
  hitCount: number;
  missCount: number;
  lastError: string | null;
};

export type CacheClearFilter = {
  olderThanMs?: number;
  largerThanBytes?: number;
  languagePair?: string;
};

type TranslationValue = {
  translation: string;
  detectedLang: string;
  updatedAt: number;
};

type CacheEntry = {
  key: string;
  translations: Record<string, TranslationValue>;
  createdAt: number;
  updatedAt: number;
  lastAccessAt: number;
  expiresAt: number;
  byteSize: number;
  checksum: string;
};

type CacheStorageAdapter = {
  loadAll: () => Promise<CacheEntry[]>;
  upsert: (entry: CacheEntry) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
};

const DB_NAME = "echo-read-translation-cache";
const STORE_NAME = "translations";
const DB_VERSION = 1;
const DEFAULT_WARMUP_TIMEOUT_MS = 80;

function nowMs() {
  return Date.now();
}

function normalizeKey(text: string) {
  return text.trim();
}

function toLanguagePair(targetLang: string) {
  return `auto->${targetLang}`;
}

function checksum(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function calcByteSize(entry: Omit<CacheEntry, "byteSize">) {
  return new TextEncoder().encode(JSON.stringify(entry)).byteLength;
}

function createIndexedDbAdapter(): CacheStorageAdapter | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  const openDb = () =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("打开缓存数据库失败"));
    });

  const run = <T>(
    mode: IDBTransactionMode,
    execute: (store: IDBObjectStore, done: (v: T) => void) => void,
  ) =>
    new Promise<T>((resolve, reject) => {
      openDb()
        .then((db) => {
          const tx = db.transaction(STORE_NAME, mode);
          const store = tx.objectStore(STORE_NAME);
          execute(store, resolve);
          tx.oncomplete = () => db.close();
          tx.onerror = () => {
            db.close();
            reject(tx.error || new Error("缓存数据库事务失败"));
          };
        })
        .catch((error) => {
          reject(error);
        });
    });

  return {
    loadAll: () =>
      run<CacheEntry[]>("readonly", (store, done) => {
        const req = store.getAll();
        req.onsuccess = () => done((req.result as CacheEntry[]) || []);
        req.onerror = () => done([]);
      }),
    upsert: (entry) =>
      run<void>("readwrite", (store, done) => {
        store.put(entry);
        done(undefined);
      }),
    remove: (key) =>
      run<void>("readwrite", (store, done) => {
        store.delete(key);
        done(undefined);
      }),
    clear: () =>
      run<void>("readwrite", (store, done) => {
        store.clear();
        done(undefined);
      }),
  };
}

export class TranslationCache {
  private config: TranslationCacheConfig;
  private readonly memory = new Map<string, CacheEntry>();
  private readonly adapter: CacheStorageAdapter | null;
  private hitCount = 0;
  private missCount = 0;
  private lastError: string | null = null;
  private initPromise: Promise<void> | null = null;
  private persistChain: Promise<void> = Promise.resolve();

  constructor(config: TranslationCacheConfig, adapter?: CacheStorageAdapter | null) {
    this.config = config;
    this.adapter = adapter === undefined ? createIndexedDbAdapter() : adapter;
  }

  setConfig(config: TranslationCacheConfig) {
    this.config = config;
    this.evictByPolicy();
  }

  getConfig() {
    return this.config;
  }

  async warmup(timeoutMs = DEFAULT_WARMUP_TIMEOUT_MS) {
    if (!this.initPromise) {
      this.initPromise = this.loadFromStorage();
    }
    await Promise.race([
      this.initPromise,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  get(originalText: string, targetLang: string): string | null {
    if (!this.config.enabled) {
      this.missCount += 1;
      return null;
    }
    const key = normalizeKey(originalText);
    if (!key) {
      this.missCount += 1;
      return null;
    }
    const entry = this.memory.get(key);
    if (!entry) {
      this.missCount += 1;
      return null;
    }
    if (entry.expiresAt <= nowMs() || !this.verifyEntry(entry)) {
      this.memory.delete(key);
      this.enqueuePersist(() => this.adapter?.remove(key));
      this.missCount += 1;
      return null;
    }
    const pair = toLanguagePair(targetLang);
    const value = entry.translations[pair];
    if (!value) {
      this.touchEntry(entry);
      this.missCount += 1;
      return null;
    }
    this.touchEntry(entry);
    this.hitCount += 1;
    return value.translation;
  }

  put(
    originalText: string,
    targetLang: string,
    translation: string,
    detectedLang = "auto",
  ) {
    if (!this.config.enabled) return;
    const key = normalizeKey(originalText);
    if (!key) return;
    const pair = toLanguagePair(targetLang);
    const at = nowMs();
    const existing = this.memory.get(key);
    const translations = { ...(existing?.translations || {}) };
    translations[pair] = { translation, detectedLang, updatedAt: at };
    const rawEntry: Omit<CacheEntry, "byteSize"> = {
      key,
      translations,
      createdAt: existing?.createdAt || at,
      updatedAt: at,
      lastAccessAt: at,
      expiresAt: at + this.config.ttlMs,
      checksum: "",
    };
    const hashedEntry = {
      ...rawEntry,
      checksum: checksum(
        JSON.stringify({
          key: rawEntry.key,
          translations: rawEntry.translations,
          updatedAt: rawEntry.updatedAt,
          expiresAt: rawEntry.expiresAt,
        }),
      ),
    };
    const entry: CacheEntry = {
      ...hashedEntry,
      byteSize: calcByteSize(hashedEntry),
    };
    this.memory.delete(key);
    this.memory.set(key, entry);
    this.evictByPolicy();
    this.enqueuePersist(async () => {
      if (!this.adapter) return;
      try {
        await this.adapter.upsert(entry);
      } catch (error) {
        await this.handlePersistFailure(key, entry, error);
      }
    });
  }

  async clearAll() {
    this.memory.clear();
    this.lastError = null;
    this.enqueuePersist(() => this.adapter?.clear());
  }

  async clearByFilter(filter: CacheClearFilter) {
    const at = nowMs();
    const toRemove: string[] = [];
    for (const [key, entry] of this.memory) {
      const byTime =
        typeof filter.olderThanMs === "number"
          ? at - entry.updatedAt >= filter.olderThanMs
          : false;
      const bySize =
        typeof filter.largerThanBytes === "number"
          ? entry.byteSize >= filter.largerThanBytes
          : false;
      const byLanguage = filter.languagePair
        ? Object.keys(entry.translations).includes(filter.languagePair)
        : false;
      if (byTime || bySize || byLanguage) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((key) => this.memory.delete(key));
    this.enqueuePersist(async () => {
      if (!this.adapter) return;
      await Promise.all(toRemove.map((key) => this.adapter!.remove(key)));
    });
  }

  getStats(): CacheStats {
    let totalBytes = 0;
    for (const entry of this.memory.values()) {
      totalBytes += entry.byteSize;
    }
    return {
      entryCount: this.memory.size,
      totalBytes,
      hitCount: this.hitCount,
      missCount: this.missCount,
      lastError: this.lastError,
    };
  }

  private async loadFromStorage() {
    if (!this.adapter) return;
    try {
      const all = await this.adapter.loadAll();
      const at = nowMs();
      for (const entry of all) {
        if (entry.expiresAt <= at) {
          this.enqueuePersist(() => this.adapter?.remove(entry.key));
          continue;
        }
        if (!this.verifyEntry(entry)) {
          this.enqueuePersist(() => this.adapter?.remove(entry.key));
          continue;
        }
        this.memory.set(entry.key, entry);
      }
      this.evictByPolicy();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  private verifyEntry(entry: CacheEntry) {
    const expected = checksum(
      JSON.stringify({
        key: entry.key,
        translations: entry.translations,
        updatedAt: entry.updatedAt,
        expiresAt: entry.expiresAt,
      }),
    );
    return expected === entry.checksum;
  }

  private touchEntry(entry: CacheEntry) {
    const touched: CacheEntry = {
      ...entry,
      lastAccessAt: nowMs(),
    };
    this.memory.delete(entry.key);
    this.memory.set(entry.key, touched);
  }

  private evictByPolicy() {
    const at = nowMs();
    for (const [key, entry] of this.memory) {
      if (entry.expiresAt <= at) {
        this.memory.delete(key);
        this.enqueuePersist(() => this.adapter?.remove(key));
      }
    }
    while (this.memory.size > this.config.maxEntries || this.bytesUsed() > this.config.maxBytes) {
      const firstKey = this.memory.keys().next().value as string | undefined;
      if (!firstKey) break;
      this.memory.delete(firstKey);
      this.enqueuePersist(() => this.adapter?.remove(firstKey));
    }
  }

  private bytesUsed() {
    let total = 0;
    for (const item of this.memory.values()) {
      total += item.byteSize;
    }
    return total;
  }

  private enqueuePersist(job: () => void | Promise<void>) {
    this.persistChain = this.persistChain
      .then(async () => {
        try {
          await job();
        } catch (error) {
          this.lastError = error instanceof Error ? error.message : String(error);
        }
      })
      .catch((error) => {
        this.lastError = error instanceof Error ? error.message : String(error);
      });
  }

  private async handlePersistFailure(
    key: string,
    entry: CacheEntry,
    error: unknown,
  ) {
    this.lastError = error instanceof Error ? error.message : String(error);
    const firstKey = this.memory.keys().next().value as string | undefined;
    if (!firstKey || firstKey === key) return;
    this.memory.delete(firstKey);
    try {
      await this.adapter?.remove(firstKey);
      await this.adapter?.upsert(entry);
      this.lastError = null;
    } catch (retryError) {
      this.lastError =
        retryError instanceof Error ? retryError.message : String(retryError);
    }
  }
}
