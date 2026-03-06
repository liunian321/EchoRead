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
    const saveState = () => {
      chrome.storage.sync.set({
        ...config,
        translationProfiles: profiles,
        activeProfileId,
      });
    };

    const timer = setTimeout(() => {
      setSaving(true);
      saveState();
      setTimeout(() => {
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }, 300);
    }, 1000);

    const handleBeforeUnload = () => saveState();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
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
    (field: "targetLang" | "model" | "domainPreference", value: string) => {
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
    <div className="grid h-screen grid-cols-[240px_minmax(0,1fr)] bg-(--bg-base) overflow-hidden relative">
      {/* Sidebar */}
      <nav className="flex flex-col py-5 overflow-y-auto z-10 bg-white/50 dark:bg-[#111113]/60 backdrop-blur-xl border-r border-(--border-light)">
        <div className="flex items-center gap-2.5 px-5 pb-5 mb-1 border-b border-(--border-light)">
          <div className="w-8 h-8 rounded-[8px] bg-(--accent-solid) flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                stroke="white"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-semibold text-(--text-primary) tracking-tight">
              EchoRead
            </div>
            <div className="text-[11px] text-(--text-tertiary) font-medium -mt-px">
              设置
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-3 mt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-2.5 px-3 py-[7px] w-full border-none rounded-lg cursor-pointer transition-all duration-150 ease-out text-[13px] font-medium text-left font-sans tracking-tight ${
                activeTab === tab.id
                  ? "bg-(--bg-surface-hover) text-(--text-primary) font-semibold"
                  : "bg-transparent text-(--text-secondary) hover:bg-(--bg-surface) hover:text-(--text-primary)"
              } active:scale-[0.98]`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span
                className={`flex items-center justify-center shrink-0 w-4 h-4 transition-opacity duration-150 ${
                  activeTab === tab.id ? "opacity-100" : "opacity-50"
                }`}
              >
                <tab.icon />
              </span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Save Indicator */}
        <div
          className={`mt-auto flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] transition-colors duration-300 pointer-events-none border-t border-(--border-light) ${saved ? "text-(--success)" : "text-(--text-hint)"}`}
        >
          {saving ? (
            <>
              <div className="w-3 h-3 border-[1.5px] border-current/20 border-t-current rounded-full animate-[spin_0.8s_linear_infinite]" />
              <span>保存中</span>
            </>
          ) : saved ? (
            <>
              <IconCheck />
              <span>已保存</span>
            </>
          ) : (
            <span>自动同步</span>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex justify-center p-10 overflow-y-auto h-screen z-1 relative">
        <div key={activeTab} className="w-full max-w-[860px] animate-in">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
