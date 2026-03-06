import { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
  apiUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-3.5-turbo",
  targetLang: "zh-CN",
  domainPreference: "",
  autoDetect: true,
  translationDisplay: "inline",
  fontSize: 14,
  showOriginal: true,
  hoverTranslate: false,
  selectionTranslate: true,
  fullPageShortcut: "Alt+T",
  selectionShortcut: "Alt+S",
  translationConcurrency: 3,
  translationTimeoutMs: 30000,
  lazyFullPageTranslate: true,

  temperature: 0.3,
  systemPrompt:
    "你是一个专业的翻译引擎，请将用户发送的文本翻译为中文。如果用户发送的是中文，请翻译为英文。只返回翻译结果，不要任何额外解释。",
  triggerMode: "none",
  domainBlacklist: [],
  floatingButtonEnabled: true,
  floatingButtonOpacity: 0.9,
  floatingButtonSize: 44,
  floatingButtonIconStyle: "outline",
  translationCacheEnabled: false,
  translationCacheMaxEntries: 2000,
  translationCacheMaxBytes: 20 * 1024 * 1024,
  translationCacheTtlMs: 7 * 24 * 60 * 60 * 1000,
};

export const LANGUAGES = [
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "ru", label: "Русский" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
];

export const MODELS = [
  "gpt-3.5-turbo",
  "gpt-4",
  "gpt-4-turbo",
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-haiku",
  "claude-3-sonnet",
  "claude-3-opus",
  "deepseek-chat",
  "deepseek-reasoner",
];
