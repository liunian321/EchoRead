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
    field: "targetLang" | "model" | "domainPreference" | "engine",
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

  return (
    <div className="animate-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2 className="options-section-title" style={{ marginBottom: "4px" }}>
            翻译设置
          </h2>
          <p className="options-section-desc">定制不同场景下的翻译行为</p>
        </div>

        {/* Profile Selector */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            className="echo-select"
            value={activeProfileId}
            onChange={(e) =>
              onProfileSelect((e.target as HTMLSelectElement).value)
            }
            style={{ minWidth: "150px" }}
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={onAddProfile}
            title="新建配置"
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
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* Profile Name */}
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div className="setting-content" style={{ flex: 1 }}>
            <div className="setting-title">配置名称</div>
            <input
              type="text"
              className="echo-input"
              value={activeProfile?.name || ""}
              onInput={(e) =>
                onProfileNameChange((e.target as HTMLInputElement).value)
              }
              style={{
                marginTop: "10px",
                width: "100%",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Profile Actions */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
          }}
        >
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={onDuplicateProfile}
            title="复制并新建"
          >
            复制此配置
          </button>
          <button
            className="echo-btn echo-btn-danger echo-btn-sm"
            onClick={onDeleteProfile}
            disabled={profiles.length <= 1}
            title={profiles.length <= 1 ? "至少保留一个配置" : "删除此配置"}
          >
            删除
          </button>
        </div>
      </div>

      <div className="section-label">翻译偏好设置</div>
      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* Target Language */}
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
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">目标语言</div>
            <div className="setting-desc">翻译后的目标语言</div>
          </div>
          <select
            className="echo-select"
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

        {/* Domain Preference */}
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
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">预设领域词库</div>
            <div className="setting-desc">增加特定领域专业词汇准确度</div>
          </div>
          <select
            className="echo-select"
            value={config.domainPreference}
            onChange={(e) =>
              onProfileFieldChange(
                "domainPreference",
                (e.target as HTMLSelectElement).value,
              )
            }
          >
            <option value="">通用领域 (默认)</option>
            <option value="it">IT & 编程</option>
            <option value="medical">医学与健康</option>
            <option value="finance">金融与经济</option>
            <option value="academic">学术论文</option>
          </select>
        </div>
      </div>

      <div className="section-label">交互与触发</div>
      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* Selection Translate */}
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">启用划词翻译</div>
            <div className="setting-desc">选中文本时显示翻译图标</div>
          </div>
          <Toggle
            value={config.selectionTranslate}
            onChange={(v) => updateConfig("selectionTranslate", v)}
          />
        </div>

        {/* Trigger Mode */}
        {config.selectionTranslate && (
          <div
            className="setting-row"
            style={{ background: "rgba(0,0,0,0.1)" }}
          >
            <div className="setting-icon" style={{ opacity: 0 }}></div>
            <div className="setting-content">
              <div className="setting-title">触发按键</div>
              <div className="setting-desc">划词后需按住此键才显示翻译图标</div>
            </div>
            <select
              className="echo-select"
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
              <option value="alt">长按 Alt / Option</option>
              <option value="ctrl">长按 Ctrl / Command</option>
              <option value="shift">长按 Shift</option>
            </select>
          </div>
        )}

        {/* Hover Translate */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
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
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">悬停翻译 (实验性)</div>
            <div className="setting-desc">鼠标悬停在段落上自动触发翻译</div>
          </div>
          <Toggle
            value={config.hoverTranslate}
            onChange={(v) => updateConfig("hoverTranslate", v)}
          />
        </div>
      </div>

      <div className="section-label">全页翻译性能调整</div>
      <div className="echo-card" style={{ marginBottom: "24px" }}>
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
              <path d="M4 6h16" />
              <path d="M4 12h16" />
              <path d="M4 18h16" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">并发请求数</div>
            <div className="setting-desc">同时翻译的段落数量 (1-10)</div>
          </div>
          <input
            type="number"
            className="echo-input"
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
            style={{ width: "100px", textAlign: "center", fontSize: "13px" }}
          />
        </div>

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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">翻译超时</div>
            <div className="setting-desc">单段落超时阈值 (毫秒)</div>
          </div>
          <input
            type="number"
            className="echo-input"
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
            style={{ width: "120px", textAlign: "center", fontSize: "13px" }}
          />
        </div>
      </div>

      <div className="section-label">悬浮按钮</div>
      <div className="echo-card">
        <div
          className="setting-row clickable"
          onClick={() =>
            updateConfig("floatingButtonEnabled", !config.floatingButtonEnabled)
          }
        >
          <div
            className="setting-icon"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
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
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">启用悬浮按钮</div>
            <div className="setting-desc">显示可拖拽的全页翻译入口</div>
          </div>
          <Toggle
            value={config.floatingButtonEnabled}
            onChange={(v) => updateConfig("floatingButtonEnabled", v)}
          />
        </div>

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
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v18" />
              <path d="M3 12h18" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">透明度</div>
            <div className="setting-desc">
              悬浮按钮透明度 ({Math.round(config.floatingButtonOpacity * 100)}%)
            </div>
          </div>
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
            style={{ width: "140px", accentColor: "var(--accent-solid)" }}
          />
        </div>

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
              <rect x="4" y="4" width="16" height="16" rx="4" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">按钮尺寸</div>
            <div className="setting-desc">{config.floatingButtonSize}px</div>
          </div>
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
            style={{ width: "140px", accentColor: "var(--accent-solid)" }}
          />
        </div>

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
              <circle cx="12" cy="12" r="9" />
              <path d="M8 12h8" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">图标样式</div>
            <div className="setting-desc">选择悬浮按钮图标风格</div>
          </div>
          <select
            className="echo-select"
            value={config.floatingButtonIconStyle}
            onChange={(e) =>
              updateConfig(
                "floatingButtonIconStyle",
                (e.target as HTMLSelectElement).value as "solid" | "outline",
              )
            }
          >
            <option value="outline">线框</option>
            <option value="solid">填充</option>
          </select>
        </div>
      </div>
    </div>
  );
}
