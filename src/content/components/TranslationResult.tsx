import { useState } from "preact/hooks";
import { TranslationResult as ITranslationResult } from "../types";

const RESULT_CSS = `
  @keyframes echoReadFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .er-result { animation: echoReadFadeIn 0.3s ease-out both; }
  .er-result * { box-sizing: border-box; margin: 0; padding: 0; }

  .er-header {
    padding-bottom: 14px;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.08);
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 14px;
  }

  .er-original {
    font-size: 13.5px;
    color: rgba(245, 245, 247, 0.65);
    line-height: 1.55;
    font-weight: 450;
    flex: 1;
    word-break: break-word;
  }

  .er-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .er-icon-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .er-icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
  }
  .er-icon-btn.active {
    background: rgba(88, 86, 214, 0.2);
    color: #7d7aff;
  }

  .er-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .er-lang {
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
  }
  .er-lang-source {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.45);
  }
  .er-lang-target {
    background: rgba(88, 86, 214, 0.2);
    color: #7d7aff;
  }

  .er-arrow {
    color: rgba(255, 255, 255, 0.2);
  }

  .er-translation {
    font-size: 16.5px;
    font-weight: 600;
    line-height: 1.5;
    color: #f5f5f7;
    letter-spacing: -0.02em;
    word-break: break-word;
  }

  .er-defs {
    padding-top: 14px;
    margin-top: 14px;
    border-top: 0.5px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .er-def-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 3px;
  }

  .er-pos {
    font-size: 10px;
    font-weight: 700;
    color: #7d7aff;
    background: rgba(88, 86, 214, 0.15);
    padding: 2px 7px;
    border-radius: 5px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .er-def-text {
    font-size: 14px;
    color: #f5f5f7;
    font-weight: 500;
    line-height: 1.45;
  }

  .er-example {
    font-size: 13px;
    color: rgba(245, 245, 247, 0.5);
    padding-left: 12px;
    border-left: 2px solid rgba(255, 255, 255, 0.08);
    font-style: italic;
    margin-top: 4px;
    line-height: 1.45;
  }

  .er-copy-toast {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(52, 199, 89, 0.9);
    color: white;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    animation: echoReadFadeIn 0.2s ease-out both;
  }
`;

export function TranslationResult({ data }: { data: ITranslationResult }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const copyTranslation = async () => {
    try {
      await navigator.clipboard.writeText(data.translation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for non-HTTPS or restricted contexts
      const textArea = document.createElement("textarea");
      textArea.value = data.translation;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="er-result" style={{ position: "relative" }}>
      <style>{RESULT_CSS}</style>

      {copied && <div className="er-copy-toast">已复制</div>}

      {/* Original Text Header */}
      {data.original && (
        <div className="er-header">
          <span className="er-original">{data.original}</span>
          <div className="er-actions">
            {/* Copy Button */}
            <button
              className={`er-icon-btn ${copied ? "active" : ""}`}
              onClick={copyTranslation}
              title="复制译文"
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
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            {/* Save to Vocabulary */}
            <button
              className={`er-icon-btn ${saved ? "active" : ""}`}
              onClick={saveToVocabulary}
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
            </button>
            {/* Play Audio */}
            <button
              className="er-icon-btn"
              onClick={() => playAudio(data.original, data.detectedLang)}
              title="朗读原文"
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
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Language Meta */}
      <div className="er-meta">
        <span className="er-lang er-lang-source">{data.detectedLang}</span>
        <svg
          className="er-arrow"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
        <span className="er-lang er-lang-target">{data.targetLang}</span>
      </div>

      {/* Translation Main */}
      <div className="er-translation">{data.translation}</div>

      {/* Definitions */}
      {data.definitions && data.definitions.length > 0 && (
        <div className="er-defs">
          {data.definitions.map((def, i) => (
            <div key={i}>
              <div className="er-def-header">
                <span className="er-pos">{def.partOfSpeech}</span>
                <span className="er-def-text">{def.definition}</span>
              </div>
              {def.example && <div className="er-example">"{def.example}"</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
