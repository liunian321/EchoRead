import { useState, useEffect, useCallback } from "preact/hooks";
import { Config, TabId, TranslationProfile, ModelInfo } from "./types";
import { DEFAULT_CONFIG } from "./constants";
import { createProfileId } from "./utils";

import {
  IconEngine,
  IconTranslate,
  IconDisplay,
  IconKeyboard,
  IconAdvanced,
  IconInfo,
  IconVocabulary,
  IconCheck,
} from "./components/Icons";

import { EngineSection } from "./components/EngineSection";
import { TranslationSection } from "./components/TranslationSection";
import { DisplaySection } from "./components/DisplaySection";
import { ShortcutsSection } from "./components/ShortcutsSection";
import { VocabularySection } from "./components/VocabularySection";
import { AdvancedSection } from "./components/AdvancedSection";
import { AboutSection } from "./components/AboutSection";

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
    chrome.storage.sync.get(null, (result: { [key: string]: any }) => {
      const data = result as Partial<Config> & {
        translationProfiles?: TranslationProfile[];
        activeProfileId?: string;
      };
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
