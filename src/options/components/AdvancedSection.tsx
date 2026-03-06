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
    <div className="animate-in space-y-8">
      <div>
        <h2 className="options-section-title">高级设置</h2>
        <p className="options-section-desc">
          微调 AI 核心参数、行为逻辑及全局控制
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Parameters */}
        <div className="flex flex-col gap-6">
          <div className="section-label">AI 模型参数</div>
          <div className="echo-card p-5 h-full">
            <div className="flex items-start gap-4 mb-6">
              <div className="setting-icon text-(--danger) bg-(--danger-bg) p-2 rounded-lg">
                <svg
                  width="20"
                  height="20"
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
              <div className="flex-1">
                <div className="setting-title text-base">Temperature</div>
                <div className="setting-desc text-[13px] leading-relaxed">
                  控制翻译的随机性。较低值使翻译趋向保守、精确，较高值则更具创造力。
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-(--text-tertiary) uppercase tracking-wider">
                  当前数值
                </span>
                <span className="px-2 py-0.5 rounded-full bg-(--accent-soft) text-(--accent-solid) font-mono text-sm font-bold">
                  {config.temperature.toFixed(1)}
                </span>
              </div>
              <div className="relative pt-2 pb-6">
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
                  className="w-full cursor-pointer accent-(--accent-solid)"
                />
                <div className="flex justify-between mt-2 text-[11px] text-(--text-tertiary) font-medium">
                  <span>精确 (0.0)</span>
                  <span>平衡 (0.5)</span>
                  <span>创造 (1.0)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Control */}
        <div className="flex flex-col gap-6">
          <div className="section-label">全局访问控制</div>
          <div className="echo-card p-5 h-full">
            <div className="flex items-start gap-4 mb-4">
              <div className="setting-icon text-(--warning) bg-(--warning-bg) p-2 rounded-lg">
                <svg
                  width="20"
                  height="20"
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
              <div className="flex-1">
                <div className="setting-title text-base">域名黑名单</div>
                <div className="setting-desc text-[13px] leading-relaxed">
                  在特定域名下自动禁用插件的所有交互功能。
                </div>
              </div>
            </div>

            <textarea
              className="echo-input w-full font-mono text-[13px] min-h-[140px] resize-none bg-black/5 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black/20"
              value={(config.domainBlacklist || []).join("\n")}
              onInput={(e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                const domains = val
                  .split("\n")
                  .map((d) => d.trim())
                  .filter((d) => d);
                updateConfig("domainBlacklist", domains);
              }}
              placeholder="example.com\ninternal.company.com"
              spellcheck={false}
            />
            <div className="mt-2 text-[11px] text-(--text-tertiary)">
              每行输入一个域名，支持子域名。
            </div>
          </div>
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-4">
        <div className="section-label">核心系统提示词 (System Prompt)</div>
        <div className="echo-card p-6">
          <div className="flex items-start gap-5 mb-5">
            <div className="setting-icon text-(--accent-solid) bg-(--accent-soft) p-2.5 rounded-xl">
              <svg
                width="22"
                height="22"
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
            <div className="flex-1">
              <div className="setting-title text-lg flex items-center gap-2">
                翻译行为指令
                <span className="echo-badge badge-accent px-1.5 py-0.5 text-[10px]">
                  高级专家模式
                </span>
              </div>
              <div className="setting-desc text-sm mt-1 leading-relaxed">
                这是发送给 AI
                的第一条指令，决定了翻译的基调、术语处理方式和输出格式。
                修改它将直接影响翻译质量。
              </div>
            </div>
          </div>

          <div className="relative group">
            <textarea
              className="echo-input w-full font-sans text-[14px] min-h-[220px] p-5 leading-relaxed bg-black/5 dark:bg-white/5 border-transparent focus:border-(--accent-solid) focus:bg-white dark:focus:bg-[#1a1a1c] transition-all duration-300"
              value={config.systemPrompt}
              onInput={(e) =>
                updateConfig(
                  "systemPrompt",
                  (e.target as HTMLTextAreaElement).value,
                )
              }
              placeholder="请输入系统指令..."
            />
            <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-40 transition-opacity text-[11px] font-mono pointer-events-none uppercase tracking-widest text-(--text-tertiary)">
              markdown supported
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="space-y-4">
        <div className="section-label">数据维护与备份</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={onExport}
            className="echo-card group flex flex-col items-center justify-center p-6 text-center hover:bg-(--bg-surface) transition-all cursor-pointer border-dashed border-2 border-transparent hover:border-(--info)/20"
          >
            <div className="p-4 rounded-2xl bg-(--info-bg) text-(--info) mb-4 group-hover:scale-110 transition-transform">
              <IconExport />
            </div>
            <div className="font-semibold text-[15px] mb-1">导出配置</div>
            <div className="text-[12px] text-(--text-description) px-2">
              全量设置备份为 JSON 文件
            </div>
          </button>

          <button
            onClick={onImport}
            className="echo-card group flex flex-col items-center justify-center p-6 text-center hover:bg-(--bg-surface) transition-all cursor-pointer border-dashed border-2 border-transparent hover:border-(--success)/20"
          >
            <div className="p-4 rounded-2xl bg-(--success-bg) text-(--success) mb-4 group-hover:scale-110 transition-transform">
              <IconImport />
            </div>
            <div className="font-semibold text-[15px] mb-1">导入配置</div>
            <div className="text-[12px] text-(--text-description) px-2">
              从备份文件恢复环境
            </div>
          </button>

          <button
            onClick={onReset}
            className="echo-card group flex flex-col items-center justify-center p-6 text-center hover:bg-(--danger-bg)/40 transition-all cursor-pointer border-dashed border-2 border-transparent hover:border-(--danger)/20"
          >
            <div className="p-4 rounded-2xl bg-(--danger-bg) text-(--danger) mb-4 group-hover:scale-110 transition-transform">
              <IconReset />
            </div>
            <div className="font-semibold text-[15px] mb-1 text-(--danger)">
              重置默认
            </div>
            <div className="text-[12px] text-(--text-description) px-2">
              清空所有自定义修改
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
