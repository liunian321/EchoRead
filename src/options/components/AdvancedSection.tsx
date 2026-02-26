import { SectionProps } from "../types";
import { IconExport, IconImport, IconReset } from "./Icons";

type AdvancedSectionProps = SectionProps & {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
};

export function AdvancedSection({
  config,
  updateConfig,
  onExport,
  onImport,
  onReset,
}: AdvancedSectionProps) {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">高级设置</h2>
      <p className="options-section-desc">微调 AI 翻译参数和系统提示词</p>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* Temperature */}
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
              <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">Temperature</div>
            <div className="setting-desc">
              控制翻译的创造性 (0=精确, 1=创造性) 当前: {config.temperature}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperature}
              onInput={(e) =>
                updateConfig(
                  "temperature",
                  Number((e.target as HTMLInputElement).value),
                )
              }
              style={{ width: "120px", accentColor: "var(--accent-solid)" }}
            />
            <span className="setting-value">{config.temperature}</span>
          </div>
        </div>

        {/* System Prompt */}
        <div
          className="setting-row"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "10px",
            }}
          >
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
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="setting-content">
              <div className="setting-title">系统提示词</div>
              <div className="setting-desc">定义 AI 翻译的行为规则</div>
            </div>
          </div>
          <textarea
            className="echo-input"
            value={config.systemPrompt}
            onInput={(e) =>
              updateConfig(
                "systemPrompt",
                (e.target as HTMLTextAreaElement).value,
              )
            }
            rows={4}
            style={{ fontFamily: "var(--font-family)", resize: "vertical" }}
          />
        </div>

        {/* Domain Blacklist */}
        <div
          className="setting-row"
          style={{
            flexDirection: "column",
            alignItems: "stretch",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "10px",
            }}
          >
            <div
              className="setting-icon"
              style={{
                background: "var(--danger-bg)",
                color: "var(--danger)",
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
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div className="setting-content">
              <div className="setting-title">域名黑名单</div>
              <div className="setting-desc">
                在这些网站上禁用划词与悬停翻译（每行一个域名）
              </div>
            </div>
          </div>
          <textarea
            className="echo-input"
            value={(config.domainBlacklist || []).join("\n")}
            onInput={(e) => {
              const val = (e.target as HTMLTextAreaElement).value;
              const domains = val
                .split("\n")
                .map((d) => d.trim())
                .filter((d) => d);
              updateConfig("domainBlacklist", domains);
            }}
            placeholder="例如: github.com\ngoogle.com"
            rows={4}
            style={{ fontFamily: "var(--font-family)", resize: "vertical" }}
          />
        </div>
      </div>

      {/* Data management */}
      <div className="section-label">数据管理</div>
      <div className="echo-card">
        <div className="setting-row clickable" onClick={onExport}>
          <div
            className="setting-icon"
            style={{ background: "var(--info-bg)", color: "var(--info)" }}
          >
            <IconExport />
          </div>
          <div className="setting-content">
            <div className="setting-title">导出配置</div>
            <div className="setting-desc">将当前所有设置导出为 JSON 文件</div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="setting-row clickable" onClick={onImport}>
          <div
            className="setting-icon"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
          >
            <IconImport />
          </div>
          <div className="setting-content">
            <div className="setting-title">导入配置</div>
            <div className="setting-desc">从 JSON 文件恢复设置</div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="setting-row clickable" onClick={onReset}>
          <div
            className="setting-icon"
            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
          >
            <IconReset />
          </div>
          <div className="setting-content">
            <div className="setting-title">恢复默认</div>
            <div className="setting-desc">将所有设置重置为出厂默认值</div>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
