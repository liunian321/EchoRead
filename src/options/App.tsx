import { useState, useEffect, useCallback } from "preact/hooks";

/* ===== Type Definitions ===== */
interface Config {
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

const DEFAULT_CONFIG: Config = {
  apiUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-3.5-turbo",
  targetLang: "zh-CN",
  engine: "openai",
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

  temperature: 0.3,
  systemPrompt:
    "你是一个专业的翻译引擎，请将用户发送的文本翻译为中文。如果用户发送的是中文，请翻译为英文。只返回翻译结果，不要任何额外解释。",
  triggerMode: "none",
  domainBlacklist: [],
  floatingButtonEnabled: true,
  floatingButtonOpacity: 0.9,
  floatingButtonSize: 44,
  floatingButtonIconStyle: "outline",
};

type TabId =
  | "engine"
  | "translation"
  | "display"
  | "shortcuts"
  | "vocabulary"
  | "advanced"
  | "about";

/* ===== SVG Icons ===== */
function IconEngine() {
  return (
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
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconTranslate() {
  return (
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
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconDisplay() {
  return (
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
  );
}

function IconKeyboard() {
  return (
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
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </svg>
  );
}

function IconAdvanced() {
  return (
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
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconInfo() {
  return (
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
  );
}

function IconVocabulary() {
  return (
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function IconExport() {
  return (
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconImport() {
  return (
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconReset() {
  return (
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
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ===== Tab Config ===== */
const TABS: { id: TabId; label: string; icon: () => preact.JSX.Element }[] = [
  { id: "engine", label: "翻译引擎", icon: IconEngine },
  { id: "translation", label: "翻译设置", icon: IconTranslate },
  { id: "display", label: "显示设置", icon: IconDisplay },
  { id: "shortcuts", label: "快捷键", icon: IconKeyboard },
  { id: "vocabulary", label: "生词本", icon: IconVocabulary },
  { id: "advanced", label: "高级设置", icon: IconAdvanced },
  { id: "about", label: "关于", icon: IconInfo },
];

const LANGUAGES = [
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

const MODELS = [
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

type TranslationProfile = {
  id: string;
  name: string;
  targetLang: string;
  model: string;
  domainPreference: string;
  engine: string;
};

type ModelInfo = {
  id: string;
  name: string;
  supportedLangs: string[];
  maxTokens: number;
  ownedBy?: string;
};

const ENGINE_OPTIONS = [
  { value: "openai", label: "OpenAI 兼容" },
  { value: "anthropic", label: "Anthropic" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "custom", label: "自定义" },
];

/* ===== Toggle Component ===== */
function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`toggle ${value ? "on" : "off"}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <div className="toggle-knob" />
    </button>
  );
}

function createProfileId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ===== Main Options App ===== */
export default function OptionsApp() {
  const [activeTab, setActiveTab] = useState<TabId>("engine");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [profiles, setProfiles] = useState<TranslationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [modelList, setModelList] = useState<ModelInfo[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const fetchModels = useCallback(
    (forceRefresh = false, currentApiUrl?: string, currentApiKey?: string) => {
      setModelLoading(true);
      setModelError(null);
      chrome.runtime.sendMessage(
        {
          type: "FETCH_MODEL_LIST",
          forceRefresh,
          apiUrl: currentApiUrl,
          apiKey: currentApiKey,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setModelError(chrome.runtime.lastError.message || "Unknown error");
            setModelLoading(false);
            return;
          }
          if (!response?.success) {
            setModelError(response?.error || "模型列表获取失败");
            setModelLoading(false);
            return;
          }
          setModelList(response.data as ModelInfo[]);
          setModelLoading(false);
        },
      );
    },
    [],
  );

  useEffect(() => {
    chrome.storage.sync.get(null, (data: any) => {
      setConfig((prev) => ({ ...prev, ...data }));
      const storedProfiles = (data.translationProfiles ||
        []) as TranslationProfile[];
      const nextProfiles =
        storedProfiles.length > 0
          ? storedProfiles
          : [
              {
                id: createProfileId(),
                name: "默认配置",
                targetLang: data.targetLang || DEFAULT_CONFIG.targetLang,
                model: data.model || DEFAULT_CONFIG.model,
                domainPreference: data.domainPreference || "",
                engine: data.engine || "openai",
              },
            ];
      const nextActiveId =
        (data.activeProfileId as string | undefined) || nextProfiles[0].id;
      const nextActiveProfile =
        nextProfiles.find((profile) => profile.id === nextActiveId) ||
        nextProfiles[0];
      setProfiles(nextProfiles);
      setActiveProfileId(nextActiveId);
      setConfig((prev) => ({
        ...prev,
        targetLang: nextActiveProfile.targetLang,
        model: nextActiveProfile.model,
        domainPreference: nextActiveProfile.domainPreference,
        engine: nextActiveProfile.engine,
      }));
      if (storedProfiles.length === 0) {
        chrome.storage.sync.set({
          translationProfiles: nextProfiles,
          activeProfileId: nextActiveId,
        });
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    fetchModels(false);
  }, [fetchModels]);

  const updateConfig = useCallback(
    <K extends keyof Config>(key: K, value: Config[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      setSaving(true);
      chrome.storage.sync.set(
        { ...config, translationProfiles: profiles, activeProfileId },
        () => {
          setTimeout(() => {
            setSaving(false);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }, 300);
        },
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [config, profiles, activeProfileId, isLoaded]);

  const updateProfiles = useCallback(
    (nextProfiles: TranslationProfile[], nextActiveId: string) => {
      setProfiles(nextProfiles);
      setActiveProfileId(nextActiveId);
      chrome.storage.sync.set({
        translationProfiles: nextProfiles,
        activeProfileId: nextActiveId,
      });
    },
    [],
  );

  const updateProfileField = useCallback(
    (
      field: "targetLang" | "model" | "domainPreference" | "engine",
      value: string,
    ) => {
      updateConfig(field as keyof Config, value as Config[keyof Config]);
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === activeProfileId
            ? { ...profile, [field]: value }
            : profile,
        ),
      );
    },
    [activeProfileId, updateConfig],
  );

  const handleProfileSelect = useCallback(
    (nextId: string) => {
      const nextProfile = profiles.find((p) => p.id === nextId);
      if (!nextProfile) return;
      setActiveProfileId(nextId);
      updateConfig("targetLang", nextProfile.targetLang);
      updateConfig("model", nextProfile.model);
      updateConfig("domainPreference", nextProfile.domainPreference);
      updateConfig("engine", nextProfile.engine);
      chrome.storage.sync.set({ activeProfileId: nextId });
    },
    [profiles, updateConfig],
  );

  const handleProfileNameChange = useCallback(
    (name: string) => {
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === activeProfileId ? { ...profile, name } : profile,
        ),
      );
    },
    [activeProfileId],
  );

  const handleAddProfile = useCallback(() => {
    const newProfile: TranslationProfile = {
      id: createProfileId(),
      name: "新配置",
      targetLang: config.targetLang,
      model: config.model,
      domainPreference: config.domainPreference,
      engine: config.engine,
    };
    const nextProfiles = [...profiles, newProfile];
    updateProfiles(nextProfiles, newProfile.id);
  }, [config, profiles, updateProfiles]);

  const handleDuplicateProfile = useCallback(() => {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    if (!activeProfile) return;
    const duplicated: TranslationProfile = {
      ...activeProfile,
      id: createProfileId(),
      name: `${activeProfile.name} 副本`,
    };
    const nextProfiles = [...profiles, duplicated];
    updateProfiles(nextProfiles, duplicated.id);
  }, [activeProfileId, profiles, updateProfiles]);

  const handleDeleteProfile = useCallback(() => {
    if (profiles.length <= 1) return;
    const nextProfiles = profiles.filter((p) => p.id !== activeProfileId);
    const nextActiveId = nextProfiles[0].id;
    updateProfiles(nextProfiles, nextActiveId);
    const nextActiveProfile = nextProfiles[0];
    updateConfig("targetLang", nextActiveProfile.targetLang);
    updateConfig("model", nextActiveProfile.model);
    updateConfig("domainPreference", nextActiveProfile.domainPreference);
    updateConfig("engine", nextActiveProfile.engine);
  }, [activeProfileId, profiles, updateConfig, updateProfiles]);

  const handleTestConnection = useCallback(() => {
    setTestResult("testing");
    chrome.runtime.sendMessage(
      {
        type: "TEST_CONNECTION",
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        model: config.model,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          setTestResult("error");
        } else {
          setTestResult(response?.success ? "success" : "error");
        }
        setTimeout(() => setTestResult("idle"), 3000);
      },
    );
  }, [config.apiUrl, config.apiKey, config.model]);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "echoread-config.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [config]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          setConfig((prev) => ({ ...prev, ...imported }));
        } catch {
          alert("配置文件格式错误");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleReset = useCallback(() => {
    if (confirm("确定要恢复所有设置为默认值吗？")) {
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  /* ===== Render Section Content ===== */
  const renderContent = () => {
    switch (activeTab) {
      case "engine":
        return (
          <EngineSection
            config={config}
            updateConfig={updateConfig}
            onTestConnection={handleTestConnection}
            testResult={testResult}
            modelList={modelList}
            modelLoading={modelLoading}
            modelError={modelError}
            onRefreshModels={fetchModels}
            onProfileFieldChange={updateProfileField}
          />
        );
      case "translation":
        return (
          <TranslationSection
            config={config}
            updateConfig={updateConfig}
            profiles={profiles}
            activeProfileId={activeProfileId}
            onProfileSelect={handleProfileSelect}
            onProfileNameChange={handleProfileNameChange}
            onAddProfile={handleAddProfile}
            onDuplicateProfile={handleDuplicateProfile}
            onDeleteProfile={handleDeleteProfile}
            onProfileFieldChange={updateProfileField}
          />
        );
      case "display":
        return <DisplaySection config={config} updateConfig={updateConfig} />;
      case "shortcuts":
        return <ShortcutsSection config={config} updateConfig={updateConfig} />;
      case "vocabulary":
        return <VocabularySection />;
      case "advanced":
        return (
          <AdvancedSection
            config={config}
            updateConfig={updateConfig}
            onExport={handleExport}
            onImport={handleImport}
            onReset={handleReset}
          />
        );
      case "about":
        return <AboutSection />;
    }
  };

  return (
    <div className="options-layout">
      {/* Sidebar */}
      <nav className="options-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
          <div>
            <div className="sidebar-brand-name gradient-text">EchoRead</div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-tertiary)",
                fontWeight: "500",
              }}
            >
              设置
            </div>
          </div>
        </div>

        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-item ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="sidebar-item-icon">
              <tab.icon />
            </span>
            {tab.label}
          </button>
        ))}

        <div className="sidebar-divider" />

        {/* Save Indicator */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "10px",
            fontSize: "13px",
            color: saved ? "var(--success)" : "var(--text-tertiary)",
            transition: "all 0.3s ease",
            pointerEvents: "none",
          }}
        >
          {saving ? (
            <>
              <div
                className="loading-spinner"
                style={{
                  width: "14px",
                  height: "14px",
                  borderWidth: "2px",
                  borderTopColor: "currentColor",
                }}
              />{" "}
              正在保存...
            </>
          ) : saved ? (
            <>
              <IconCheck /> 已自动保存
            </>
          ) : (
            "设置已实时同步"
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="options-main">{renderContent()}</main>
    </div>
  );
}

/* ================================================================
   Section Components
   ================================================================ */

interface SectionProps {
  config: Config;
  updateConfig: <K extends keyof Config>(key: K, val: Config[K]) => void;
}

/* ===== Engine Section ===== */
function EngineSection({
  config,
  updateConfig,
  onTestConnection,
  testResult,
  modelList,
  modelLoading,
  modelError,
  onRefreshModels,
  onProfileFieldChange,
}: SectionProps & {
  onTestConnection: () => void;
  testResult: "idle" | "testing" | "success" | "error";
  modelList: ModelInfo[];
  modelLoading: boolean;
  modelError: string | null;
  onRefreshModels: (
    forceRefresh?: boolean,
    currentApiUrl?: string,
    currentApiKey?: string,
  ) => void;
  onProfileFieldChange: (field: "model" | "engine", value: string) => void;
}) {
  const models = modelList.length > 0 ? modelList.map((m) => m.id) : MODELS;
  return (
    <div className="animate-in">
      <h2 className="options-section-title">翻译引擎</h2>
      <p className="options-section-desc">配置 AI 翻译服务的 API 连接参数</p>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        {/* API URL */}
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
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">接口地址</div>
            <div className="setting-desc">OpenAI 兼容的 API Endpoint</div>
            <input
              type="text"
              className="echo-input"
              value={config.apiUrl}
              onInput={(e) =>
                updateConfig("apiUrl", (e.target as HTMLInputElement).value)
              }
              placeholder="https://api.openai.com/v1/chat/completions"
              style={{ marginTop: "8px" }}
            />
          </div>
        </div>

        {/* API Key */}
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
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">API 密钥</div>
            <div className="setting-desc">
              密钥仅保存在本地，不会上传到任何服务器
            </div>
            <input
              type="password"
              className="echo-input"
              value={config.apiKey}
              onInput={(e) =>
                updateConfig("apiKey", (e.target as HTMLInputElement).value)
              }
              placeholder="sk-••••••••••••••••"
              style={{ marginTop: "8px" }}
            />
          </div>
        </div>

        {/* Engine */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--info-bg)", color: "var(--info)" }}
          >
            <IconEngine />
          </div>
          <div className="setting-content">
            <div className="setting-title">引擎类型</div>
            <div className="setting-desc">选择默认翻译引擎类型</div>
          </div>
          <select
            className="echo-select"
            value={config.engine}
            onChange={(e) =>
              onProfileFieldChange(
                "engine",
                (e.target as HTMLSelectElement).value,
              )
            }
          >
            {ENGINE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{ background: "var(--info-bg)", color: "var(--info)" }}
          >
            <IconEngine />
          </div>
          <div className="setting-content">
            <div className="setting-title">模型</div>
            <div className="setting-desc">选择翻译使用的 AI 模型</div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                className="echo-select"
                value={config.model}
                onChange={(e) =>
                  onProfileFieldChange(
                    "model",
                    (e.target as HTMLSelectElement).value,
                  )
                }
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="echo-btn echo-btn-ghost echo-btn-sm"
                onClick={() =>
                  onRefreshModels(true, config.apiUrl, config.apiKey)
                }
                disabled={modelLoading}
              >
                {modelLoading ? "刷新中..." : "刷新模型"}
              </button>
              {modelError && (
                <span style={{ color: "var(--danger)", fontSize: "12px" }}>
                  {modelError}
                </span>
              )}
              {modelList.length > 0 && (
                <span
                  style={{ color: "var(--text-tertiary)", fontSize: "12px" }}
                >
                  {modelList.length} 个模型
                </span>
              )}
              <span style={{ color: "var(--text-tertiary)", fontSize: "12px" }}>
                或自定义：
              </span>
              <input
                type="text"
                className="echo-input"
                value={config.model}
                onInput={(e) =>
                  onProfileFieldChange(
                    "model",
                    (e.target as HTMLInputElement).value,
                  )
                }
                style={{ flex: 1, fontSize: "12px" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="echo-card">
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background:
                testResult === "success"
                  ? "var(--success-bg)"
                  : testResult === "error"
                    ? "var(--danger-bg)"
                    : "var(--bg-surface)",
              color:
                testResult === "success"
                  ? "var(--success)"
                  : testResult === "error"
                    ? "var(--danger)"
                    : "var(--text-secondary)",
            }}
          >
            <IconShield />
          </div>
          <div className="setting-content">
            <div className="setting-title">连接测试</div>
            <div className="setting-desc">
              {testResult === "success"
                ? "✅ 连接成功，API 配置正确"
                : testResult === "error"
                  ? "❌ 连接失败，请检查 API 地址和密钥"
                  : testResult === "testing"
                    ? "正在测试连接..."
                    : "验证 API 连接是否可用"}
            </div>
          </div>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={onTestConnection}
            disabled={testResult === "testing"}
          >
            {testResult === "testing" ? (
              <>
                <div
                  className="loading-spinner"
                  style={{
                    width: "12px",
                    height: "12px",
                    borderWidth: "1.5px",
                  }}
                />{" "}
                测试中
              </>
            ) : (
              "测试连接"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Translation Section ===== */
function TranslationSection({
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
}: SectionProps & {
  profiles: TranslationProfile[];
  activeProfileId: string;
  onProfileSelect: (id: string) => void;
  onProfileNameChange: (name: string) => void;
  onAddProfile: () => void;
  onDuplicateProfile: () => void;
  onDeleteProfile: () => void;
  onProfileFieldChange: (
    field: "targetLang" | "domainPreference",
    value: string,
  ) => void;
}) {
  const activeProfile =
    profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  return (
    <div className="animate-in">
      <h2 className="options-section-title">翻译设置</h2>
      <p className="options-section-desc">配置翻译行为和语言偏好</p>

      <div className="section-label">翻译配置</div>
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
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">当前方案</div>
            <div className="setting-desc">快速切换翻译配置方案</div>
          </div>
          <select
            className="echo-select"
            value={activeProfile?.id}
            onChange={(e) =>
              onProfileSelect((e.target as HTMLSelectElement).value)
            }
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
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
              <path d="M4 20h16" />
              <path d="M6 16l8-8 4 4-8 8H6z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">方案名称</div>
            <div className="setting-desc">自定义配置方案名称</div>
            <input
              type="text"
              className="echo-input"
              value={activeProfile?.name || ""}
              onInput={(e) =>
                onProfileNameChange((e.target as HTMLInputElement).value)
              }
              style={{ marginTop: "8px" }}
            />
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-content" style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="echo-btn echo-btn-ghost echo-btn-sm"
              onClick={onAddProfile}
            >
              新增方案
            </button>
            <button
              type="button"
              className="echo-btn echo-btn-ghost echo-btn-sm"
              onClick={onDuplicateProfile}
            >
              复制方案
            </button>
            <button
              type="button"
              className="echo-btn echo-btn-ghost echo-btn-sm"
              onClick={onDeleteProfile}
              disabled={profiles.length <= 1}
            >
              删除方案
            </button>
          </div>
        </div>
      </div>

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
            <IconTranslate />
          </div>
          <div className="setting-content">
            <div className="setting-title">目标语言</div>
            <div className="setting-desc">翻译结果的目标语言</div>
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

        {/* Auto Detect */}
        <div
          className="setting-row clickable"
          onClick={() => updateConfig("autoDetect", !config.autoDetect)}
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">自动检测语言</div>
            <div className="setting-desc">智能识别源文本的语种</div>
          </div>
          <Toggle
            value={config.autoDetect}
            onChange={(v) => updateConfig("autoDetect", v)}
          />
        </div>

        {/* Selection Translate */}
        <div
          className="setting-row clickable"
          onClick={() =>
            updateConfig("selectionTranslate", !config.selectionTranslate)
          }
        >
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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">划词翻译</div>
            <div className="setting-desc">选中文本后显示翻译图标</div>
          </div>
          <Toggle
            value={config.selectionTranslate}
            onChange={(v) => updateConfig("selectionTranslate", v)}
          />
        </div>

        {/* Hover Translate */}
        <div
          className="setting-row clickable"
          onClick={() => updateConfig("hoverTranslate", !config.hoverTranslate)}
        >
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
              <path d="M4 4h16v16H4z" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">悬停翻译</div>
            <div className="setting-desc">鼠标悬停在段落上时自动翻译</div>
          </div>
          <Toggle
            value={config.hoverTranslate}
            onChange={(v) => updateConfig("hoverTranslate", v)}
          />
        </div>

        {/* Trigger Mode */}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">触发按键</div>
            <div className="setting-desc">
              划词或悬停时需要配合按下的修饰键才能翻译
            </div>
          </div>
          <select
            className="echo-select"
            value={config.triggerMode || "none"}
            onChange={(e) =>
              updateConfig(
                "triggerMode",
                (e.target as HTMLSelectElement).value as any,
              )
            }
          >
            <option value="none">无 (默认开启)</option>
            <option value="alt">Alt 键</option>
            <option value="ctrl">Ctrl 键</option>
            <option value="shift">Shift 键</option>
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
              <path d="M4 4h16v16H4z" />
              <path d="M4 9h16" />
              <path d="M9 4v16" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">专业领域偏好</div>
            <div className="setting-desc">影响翻译风格与术语选择</div>
            <input
              type="text"
              className="echo-input"
              value={config.domainPreference}
              onInput={(e) =>
                onProfileFieldChange(
                  "domainPreference",
                  (e.target as HTMLInputElement).value,
                )
              }
              placeholder="如：法律 / 医疗 / 金融 / 技术"
              style={{ marginTop: "8px" }}
            />
          </div>
        </div>
      </div>

      <div className="section-label">翻译队列</div>
      <div className="echo-card" style={{ marginBottom: "24px" }}>
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

      {/* Show Original */}
      <div className="section-label">原文显示</div>
      <div className="echo-card">
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
    </div>
  );
}

/* ===== Display Section ===== */
function DisplaySection({ config, updateConfig }: SectionProps) {
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

/* ===== Shortcuts Section ===== */
function ShortcutsSection({ config, updateConfig }: SectionProps) {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">快捷键</h2>
      <p className="options-section-desc">自定义键盘快捷键以快速触发翻译功能</p>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background: "var(--accent-bg)",
              color: "var(--accent-solid)",
            }}
          >
            <IconKeyboard />
          </div>
          <div className="setting-content">
            <div className="setting-title">全页翻译</div>
            <div className="setting-desc">翻译当前页面的全部文本内容</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              className="echo-input"
              value={config.fullPageShortcut}
              onInput={(e) =>
                updateConfig(
                  "fullPageShortcut",
                  (e.target as HTMLInputElement).value,
                )
              }
              style={{
                width: "100px",
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
              }}
            />
          </div>
        </div>

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
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" />
            </svg>
          </div>
          <div className="setting-content">
            <div className="setting-title">划词翻译</div>
            <div className="setting-desc">翻译当前选中的文本</div>
          </div>
          <input
            type="text"
            className="echo-input"
            value={config.selectionShortcut}
            onInput={(e) =>
              updateConfig(
                "selectionShortcut",
                (e.target as HTMLInputElement).value,
              )
            }
            style={{
              width: "100px",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px",
          background: "var(--accent-bg)",
          borderRadius: "var(--radius-sm)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "13px",
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

/* ===== Advanced Section ===== */
function AdvancedSection({
  config,
  updateConfig,
  onExport,
  onImport,
  onReset,
}: SectionProps & {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
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

/* ===== Vocabulary Section ===== */
function VocabularySection() {
  const [vocabulary, setVocabulary] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    chrome.storage.local.get(["vocabulary"], (res) => {
      setVocabulary(
        Array.isArray(res.vocabulary)
          ? (res.vocabulary as Record<string, any>[])
          : [],
      );
    });
  }, []);

  const handleDelete = (index: number) => {
    const newVocab = [...vocabulary];
    newVocab.splice(index, 1);
    setVocabulary(newVocab);
    chrome.storage.local.set({ vocabulary: newVocab });
  };

  const handleClearAll = () => {
    if (confirm("确定要清空生词本吗？此操作无法撤销。")) {
      setVocabulary([]);
      chrome.storage.local.set({ vocabulary: [] });
    }
  };

  const exportVocabulary = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(vocabulary, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "echoread_vocabulary.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="section-card animate-in">
      <div
        className="section-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 className="section-title">生词本</h2>
          <p className="section-desc">您在翻译时保存的单词和短句。</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={exportVocabulary}
            disabled={vocabulary.length === 0}
            style={{ padding: "6px 12px" }}
          >
            导出 JSON
          </button>
          <button
            className="echo-btn echo-btn-ghost echo-btn-sm"
            onClick={handleClearAll}
            disabled={vocabulary.length === 0}
            style={{ padding: "6px 12px", color: "var(--danger)" }}
          >
            清空
          </button>
        </div>
      </div>

      <div
        className="section-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          maxHeight: "60vh",
          overflowY: "auto",
          paddingRight: "8px",
        }}
      >
        {vocabulary.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "var(--text-tertiary)",
            }}
          >
            生词本为空，试试在翻译划词弹窗中点击收藏按钮吧。
          </div>
        ) : (
          vocabulary.map((item, index) => (
            <div
              key={index}
              className="setting-row"
              style={{ alignItems: "flex-start", padding: "16px" }}
            >
              <div className="setting-content" style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: "#f5f5f7",
                    }}
                  >
                    {item.original}
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--text-tertiary)",
                      background: "rgba(255,255,255,0.05)",
                      padding: "2px 6px",
                      borderRadius: "10px",
                    }}
                  >
                    {item.detectedLang?.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                    marginBottom: "8px",
                  }}
                >
                  {item.translation}
                </div>
                {item.url && (
                  <div style={{ fontSize: "11px" }}>
                    <a
                      href={item.url}
                      target="_blank"
                      style={{
                        color: "var(--accent-solid)",
                        textDecoration: "none",
                      }}
                    >
                      原文来源
                    </a>
                    <span
                      style={{
                        marginLeft: "10px",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <button
                className="echo-btn echo-btn-ghost echo-btn-sm"
                onClick={() => handleDelete(index)}
                style={{
                  marginLeft: "16px",
                  padding: "6px",
                  color: "var(--danger)",
                }}
                title="删除"
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
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ===== About Section ===== */
function AboutSection() {
  return (
    <div className="animate-in">
      <h2 className="options-section-title">关于 EchoRead</h2>
      <p className="options-section-desc">高性能 AI 翻译与阅读辅助浏览器插件</p>

      <div className="echo-card" style={{ marginBottom: "24px" }}>
        <div className="setting-row">
          <div
            className="setting-icon"
            style={{
              background:
                "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
              color: "white",
            }}
          >
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
          <div
            className="setting-icon"
            style={{ background: "var(--success-bg)", color: "var(--success)" }}
          >
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
            <div
              style={{ fontSize: "20px", width: "36px", textAlign: "center" }}
            >
              {feat.icon}
            </div>
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
