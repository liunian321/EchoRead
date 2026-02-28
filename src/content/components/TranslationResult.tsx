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
      {/* Original Header */}
      {data.original && (
        <div
          style={{
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border)",
            marginBottom: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              color: "var(--text-description)",
              lineHeight: "1.5",
              fontWeight: "450",
            }}
          >
            {data.original}
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <IconButton
              onClick={saveToVocabulary}
              active={saved}
              title={saved ? "已保存" : "保存到生词本"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={saved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </IconButton>
            <IconButton
              onClick={() => playAudio(data.original, data.detectedLang)}
              title="朗读原文"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            </IconButton>
          </div>
        </div>
      )}

      {/* Meta Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "8px",
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        <span style={{ color: "var(--text-hint)" }}>{data.detectedLang}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-hint)"
          strokeWidth="3"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span style={{ color: "var(--accent)" }}>{data.targetLang}</span>
      </div>

      {/* Translation Main */}
      <div
        style={{
          fontSize: "17px",
          fontWeight: "600",
          lineHeight: "1.45",
          color: "var(--text-main)",
          marginBottom: "16px",
          letterSpacing: "-0.01em",
        }}
      >
        {data.translation}
      </div>

      {/* Definitions Section */}
      {data.definitions && data.definitions.length > 0 && (
        <div
          style={{
            paddingTop: "12px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {data.definitions.map((def, i) => (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "var(--accent)",
                    background: "var(--accent-soft)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  {def.partOfSpeech}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--text-main)",
                    fontWeight: "500",
                  }}
                >
                  {def.definition}
                </span>
              </div>
              {def.example && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-description)",
                    paddingLeft: "12px",
                    borderLeft: "2px solid var(--border)",
                    fontStyle: "italic",
                    marginTop: "4px",
                  }}
                >
                  “{def.example}”
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface IconButtonProps {
  children: import("preact").ComponentChildren;
  onClick: (e: MouseEvent) => void;
  active?: boolean;
  title?: string;
}

function IconButton({ children, onClick, active, title }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-hint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget as HTMLButtonElement;
        t.style.background = "var(--border)";
        t.style.color = "var(--text-description)";
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget as HTMLButtonElement;
        t.style.background = active ? "var(--accent-soft)" : "transparent";
        t.style.color = active ? "var(--accent)" : "var(--text-hint)";
      }}
    >
      {children}
    </button>
  );
}
