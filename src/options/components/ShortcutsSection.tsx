import { SectionProps } from "../types";
import { IconKeyboard } from "./Icons";

export function ShortcutsSection({ config, updateConfig }: SectionProps) {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">快捷键</h2>
      <p className="options-section-desc">自定义键盘快捷键以快速触发翻译功能</p>

      <div className="echo-card mb-6">
        <div className="setting-row">
          <div className="setting-icon text-(--accent-solid)">
            <IconKeyboard />
          </div>
          <div className="setting-content">
            <div className="setting-title">全页翻译</div>
            <div className="setting-desc">翻译当前页面的全部文本内容</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="echo-input w-[100px] text-center font-mono text-xs"
              value={config.fullPageShortcut}
              onInput={(e) =>
                updateConfig(
                  "fullPageShortcut",
                  (e.target as HTMLInputElement).value,
                )
              }
            />
          </div>
        </div>

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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">划词翻译</div>
            <div className="setting-desc">翻译当前选中的文本</div>
          </div>
          <input
            type="text"
            className="echo-input w-[100px] text-center font-mono text-xs"
            value={config.selectionShortcut}
            onInput={(e) =>
              updateConfig(
                "selectionShortcut",
                (e.target as HTMLInputElement).value,
              )
            }
          />
        </div>
      </div>

      <div className="p-4 px-5 bg-(--accent-bg) rounded-sm flex items-center gap-3 text-[13px] text-(--accent-solid)">
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
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          快捷键格式示例：<span className="kbd">Alt+T</span>、
          <span className="kbd">Ctrl+Shift+X</span>
        </span>
      </div>
    </div>
  );
}
