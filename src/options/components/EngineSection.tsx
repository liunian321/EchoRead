import { useState, useRef, useEffect } from "preact/hooks";
import { Config, ModelInfo } from "../types";
import { MODELS } from "../constants";

type EngineSectionProps = {
  config: Config;
  updateConfig: <K extends keyof Config>(key: K, val: Config[K]) => void;
  onTestConnection: () => void;
  testResult: "idle" | "testing" | "success" | "error";
  modelList: ModelInfo[];
  modelLoading: boolean;
  modelError: string | null;
  onRefreshModels: (forceRefresh?: boolean, url?: string, key?: string) => void;
  onProfileFieldChange: (
    field: "targetLang" | "model" | "domainPreference",
    val: string,
  ) => void;
};

/** 连通性按钮样式 */
const BASE_BTN =
  "inline-flex items-center gap-1.5 h-[30px] px-4 rounded-[8px] text-[12.5px] font-[520] cursor-pointer select-none transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none whitespace-nowrap";

const TEST_RESULT_CONFIG = {
  idle: {
    label: "测试连通性",
    icon: null,
    className: `${BASE_BTN} bg-gradient-to-r from-[#2d7dd2] via-[#3390ec] to-[#22a8f0] text-white ring-1 ring-white/15 shadow-[0_1px_6px_rgba(51,144,236,0.4)] hover:brightness-110 hover:shadow-[0_2px_12px_rgba(51,144,236,0.5)]`,
  },
  testing: {
    label: "检测中",
    icon: "spinner",
    className: `${BASE_BTN} bg-(--bg-surface) text-(--text-tertiary) border border-(--border) opacity-60 cursor-wait pointer-events-none`,
  },
  success: {
    label: "验证通过",
    icon: "check",
    className: `${BASE_BTN} bg-gradient-to-r from-[#10b981]/15 to-[#34d399]/15 text-[#10b981] ring-1 ring-[#10b981]/25 hover:from-[#10b981]/22 hover:to-[#34d399]/22`,
  },
  error: {
    label: "连接失败",
    icon: "x",
    className: `${BASE_BTN} bg-gradient-to-r from-[#ef4444]/15 to-[#f87171]/15 text-[#ef4444] ring-1 ring-[#ef4444]/25 hover:from-[#ef4444]/22 hover:to-[#f87171]/22`,
  },
} as const;

export function EngineSection({
  config,
  updateConfig,
  onTestConnection,
  testResult,
  modelList,
  modelLoading,
  modelError,
  onRefreshModels,
  onProfileFieldChange,
}: EngineSectionProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resultCfg = TEST_RESULT_CONFIG[testResult];

  const allModels =
    modelList && modelList.length > 0
      ? { source: "live" as const, items: modelList.map((m) => m.id) }
      : { source: "preset" as const, items: MODELS };

  const isCustomModel = config.model && !allModels.items.includes(config.model);

  return (
    <div className="animate-in">
      {/* 页头 */}
      <div className="mb-6">
        <h2 className="options-section-title">翻译引擎</h2>
        <p className="options-section-desc">配置提供翻译服务的 AI 平台与凭证</p>
      </div>

      {/* ══════ 双列：接口凭证 + 推理模型 ══════ */}
      <div className="grid grid-cols-[1.2fr_1fr] gap-5">
        {/* 左：接口凭证 */}
        <div>
          <div className="section-label">接口凭证</div>
          <div className="echo-card">
            <div className="p-5 space-y-4">
              {/* API 地址 */}
              <div>
                <label className="text-[12px] font-medium text-(--text-secondary) mb-1.5 block">
                  API 地址
                </label>
                <input
                  type="text"
                  className="echo-input w-full font-mono text-[12.5px]"
                  value={config.apiUrl}
                  placeholder="https://api.openai.com/v1/chat/completions"
                  onInput={(e) =>
                    updateConfig("apiUrl", (e.target as HTMLInputElement).value)
                  }
                />
                <p className="text-[11px] text-(--text-hint) mt-1">
                  兼容 OpenAI REST 格式
                </p>
              </div>

              {/* API 密钥 */}
              <div>
                <label className="text-[12px] font-medium text-(--text-secondary) mb-1.5 block">
                  API 密钥
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    className={`echo-input w-full font-mono text-[12.5px] pr-9 ${
                      !showApiKey && config.apiKey ? "tracking-widest" : ""
                    }`}
                    value={config.apiKey}
                    placeholder="sk-..."
                    onInput={(e) =>
                      updateConfig(
                        "apiKey",
                        (e.target as HTMLInputElement).value,
                      )
                    }
                  />
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-(--text-tertiary) hover:text-(--text-primary) transition-colors rounded-md hover:bg-(--bg-surface-hover) active:scale-95"
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "隐藏密钥" : "显示密钥"}
                  >
                    {showApiKey ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-(--text-hint) mt-1">
                  仅存储于本地
                </p>
              </div>
            </div>

            {/* 底部操作区 */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-(--border-light)">
              <p className="text-[11px] text-(--text-tertiary) leading-relaxed">
                {testResult === "success" && "✦ 配置有效"}
                {testResult === "error" && "连接失败"}
                {testResult === "idle" && "验证可用性"}
                {testResult === "testing" && "探测中…"}
              </p>
              <button
                className={resultCfg.className}
                onClick={onTestConnection}
                disabled={testResult === "testing"}
              >
                {resultCfg.icon === "spinner" && (
                  <div className="w-3 h-3 border-[1.5px] border-current border-t-transparent rounded-full animate-[spin_0.8s_linear_infinite]" />
                )}
                {resultCfg.icon === "check" && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {resultCfg.icon === "x" && (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                )}
                {resultCfg.label}
              </button>
            </div>
          </div>
        </div>

        {/* 右：推理模型 */}
        <div>
          <div className="section-label">推理模型</div>
          <div className="echo-card overflow-visible!">
            <div className="p-5">
              <label className="text-[12px] font-medium text-(--text-secondary) mb-1.5 block">
                当前模型
              </label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1" ref={dropdownRef}>
                  <button
                    type="button"
                    className={`echo-input w-full font-mono text-[12.5px] flex items-center justify-between text-left transition-all ${
                      isDropdownOpen
                        ? "border-(--border-focus) ring-[3px] ring-(--shadow-focus) bg-(--bg-input-focus)"
                        : ""
                    }`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className="truncate block mr-3 text-(--text-primary)">
                      {config.model || (
                        <span className="text-(--text-hint)">选择模型…</span>
                      )}
                    </span>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-(--text-tertiary) transition-transform duration-200 shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-100 w-full mt-1.5 bg-(--bg-card) backdrop-blur-3xl border border-(--border-light) shadow-premium rounded-[12px] overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-top">
                      <div className="max-h-[240px] overflow-y-auto py-1.5 overscroll-contain">
                        <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-[650] text-(--text-tertiary) tracking-[0.06em] uppercase select-none flex items-center gap-1.5">
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${allModels.source === "live" ? "bg-(--success)" : "bg-(--text-hint)"}`}
                          />
                          {allModels.source === "live"
                            ? "已拉取模型"
                            : "默认预设"}
                        </div>
                        {allModels.items.map((id) => (
                          <button
                            key={id}
                            className="w-full text-left px-3.5 py-[7px] text-[12.5px] font-mono text-(--text-primary) hover:bg-(--accent-soft) hover:text-(--accent-solid) transition-colors flex items-center justify-between outline-none"
                            onClick={() => {
                              onProfileFieldChange("model", id);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="truncate pr-2">{id}</span>
                            {config.model === id && (
                              <span className="text-(--accent-solid) shrink-0">
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            )}
                          </button>
                        ))}

                        {isCustomModel && (
                          <div className="border-t border-(--border-light) mt-1 pt-1">
                            <div className="px-3.5 pt-1.5 pb-1 text-[10px] font-[650] text-(--text-tertiary) tracking-[0.06em] uppercase select-none">
                              当前自定义
                            </div>
                            <button
                              className="w-full text-left px-3.5 py-[7px] text-[12.5px] font-mono bg-(--accent-soft) text-(--accent-solid) transition-colors flex items-center justify-between outline-none"
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              <span className="truncate pr-2 font-medium">
                                {config.model}
                              </span>
                              <span className="shrink-0">
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="echo-btn echo-btn-ghost echo-btn-sm gap-1.5 px-3 shrink-0"
                  onClick={() =>
                    onRefreshModels(true, config.apiUrl, config.apiKey)
                  }
                  disabled={modelLoading || !config.apiUrl || !config.apiKey}
                  title="从接口拉取模型列表"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      modelLoading ? "rotating text-(--accent-solid)" : ""
                    }
                  >
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                  </svg>
                  <span>刷新</span>
                </button>
              </div>

              <p className="text-[11px] text-(--text-hint) mt-2">
                当前配置方案所使用的翻译模型
              </p>

              {modelError && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-(--danger-bg) text-[12px] font-medium text-(--danger)">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{modelError}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
