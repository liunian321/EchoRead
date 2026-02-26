import { SectionProps } from "../types";
import { IconDisplay } from "./Icons";
import { Toggle } from "./Toggle";

export function DisplaySection({ config, updateConfig }: SectionProps) {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">显示设置</h2>
      <p className="options-section-desc">调整翻译结果的显示方式和样式</p>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* Translation Display Mode */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-solid)",
            }}
          >
            <IconDisplay />
          </div>
          <div className="setting-content">
            <div className="setting-title">显示模式</div>
            <div className="setting-desc">翻译结果在页面中的展现方式</div>
          </div>
          <select
            className="echo-select"
            value={config.translationDisplay}
            onChange={(e) =>
              updateConfig(
                "translationDisplay",
                (e.target as HTMLSelectElement).value,
              )
            }
          >
            <option value="inline">行内显示</option>
            <option value="tooltip">悬浮提示</option>
            <option value="sidebar">侧边栏</option>
            <option value="replace">替换原文</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--warning-bg)", color: "var(--warning)" }}
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
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">翻译字体大小</div>
            <div className="setting-desc">
              翻译文字的显示大小 ({config.fontSize}px)
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min="10"
              max="24"
              value={config.fontSize}
              onInput={(e) =>
                updateConfig(
                  "fontSize",
                  Number((e.target as HTMLInputElement).value),
                )
              }
              style={{ width: "120px", accentColor: "var(--accent-solid)" }}
            />
            <span className="setting-value">{config.fontSize}px</span>
          </div>
        </div>
      </div>

      {/* Show Original */}
      <div className="section-label">原文显示</div>
      <div className="echo-card" style={{ marginBottom: "24px" }}>
        <div
          className="setting-row clickable"
          onClick={() => updateConfig("showOriginal", !config.showOriginal)}
        >
          <div
            className="setting-icon"
            style={{
              background: "var(--bg-surface)",
              color: "var(--text-secondary)",
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
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">保留原文</div>
            <div className="setting-desc">翻译时同时显示原始文本</div>
          </div>
          <Toggle
            value={config.showOriginal}
            onChange={(v) => updateConfig("showOriginal", v)}
          />
        </div>
      </div>

      {/* Preview */}
      <div className="section-label">效果预览</div>
      <div className="echo-card">
        <div style={{ padding: "20px" }}>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-primary)",
              lineHeight: "1.8",
              marginBottom: "8px",
            }}
          >
            The quick brown fox jumps over the lazy dog.
          </p>
          <p
            style={{
              fontSize: `${config.fontSize}px`,
              color: "var(--accent-solid)",
              lineHeight: "1.6",
              fontStyle: "italic",
              opacity: 0.85,
            }}
          >
            敏捷的棕色狐狸跳过了懒惰的狗。
          </p>
        </div>
      </div>
    </div>
  );
}
