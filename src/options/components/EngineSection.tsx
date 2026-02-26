import { Config, ModelInfo } from "../types";
import { MODELS, ENGINE_OPTIONS } from "../constants";

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
    field: "targetLang" | "model" | "domainPreference" | "engine",
    val: string,
  ) => void;
};

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
  return (
    <div className="animate-in">
      <h2 className="options-section-title">翻译引擎</h2>
      <p className="options-section-desc">配置提供翻译服务的 AI 平台和凭证</p>

      <div className="echo-card">
        {/* Engine Provider */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-solid)",
            }}
          >
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
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">服务提供商</div>
            <div className="setting-desc">选择默认翻译服务或自定义兼容接口</div>
          </div>
          <select
            className="echo-select"
            value={config.engine}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              onProfileFieldChange("engine", val);
            }}
          >
            {ENGINE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* API URL */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--info-bg)", color: "var(--info)" }}
          >
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
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="setting-content" style={{ flex: 1 }}>
            <div className="setting-title">API 地址</div>
            <div className="setting-desc">
              如: https://api.openai.com/v1/chat/completions
            </div>
            <input
              type="text"
              className="echo-input"
              value={config.apiUrl}
              placeholder="输入完整 API 路径"
              onInput={(e) =>
                updateConfig("apiUrl", (e.target as HTMLInputElement).value)
              }
              style={{
                marginTop: "10px",
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* API Key */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning)",
            }}
          >
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="setting-content" style={{ flex: 1 }}>
            <div className="setting-title">API 密钥</div>
            <div className="setting-desc">安全保存在本地，不会向外泄露</div>
            <input
              type="password"
              className="echo-input"
              value={config.apiKey}
              placeholder="sk-..."
              onInput={(e) =>
                updateConfig("apiKey", (e.target as HTMLInputElement).value)
              }
              style={{
                marginTop: "10px",
                width: "100%",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Model */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
          >
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
              <path d="M2 16L12 22L22 16" />
              <path d="M2 12L12 18L22 12" />
              <path d="M2 8L12 14L22 8L12 2L2 8Z" />
            </svg>
          </div>
          <div className="setting-content" style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div className="setting-title">模型选择</div>
                <div className="setting-desc">
                  当前配置方案使用的核心翻译模型
                </div>
              </div>
              <button
                className="echo-btn echo-btn-ghost echo-btn-sm"
                onClick={() =>
                  onRefreshModels(true, config.apiUrl, config.apiKey)
                }
                disabled={modelLoading || !config.apiUrl || !config.apiKey}
                title="刷新模型列表"
                style={{ padding: "6px" }}
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
                  className={modelLoading ? "rotating" : ""}
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" />
                </svg>
              </button>
            </div>

            <div style={{ position: "relative", marginTop: "10px" }}>
              <select
                className="echo-select"
                value={config.model}
                onChange={(e) => {
                  const val = (e.target as HTMLSelectElement).value;
                  onProfileFieldChange("model", val);
                }}
                style={{
                  width: "100%",
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  paddingRight: "30px",
                }}
              >
                {modelList && modelList.length > 0
                  ? modelList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))
                  : MODELS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                {!modelList?.find((m) => m.id === config.model) &&
                  !MODELS.includes(config.model) && (
                    <option value={config.model}>
                      {config.model} (当前值)
                    </option>
                  )}
              </select>
            </div>

            {modelError && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "var(--danger)",
                }}
              >
                获取模型列表失败: {modelError} (使用默认列表)
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ padding: "16px 20px", display: "flex", gap: "12px" }}>
          <button
            className={`echo-btn ${
              testResult === "testing"
                ? "testing"
                : testResult === "success"
                  ? "success"
                  : testResult === "error"
                    ? "error"
                    : "echo-btn-primary"
            }`}
            onClick={onTestConnection}
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
            disabled={testResult === "testing"}
          >
            {testResult === "testing" ? (
              <span
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <div
                  className="loading-spinner"
                  style={{ width: "14px", height: "14px", borderWidth: "2px" }}
                />{" "}
                检测中...
              </span>
            ) : testResult === "success" ? (
              <span
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                连接成功
              </span>
            ) : testResult === "error" ? (
              <span
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                连接失败
              </span>
            ) : (
              "测试连接"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
