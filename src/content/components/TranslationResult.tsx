import { useState } from "preact/hooks";
import { TranslationResult as ITranslationResult } from "../types";

export function TranslationResult({ data }: { data: ITranslationResult }) {
  const [saved, setSaved] = useState(false);
  const playAudio = (text: string, lang: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "auto" ? "en-US" : lang;
      window.speechSynthesis.speak(utterance);
    } else if (data.pronunciation && text === data.original) {
      const audio = new Audio(data.pronunciation);
      audio.play().catch((e) => console.error("Audio playback failed", e));
    }
  };

  const saveToVocabulary = () => {
    if (!data.original) return;
    chrome.storage.local.get(["vocabulary"], (res) => {
      const vocab: any[] = Array.isArray(res.vocabulary) ? res.vocabulary : [];
      const newEntry = {
        original: data.original,
        translation: data.translation,
        detectedLang: data.detectedLang,
        timestamp: Date.now(),
        url: window.location.href,
      };
      chrome.storage.local.set({ vocabulary: [newEntry, ...vocab] }, () => {
        setSaved(true);
      });
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Original Text */}
      {data.original && (
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "8px",
            lineHeight: "1.4",
            paddingBottom: "8px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "8px",
          }}
        >
          <span>{data.original}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={saveToVocabulary}
              title={saved ? "已添加到生词本" : "添加到生词本"}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: saved ? "var(--warning)" : "#e2e8f0",
                flexShrink: 0,
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
            <button
              onClick={() => playAudio(data.original, data.detectedLang)}
              title="朗读原文"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#e2e8f0",
                flexShrink: 0,
                transition:
                  "background 0.2s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(255,255,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header: Lang -> Lang */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          fontSize: "12px",
          color: "#94a3b8", // softer meta text color
          letterSpacing: "0.5px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontWeight: 600, color: "#f5f5f7", fontSize: "11px" }}>
            {data.detectedLang.toUpperCase()}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span
            style={{
              fontWeight: 600,
              color: "var(--accent-color)",
              fontSize: "11px",
            }}
          >
            {data.targetLang.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Phonetic */}
      {data.phonetic && (
        <div
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "12px",
            fontFamily: "SF Mono, Menlo, Monaco, Consolas, monospace",
            letterSpacing: "0.2px",
          }}
        >
          {data.phonetic.startsWith("/") ? data.phonetic : `/${data.phonetic}/`}
        </div>
      )}

      {/* Translation */}
      <div
        style={{
          fontSize: "16px",
          fontWeight: "600",
          lineHeight: "1.4",
          marginBottom: "16px",
          color: "#ffffff",
        }}
      >
        {data.translation}
      </div>

      {/* Definitions */}
      {data.definitions && data.definitions.length > 0 && (
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "12px",
            marginTop: "4px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {data.definitions.map((def, i) => (
            <div key={i} style={{ fontSize: "13px", lineHeight: "1.4" }}>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "6px" }}
              >
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: "600",
                    fontSize: "10px",
                    background: "rgba(255, 255, 255, 0.08)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {def.partOfSpeech}
                </span>
                <span style={{ color: "#e2e8f0" }}>{def.definition}</span>
              </div>
              {def.example && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "#94a3b8",
                    marginTop: "6px",
                    paddingLeft: "10px",
                    borderLeft: "2px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {def.example}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
