import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { Config, TranslationProfile } from "../types";
import { LANGUAGES } from "../constants";
import { Toggle } from "./Toggle";

type TranslationSectionProps = {
  config: Config;
  updateConfig: <K extends keyof Config>(key: K, val: Config[K]) => void;
  profiles: TranslationProfile[];
  activeProfileId: string;
  onProfileSelect: (id: string) => void;
  onProfileNameChange: (name: string) => void;
  onAddProfile: () => void;
  onDuplicateProfile: () => void;
  onDeleteProfile: () => void;
  onProfileFieldChange: (
    field: "targetLang" | "model" | "domainPreference",
    val: string,
  ) => void;
};

export function TranslationSection({
  config,
  updateConfig,
  profiles,
  activeProfileId,
  onProfileSelect,
  onProfileNameChange,
  onAddProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onProfileFieldChange,
}: TranslationSectionProps) {
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const [cacheStats, setCacheStats] = useState({
    entryCount: 0,
    totalBytes: 0,
    hitCount: 0,
    missCount: 0,
    lastError: null as string | null,
  });
  const [cacheLoading, setCacheLoading] = useState(false);
  const [filterAgeHours, setFilterAgeHours] = useState(24);
  const [filterMinKb, setFilterMinKb] = useState(256);
  const [filterLanguagePair, setFilterLanguagePair] = useState("");

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const refreshCacheStats = useCallback(() => {
    setCacheLoading(true);
    chrome.runtime.sendMessage(
      { type: "GET_TRANSLATION_CACHE_STATS" },
      (response) => {
        setCacheLoading(false);
        if (chrome.runtime.lastError || !response?.success || !response?.data) {
          return;
        }
        setCacheStats(response.data);
      },
    );
  }, []);

  useEffect(() => {
    refreshCacheStats();
  }, [refreshCacheStats]);

  useEffect(() => {
    refreshCacheStats();
  }, [
    config.translationCacheEnabled,
    config.translationCacheMaxEntries,
    config.translationCacheMaxBytes,
    config.translationCacheTtlMs,
    refreshCacheStats,
  ]);

  const hitRate = useMemo(() => {
    const total = cacheStats.hitCount + cacheStats.missCount;
    if (total === 0) return "0%";
    return `${Math.round((cacheStats.hitCount / total) * 100)}%`;
  }, [cacheStats.hitCount, cacheStats.missCount]);

  const clearAllCache = useCallback(() => {
    if (!confirm("确定要清空全部翻译缓存吗？")) return;
    if (!confirm("请再次确认：此操作不可撤销，继续吗？")) return;
    chrome.runtime.sendMessage(
      { type: "CLEAR_TRANSLATION_CACHE", confirmed: true },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          return;
        }
        setCacheStats(response.data);
      },
    );
  }, []);

  const clearByFilter = useCallback(() => {
    if (!confirm("确定按条件清理缓存吗？")) return;
    if (!confirm("请再次确认：将删除匹配条件的缓存条目，继续吗？")) return;
    const filter: Record<string, unknown> = {};
    if (filterAgeHours > 0) {
      filter.olderThanMs = Math.round(filterAgeHours * 60 * 60 * 1000);
    }
    if (filterMinKb > 0) {
      filter.largerThanBytes = Math.round(filterMinKb * 1024);
    }
    if (filterLanguagePair.trim()) {
      filter.languagePair = filterLanguagePair.trim();
    }
    chrome.runtime.sendMessage(
      { type: "CLEAR_TRANSLATION_CACHE", confirmed: true, filter },
      (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          return;
        }
        setCacheStats(response.data);
      },
    );
  }, [filterAgeHours, filterLanguagePair, filterMinKb]);

  return (
    <div className="animate-in">
      {/* ── 页头 ── */}
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="options-section-title mb-1!">翻译设置</h2>
            <p className="options-section-desc mb-0!">
              定制不同场景下的翻译行为
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <select
              className="echo-select min-w-[150px]"
              value={activeProfileId}
              onChange={(e) =>
                onProfileSelect((e.target as HTMLSelectElement).value)
              }
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              className="echo-btn echo-btn-ghost echo-btn-sm p-[6px]"
              onClick={onAddProfile}
              title="新建配置"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        {/* 方案名称 — 紧凑内联 */}
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            className="echo-input flex-1 text-[13px]"
            value={activeProfile?.name || ""}
            placeholder="配置方案名称"
            onInput={(e) =>
              onProfileNameChange((e.target as HTMLInputElement).value)
            }
          />
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm text-[11px]"
            onClick={onDuplicateProfile}
          >
            复制
          </button>
          <button
            className="echo-btn echo-btn-danger echo-btn-sm text-[11px]"
            onClick={onDeleteProfile}
            disabled={profiles.length <= 1}
          >
            删除
          </button>
        </div>
      </div>

      {/* ══════ 第一行：翻译偏好 + 交互触发 并排 ══════ */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* 左：翻译偏好 */}
        <div>
          <div className="section-label">翻译偏好</div>
          <div className="echo-card">
            <div className="p-4 border-b border-(--border-light)">
              <div className="text-[12px] font-medium text-(--text-secondary) mb-2">
                目标语言
              </div>
              <select
                className="echo-select w-full text-[12.5px]"
                value={config.targetLang}
                onChange={(e) =>
                  onProfileFieldChange(
                    "targetLang",
                    (e.target as HTMLSelectElement).value,
                  )
                }
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="p-4">
              <div className="text-[12px] font-medium text-(--text-secondary) mb-2">
                预设领域词库
              </div>
              <select
                className="echo-select w-full text-[12.5px]"
                value={config.domainPreference}
                onChange={(e) =>
                  onProfileFieldChange(
                    "domainPreference",
                    (e.target as HTMLSelectElement).value,
                  )
                }
              >
                <option value="">通用领域 (默认)</option>
                <option value="it">IT &amp; 编程</option>
                <option value="medical">医学与健康</option>
                <option value="finance">金融与经济</option>
                <option value="academic">学术论文</option>
              </select>
            </div>
          </div>
        </div>

        {/* 右：交互与触发 */}
        <div>
          <div className="section-label">交互与触发</div>
          <div className="echo-card">
            <div className="setting-row">
              <div className="setting-icon text-(--accent-solid)">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-title">划词翻译</div>
                <div className="setting-desc">选中文本时显示翻译图标</div>
              </div>
              <Toggle
                value={config.selectionTranslate}
                onChange={(v) => updateConfig("selectionTranslate", v)}
              />
            </div>

            {config.selectionTranslate && (
              <div className="setting-row bg-black/2 dark:bg-white/2">
                <div className="setting-icon opacity-0" />
                <div className="setting-content">
                  <div className="setting-title text-[12.5px]!">触发按键</div>
                </div>
                <select
                  className="echo-select text-[12px]"
                  value={config.triggerMode}
                  onChange={(e) =>
                    updateConfig(
                      "triggerMode",
                      (e.target as HTMLSelectElement).value as
                        | "none"
                        | "alt"
                        | "ctrl"
                        | "shift",
                    )
                  }
                >
                  <option value="none">无 (总是显示)</option>
                  <option value="alt">Alt / Option</option>
                  <option value="ctrl">Ctrl / Command</option>
                  <option value="shift">Shift</option>
                </select>
              </div>
            )}

            <div className="setting-row">
              <div className="setting-icon text-(--success)">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-title">悬停翻译</div>
                <div className="setting-desc">悬停段落自动翻译</div>
              </div>
              <Toggle
                value={config.hoverTranslate}
                onChange={(v) => updateConfig("hoverTranslate", v)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ══════ 第二行：全页翻译性能 + 悬浮按钮 并排 ══════ */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* 左：全页翻译性能 */}
        <div>
          <div className="section-label">全页翻译性能</div>
          <div className="echo-card">
            <div className="grid grid-cols-2 divide-x divide-(--border-light)">
              <div className="p-4">
                <div className="text-[12px] font-medium text-(--text-secondary) mb-1">
                  并发请求数
                </div>
                <div className="text-[11px] text-(--text-tertiary) mb-2">
                  同时翻译段落 (1-10)
                </div>
                <input
                  type="number"
                  className="echo-input w-full text-center text-[13px]"
                  value={config.translationConcurrency}
                  onInput={(e) =>
                    updateConfig(
                      "translationConcurrency",
                      Math.min(
                        10,
                        Math.max(
                          1,
                          Number((e.target as HTMLInputElement).value || 1),
                        ),
                      ),
                    )
                  }
                  min="1"
                  max="10"
                />
              </div>
              <div className="p-4">
                <div className="text-[12px] font-medium text-(--text-secondary) mb-1">
                  翻译超时
                </div>
                <div className="text-[11px] text-(--text-tertiary) mb-2">
                  单段落阈值 (ms)
                </div>
                <input
                  type="number"
                  className="echo-input w-full text-center text-[13px]"
                  value={config.translationTimeoutMs}
                  onInput={(e) =>
                    updateConfig(
                      "translationTimeoutMs",
                      Math.min(
                        60000,
                        Math.max(
                          5000,
                          Number((e.target as HTMLInputElement).value || 30000),
                        ),
                      ),
                    )
                  }
                  min="5000"
                  max="60000"
                />
              </div>
            </div>
            <div className="setting-row border-t border-(--border-light)">
              <div className="setting-icon text-(--success)">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12h6" />
                  <path d="M15 12h6" />
                  <path d="M12 3v6" />
                  <path d="M12 15v6" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-title">懒翻译全页</div>
                <div className="setting-desc">仅翻译视窗，滚动增量</div>
              </div>
              <Toggle
                value={config.lazyFullPageTranslate}
                onChange={(v) => updateConfig("lazyFullPageTranslate", v)}
              />
            </div>
          </div>
        </div>

        {/* 右：悬浮按钮 */}
        <div>
          <div className="section-label">悬浮按钮</div>
          <div className="echo-card">
            <div
              className="setting-row clickable"
              onClick={() =>
                updateConfig(
                  "floatingButtonEnabled",
                  !config.floatingButtonEnabled,
                )
              }
            >
              <div className="setting-icon text-(--success)">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8 12h8" />
                  <path d="M12 8v8" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-title">启用悬浮按钮</div>
                <div className="setting-desc">可拖拽的全页翻译入口</div>
              </div>
              <Toggle
                value={config.floatingButtonEnabled}
                onChange={(v) => updateConfig("floatingButtonEnabled", v)}
              />
            </div>

            {config.floatingButtonEnabled && (
              <>
                <div className="px-4 py-3 border-t border-(--border-light) bg-black/2 dark:bg-white/2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-(--text-tertiary)">
                      透明度 {Math.round(config.floatingButtonOpacity * 100)}%
                    </span>
                    <span className="text-[11px] text-(--text-tertiary)">
                      尺寸 {config.floatingButtonSize}px
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.05"
                      value={config.floatingButtonOpacity}
                      onInput={(e) =>
                        updateConfig(
                          "floatingButtonOpacity",
                          Number((e.target as HTMLInputElement).value),
                        )
                      }
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="32"
                      max="64"
                      step="2"
                      value={config.floatingButtonSize}
                      onInput={(e) =>
                        updateConfig(
                          "floatingButtonSize",
                          Number((e.target as HTMLInputElement).value),
                        )
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-(--text-tertiary)">
                      图标样式
                    </span>
                    <select
                      className="echo-select text-[12px] min-w-0!"
                      value={config.floatingButtonIconStyle}
                      onChange={(e) =>
                        updateConfig(
                          "floatingButtonIconStyle",
                          (e.target as HTMLSelectElement).value as
                            | "solid"
                            | "outline",
                        )
                      }
                    >
                      <option value="outline">线框</option>
                      <option value="solid">填充</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════ 第三行：翻译缓存 — 全宽 ══════ */}
      <div className="section-label">翻译缓存</div>
      <div className="echo-card">
        <div className="setting-row">
          <div className="setting-icon text-(--success)">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">启用翻译缓存</div>
            <div className="setting-desc">缓存翻译结果，减少重复请求</div>
          </div>
          <Toggle
            value={config.translationCacheEnabled}
            onChange={(v) => updateConfig("translationCacheEnabled", v)}
          />
        </div>

        {config.translationCacheEnabled && (
          <>
            {/* 缓存参数 — 3列 */}
            <div className="grid grid-cols-3 divide-x divide-(--border-light) border-t border-(--border-light) bg-black/2 dark:bg-white/2">
              <div className="p-3.5">
                <div className="text-[11px] text-(--text-tertiary) mb-1">
                  条目上限
                </div>
                <input
                  type="number"
                  className="echo-input w-full text-center text-[12.5px] mb-1"
                  value={config.translationCacheMaxEntries}
                  onInput={(e) =>
                    updateConfig(
                      "translationCacheMaxEntries",
                      Math.max(
                        100,
                        Math.min(
                          50000,
                          Number((e.target as HTMLInputElement).value || 100),
                        ),
                      ),
                    )
                  }
                  min="100"
                  max="50000"
                />
                <div className="text-[10.5px] text-(--text-hint) text-center">
                  已用 {cacheStats.entryCount}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-(--text-tertiary) mb-1">
                  空间上限 (MB)
                </div>
                <input
                  type="number"
                  className="echo-input w-full text-center text-[12.5px] mb-1"
                  value={Math.round(
                    config.translationCacheMaxBytes / (1024 * 1024),
                  )}
                  onInput={(e) =>
                    updateConfig(
                      "translationCacheMaxBytes",
                      Math.max(
                        256 * 1024,
                        Math.min(
                          1024 * 1024 * 1024,
                          Number((e.target as HTMLInputElement).value || 1) *
                            1024 *
                            1024,
                        ),
                      ),
                    )
                  }
                  min="1"
                  max="1024"
                />
                <div className="text-[10.5px] text-(--text-hint) text-center">
                  已用 {formatBytes(cacheStats.totalBytes)}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[11px] text-(--text-tertiary) mb-1">
                  有效期 (h)
                </div>
                <input
                  type="number"
                  className="echo-input w-full text-center text-[12.5px] mb-1"
                  value={Math.round(
                    config.translationCacheTtlMs / (60 * 60 * 1000),
                  )}
                  onInput={(e) =>
                    updateConfig(
                      "translationCacheTtlMs",
                      Math.max(
                        1,
                        Math.min(
                          24 * 365,
                          Number((e.target as HTMLInputElement).value || 1),
                        ),
                      ) *
                        60 *
                        60 *
                        1000,
                    )
                  }
                  min="1"
                  max={24 * 365}
                />
                <div className="text-[10.5px] text-(--text-hint) text-center">
                  命中率 {hitRate}
                </div>
              </div>
            </div>

            {/* 底部操作 */}
            <div className="px-4 py-3 border-t border-(--border-light) flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-(--text-tertiary)">
                <span>命中 {cacheStats.hitCount}</span>
                <span className="text-(--border-medium)">·</span>
                <span>未命中 {cacheStats.missCount}</span>
                <button
                  className="text-(--accent-solid) hover:underline ml-1 cursor-pointer"
                  onClick={refreshCacheStats}
                  disabled={cacheLoading}
                >
                  {cacheLoading ? "刷新中" : "刷新"}
                </button>
              </div>
              <button
                className="echo-btn echo-btn-danger echo-btn-sm text-[11px]"
                onClick={clearAllCache}
              >
                清空缓存
              </button>
            </div>

            {/* 条件清理 — 折叠 */}
            <details className="border-t border-(--border-light)">
              <summary className="px-4 py-2.5 text-[11.5px] font-medium text-(--text-tertiary) cursor-pointer hover:text-(--text-secondary) transition-colors select-none flex items-center gap-1.5">
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 [[open]>&]:rotate-90"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
                按条件清理
              </summary>
              <div className="px-4 pb-3 flex gap-2 items-center flex-wrap">
                <input
                  type="number"
                  className="echo-input w-[90px] text-[11.5px]"
                  value={filterAgeHours}
                  onInput={(e) =>
                    setFilterAgeHours(
                      Math.max(
                        0,
                        Number((e.target as HTMLInputElement).value || 0),
                      ),
                    )
                  }
                  min="0"
                  placeholder="时间(h)"
                />
                <input
                  type="number"
                  className="echo-input w-[90px] text-[11.5px]"
                  value={filterMinKb}
                  onInput={(e) =>
                    setFilterMinKb(
                      Math.max(
                        0,
                        Number((e.target as HTMLInputElement).value || 0),
                      ),
                    )
                  }
                  min="0"
                  placeholder="大小(KB)"
                />
                <input
                  type="text"
                  className="echo-input w-[120px] text-[11.5px]"
                  value={filterLanguagePair}
                  onInput={(e) =>
                    setFilterLanguagePair((e.target as HTMLInputElement).value)
                  }
                  placeholder={`auto->${config.targetLang}`}
                />
                <button
                  className="echo-btn echo-btn-ghost echo-btn-sm text-[11px]"
                  onClick={clearByFilter}
                >
                  执行
                </button>
              </div>
            </details>

            {cacheStats.lastError && (
              <div className="px-4 py-2 text-[11px] text-(--danger) border-t border-(--border-light)">
                缓存状态：{cacheStats.lastError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
