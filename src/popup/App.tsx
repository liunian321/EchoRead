import { useState, useEffect } from "preact/hooks";

/**
 * Manual Translation Panel
 */
export default function App() {
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState("");
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [activeProfileId, setActiveProfileId] = useState("");

  useEffect(() => {
    chrome.storage.sync.get(
      ["translationProfiles", "activeProfileId"],
      (data: any) => {
        const storedProfiles =
          (data.translationProfiles as Array<{ id: string; name: string }>) ||
          [];
        setProfiles(storedProfiles);
        setActiveProfileId(
          (data.activeProfileId as string) || storedProfiles[0]?.id || "",
        );
      },
    );

    const handleChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      if (changes.translationProfiles?.newValue) {
        setProfiles(
          changes.translationProfiles.newValue as Array<{
            id: string;
            name: string;
          }>,
        );
      }
      if (changes.activeProfileId?.newValue) {
        setActiveProfileId(changes.activeProfileId.newValue as string);
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    setIsTranslating(true);
    setTranslatedText("");
    setError("");

    try {
      const port = chrome.runtime.connect({ name: "translate-stream" });
      port.onMessage.addListener((msg) => {
        if (msg.type === "STREAM_DATA") {
          setTranslatedText(msg.data.translation);
        } else if (msg.type === "STREAM_END") {
          setIsTranslating(false);
        } else if (msg.type === "ERROR") {
          setError(msg.error);
          setIsTranslating(false);
        }
      });
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message || "Connection lost");
          setIsTranslating(false);
        }
      });
      port.postMessage({
        type: "TRANSLATE_TEXT",
        payload: { text: inputText },
      });
    } catch (e) {
      setError(String(e));
      setIsTranslating(false);
    }
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleFullPageTranslate = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) return;

      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith("edge://") ||
        tab.url?.startsWith("about:") ||
        tab.url?.startsWith("chrome-extension://")
      ) {
        setError("该页面不支持全页翻译。");
        return;
      }

      const tabId = tab.id;

      const trySendMessage = () => {
        chrome.tabs.sendMessage(tabId, { type: "FULL_PAGE_TRANSLATE" }, () => {
          if (chrome.runtime.lastError) {
            // Content script not loaded, inject it first
            injectAndRetry(tabId);
          } else {
            window.close();
          }
        });
      };

      const injectAndRetry = async (id: number) => {
        try {
          // Read manifest to find the content script file dynamically
          const manifest = chrome.runtime.getManifest();
          const contentScriptFiles = manifest.content_scripts?.[0]?.js || [];

          await chrome.scripting.executeScript({
            target: { tabId: id },
            files: contentScriptFiles,
          });

          // Small delay to let the script initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(id, { type: "FULL_PAGE_TRANSLATE" }, () => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Retry failed:",
                  chrome.runtime.lastError.message,
                );
                setError("注入失败，请刷新页面后再试。");
              } else {
                window.close();
              }
            });
          }, 500);
        } catch (e) {
          console.error("Script injection failed:", e);
          setError("无法注入脚本，请刷新页面后再试。");
        }
      };

      trySendMessage();
    } catch (e) {
      console.error("Full page translate error:", e);
      setError("无法连接到页面，请刷新页面后再试。");
    }
  };

  const handleProfileSwitch = (nextId: string) => {
    setActiveProfileId(nextId);
    chrome.storage.sync.set({ activeProfileId: nextId });
  };

  return (
    <div className="popup-container" style={{ width: "360px" }}>
      {/* Header */}
      <header
        className="popup-header animate-in"
        style={{
          paddingBottom: "12px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "10px",
              background:
                "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(99,102,241,0.2)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                letterSpacing: "-0.3px",
              }}
            >
              <span className="gradient-text">EchoRead</span>
            </div>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-tertiary)",
                fontWeight: "500",
              }}
            >
              Manual Translation
            </div>
          </div>
        </div>
      </header>

      {/* Manual Input Area */}
      <div className="animate-in animate-in-1" style={{ marginTop: "16px" }}>
        <textarea
          className="echo-input"
          placeholder="输入需要翻译的文本..."
          value={inputText}
          onInput={(e) => setInputText((e.target as HTMLTextAreaElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleTranslate();
            }
          }}
          style={{
            width: "100%",
            height: "80px",
            resize: "none",
            fontSize: "13px",
            padding: "10px",
            boxSizing: "border-box",
            borderRadius: "var(--radius-sm)",
          }}
        />
        <button
          onClick={handleTranslate}
          disabled={!inputText.trim() || isTranslating}
          className="echo-btn echo-btn-primary"
          style={{ width: "100%", marginTop: "12px", padding: "10px 0" }}
        >
          {isTranslating ? (
            <div
              className="loading-spinner"
              style={{ width: "14px", height: "14px", borderWidth: "2px" }}
            />
          ) : (
            "翻译 (Ctrl+Enter)"
          )}
        </button>
      </div>

      {/* Translation Result area */}
      {(translatedText || error) && (
        <div
          className="echo-card animate-in animate-in-2"
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          {error ? (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                lineHeight: "1.4",
              }}
            >
              {error}
            </div>
          ) : (
            <div
              style={{
                color: "#f5f5f7",
                fontSize: "14px",
                lineHeight: "1.5",
                whiteWhiteSpace: "pre-wrap",
              }}
            >
              {translatedText}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        className="popup-actions animate-in animate-in-3"
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {profiles.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              width: "100%",
            }}
          >
            <select
              className="echo-select"
              value={activeProfileId}
              onChange={(e) =>
                handleProfileSwitch((e.target as HTMLSelectElement).value)
              }
              style={{ flex: 1 }}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <button
              onClick={openOptionsPage}
              className="echo-btn echo-btn-ghost echo-btn-sm"
              style={{ padding: "6px 10px" }}
            >
              管理
            </button>
          </div>
        )}
        <button
          onClick={handleFullPageTranslate}
          className="echo-btn echo-btn-ghost echo-btn-sm"
          style={{
            width: "100%",
            gap: "6px",
            justifyContent: "flex-start",
            padding: "8px 12px",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l6 6" />
            <path d="M4 14l4-4 4 4" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="M22 22l-5-5" />
            <path d="M17 17l4 4" />
          </svg>
          全页翻译 (Alt+T)
        </button>

        <button
          onClick={openOptionsPage}
          className="echo-btn echo-btn-ghost echo-btn-sm"
          style={{
            width: "100%",
            gap: "6px",
            justifyContent: "flex-start",
            padding: "8px 12px",
            color: "var(--accent-solid)",
          }}
        >
          <svg
            width="14"
            height="14"
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
          高级设置
        </button>
      </div>
    </div>
  );
}
