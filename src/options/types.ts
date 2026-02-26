export interface Config {
  apiUrl: string;
  apiKey: string;
  model: string;
  targetLang: string;
  engine: string;
  domainPreference: string;
  autoDetect: boolean;
  translationDisplay: string;
  fontSize: number;
  showOriginal: boolean;
  hoverTranslate: boolean;
  selectionTranslate: boolean;
  fullPageShortcut: string;
  selectionShortcut: string;
  translationConcurrency: number;
  translationTimeoutMs: number;

  temperature: number;
  systemPrompt: string;
  triggerMode: "none" | "alt" | "ctrl" | "shift";
  domainBlacklist: string[];
  floatingButtonEnabled: boolean;
  floatingButtonOpacity: number;
  floatingButtonSize: number;
  floatingButtonIconStyle: "solid" | "outline";
}

export type TabId =
  | "engine"
  | "translation"
  | "display"
  | "shortcuts"
  | "vocabulary"
  | "advanced"
  | "about";

export type TranslationProfile = {
  id: string;
  name: string;
  targetLang: string;
  model: string;
  domainPreference: string;
  engine: string;
};

export type ModelInfo = {
  id: string;
  name: string;
  supportedLangs: string[];
  maxTokens: number;
  ownedBy?: string;
};

export interface SectionProps {
  config: Config;
  updateConfig: <K extends keyof Config>(key: K, val: Config[K]) => void;
}
