import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { useSelection } from "./hooks/useSelection";
import { useTranslate } from "./hooks/useTranslate";
import { useShortcut } from "./hooks/useShortcut";
import { translatePageContent } from "./utils/fullPageTranslate";
import { Bubble } from "./components/Bubble";
import { Skeleton } from "./components/Skeleton";
import { TranslationResult } from "./components/TranslationResult";

export function App() {
  const selection = useSelection();
  const { isLoading, data, error, translate, reset } = useTranslate();

  // Register global shortcut for full page translation
  useShortcut("Alt+T", () => {
    translatePageContent().catch(console.error);
  });
  const [mode, setMode] = useState<"icon" | "result">("icon");

  // Reset state when selection changes or disappears
  useEffect(() => {
    if (!selection) {
      setMode("icon");
      reset();
    }
  }, [selection, reset]);

  const handleTranslate = () => {
    if (selection) {
      setMode("result");
      translate(selection.text);
    }
  };

  if (!selection) return null;

  return (
    <Bubble
      x={selection.position.x}
      y={selection.position.y}
      visible={!!selection}
      style={mode === "result" ? { minWidth: "300px" } : { padding: "8px", borderRadius: "50%", minWidth: "unset", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {mode === "icon" ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleTranslate();
          }}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0",
            color: "#fff",
            width: "100%",
            height: "100%",
          }}
          title="Translate"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </button>
      ) : (
        <div style={{ width: "100%" }}>
          {isLoading && <Skeleton />}
          {error && (
            <div style={{ color: "#ff5252", fontSize: "14px", padding: "8px 0" }}>
              <p style={{ margin: "0 0 8px 0" }}>{error}</p>
              <button
                onClick={handleTranslate}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px"
                }}>
                Retry
              </button>
            </div>
          )}
          {data && <TranslationResult data={data} />}
        </div>
      )}
    </Bubble>
  );
}
