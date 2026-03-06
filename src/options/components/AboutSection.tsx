import { IconShield } from "./Icons";

export function AboutSection() {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">关于 EchoRead</h2>
      <p className="options-section-desc">高性能 AI 翻译与阅读辅助浏览器插件</p>

      <div className="echo-card mb-6">
        <div className="setting-row">
          <div className="w-9 h-9 rounded-[8px] bg-(--accent-solid) flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">EchoRead Translator</div>
            <div className="setting-desc">版本 1.0.0</div>
          </div>
          <span className="echo-badge badge-accent">Pro</span>
        </div>

        <div className="setting-row">
          <div className="setting-icon text-(--success)">
            <IconShield />
          </div>
          <div className="setting-content">
            <div className="setting-title">隐私安全</div>
            <div className="setting-desc">
              所有 API 密钥和配置数据仅保存在本地浏览器中
            </div>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-icon text-(--info)">
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
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">技术栈</div>
            <div className="setting-desc">
              Preact + Vite + Rust/WASM + Chrome Extension MV3
            </div>
          </div>
        </div>
      </div>

      <div className="section-label">核心特性</div>
      <div className="echo-card">
        {[
          {
            icon: "🚀",
            title: "流式翻译",
            desc: "基于 SSE 的实时流式翻译，边翻边显",
          },
          { icon: "🔠", title: "划词翻译", desc: "选中任意文本，一键翻译" },
          {
            icon: "📄",
            title: "全页翻译",
            desc: "一键翻译整个网页内容 (Alt+T)",
          },
          {
            icon: "🧠",
            title: "WASM 加速",
            desc: "Rust 编译的 WASM 核心，高性能文本分段",
          },
          {
            icon: "🔌",
            title: "多模型支持",
            desc: "兼容 OpenAI、Claude、DeepSeek 等全部 API",
          },
          { icon: "🌐", title: "多语言", desc: "支持 11+ 种语言的互译" },
        ].map((feat, i) => (
          <div className="setting-row" key={i}>
            <div className="text-[20px] w-[36px] text-center">{feat.icon}</div>
            <div className="setting-content">
              <div className="setting-title">{feat.title}</div>
              <div className="setting-desc">{feat.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
