import { useState, useEffect } from "preact/hooks";

/**
 * Popup — Manual Translation Panel (Apple-style)
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
            injectAndRetry(tabId);
          } else {
            window.close();
          }
        });
      };

      const injectAndRetry = async (id: number) => {
        try {
          const manifest = chrome.runtime.getManifest();
          const contentScriptFiles = manifest.content_scripts?.[0]?.js || [];

          await chrome.scripting.executeScript({
            target: { tabId: id },
            files: contentScriptFiles,
          });

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

  const copyResult = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
    } catch {
      /* fallback */
    }
  };

  return (
    <div className="popup-container" style={{ width: "380px" }}>
      {/* ── Header ── */}
      <header
        className="popup-header animate-in"
        style={{
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(88, 86, 214, 0.3)",
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
                fontSize: "16px",
                fontWeight: "700",
                letterSpacing: "-0.4px",
              }}
            >
              <span className="gradient-text">EchoRead</span>
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-tertiary)",
                fontWeight: "500",
                letterSpacing: "0.02em",
              }}
            >
              智能翻译助手
            </div>
          </div>
        </div>
      </header>

      {/* ── Input Area ── */}
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
            height: "88px",
            resize: "none",
            fontSize: "13.5px",
            padding: "12px 14px",
            boxSizing: "border-box",
            borderRadius: "12px",
            lineHeight: "1.5",
            letterSpacing: "-0.01em",
          }}
        />
        <button
          onClick={handleTranslate}
          disabled={!inputText.trim() || isTranslating}
          className="echo-btn echo-btn-primary"
          style={{
            width: "100%",
            marginTop: "12px",
            padding: "11px 0",
            borderRadius: "12px",
            fontSize: "14px",
            letterSpacing: "-0.01em",
          }}
        >
          {isTranslating ? (
            <div
              className="loading-spinner"
              style={{ width: "14px", height: "14px", borderWidth: "2px" }}
            />
          ) : (
            "翻译 (⌘ Enter)"
          )}
        </button>
      </div>

      {/* ── Translation Result ── */}
      {(translatedText || error) && (
        <div
          className="echo-card animate-in animate-in-2"
          style={{
            marginTop: "16px",
            padding: "14px",
            borderRadius: "14px",
          }}
        >
          {error ? (
            <div
              style={{
                color: "var(--danger)",
                fontSize: "13px",
                lineHeight: "1.5",
                fontWeight: "500",
              }}
            >
              {error}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div
                style={{
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  lineHeight: "1.6",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  letterSpacing: "-0.01em",
                }}
              >
                {translatedText}
              </div>
              {/* Copy button */}
              <button
                onClick={copyResult}
                className="echo-btn echo-btn-ghost echo-btn-sm"
                style={{
                  marginTop: "10px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  gap: "5px",
                  borderRadius: "8px",
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                复制
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div
        className="popup-actions animate-in animate-in-3"
        style={{
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid var(--border-light)",
          gap: "4px",
        }}
      >
        {profiles.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              width: "100%",
              marginBottom: "4px",
            }}
          >
            <select
              className="echo-select"
              value={activeProfileId}
              onChange={(e) =>
                handleProfileSwitch((e.target as HTMLSelectElement).value)
              }
              style={{ flex: 1, borderRadius: "10px" }}
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
              style={{ padding: "7px 12px", borderRadius: "10px" }}
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
            gap: "8px",
            justifyContent: "flex-start",
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "550",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 8 6 6" />
            <path d="m4 14 4-4 4 4" />
            <path d="M2 5h12" />
            <path d="M7 2h1" />
            <path d="m22 22-5-10-5 10" />
            <path d="M14 18h6" />
          </svg>
          全页翻译
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              color: "var(--text-tertiary)",
              fontWeight: "500",
            }}
          >
            Alt+T
          </span>
        </button>

        <button
          onClick={openOptionsPage}
          className="echo-btn echo-btn-ghost echo-btn-sm"
          style={{
            width: "100%",
            gap: "8px",
            justifyContent: "flex-start",
            padding: "10px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "550",
            color: "var(--accent-solid)",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          高级设置
        </button>
      </div>
    </div>
  );
}
