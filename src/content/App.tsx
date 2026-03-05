import { useState, useEffect, useRef } from "preact/hooks";
import { useSelection } from "./hooks/useSelection";
import { useTranslate } from "./hooks/useTranslate";
import { useShortcut } from "./hooks/useShortcut";
import { useDragging } from "./hooks/useDragging";
import { translatePageContent } from "./utils/fullPageTranslate";
import { Bubble } from "./components/Bubble";
import { Skeleton } from "./components/Skeleton";
import { TranslationResult } from "./components/TranslationResult";
import { StorageConfig } from "./types";

/* ── Apple-style floating button CSS ── */
const FLOAT_CSS = `
  @keyframes echoReadSpin {
    to { transform: rotate(360deg); }
  }
  @keyframes echoReadPulseRing {
    0% { box-shadow: 0 0 0 0 rgba(88, 86, 214, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(88, 86, 214, 0); }
    100% { box-shadow: 0 0 0 0 rgba(88, 86, 214, 0); }
  }
  @keyframes echoReadGradientShift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
`;

const TRANSLATE_ICON = (
  <svg
    width="20"
    height="20"
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
);

export function App() {
  const selection = useSelection();
  const { isLoading, data, error, translate, reset } = useTranslate();
  const [mode, setMode] = useState<"icon" | "result">("icon");
  const [isFullPageTranslating, setIsFullPageTranslating] = useState(false);
  const [floatConfig, setFloatConfig] = useState<{
    enabled: boolean;
    opacity: number;
    size: number;
    iconStyle: "solid" | "outline";
    selectionTranslate: boolean;
  }>({
    enabled: true,
    opacity: 0.9,
    size: 48,
    iconStyle: "outline",
    selectionTranslate: true,
  });
  const floatButtonRef = useRef<HTMLButtonElement>(null);

  const {
    position: floatPosition,
    setPosition,
    onPointerDown: onFloatPointerDown,
    wasRecentDrag,
  } = useDragging(
    { x: window.innerWidth - 72, y: window.innerHeight - 160 },
    (pos) => {
      chrome.storage.sync.set({ floatingButtonPosition: pos });
    },
  );

  // Reset state when selection changes or disappears
  useEffect(() => {
    if (!selection) {
      setMode("icon");
      reset();
    }
  }, [selection, reset]);

  const isFullPageTranslatingRef = useRef(false);

  const handleTranslate = () => {
    if (selection) {
      setMode("result");
      translate(selection.text);
    }
  };

  const handleFullPageTranslate = async () => {
    if (isFullPageTranslatingRef.current) return;
    setIsFullPageTranslating(true);
    isFullPageTranslatingRef.current = true;
    try {
      const data = (await chrome.storage.sync.get([
        "lazyFullPageTranslate",
      ])) as StorageConfig;
      const lazyFullPageTranslate = data.lazyFullPageTranslate !== false;
      console.info("EchoRead: full page translate start");
      await translatePageContent({
        batchSize: lazyFullPageTranslate ? 30 : Number.MAX_SAFE_INTEGER,
        viewportOnly: lazyFullPageTranslate,
      });
      import("./utils/observer")
        .then((m) => {
          m.stopAutoTranslationObserver();
          m.startAutoTranslationObserver({
            enableScroll: lazyFullPageTranslate,
            viewportBatchSize: 30,
            mutationBatchSize: 20,
          });
        })
        .catch(console.error);
      console.info("EchoRead: full page translate done");
    } catch (error) {
      console.error("EchoRead: full page translate failed", error);
    } finally {
      setIsFullPageTranslating(false);
      isFullPageTranslatingRef.current = false;
    }
  };

  // Register global shortcut for full page translation
  useShortcut("Alt+T", () => {
    handleFullPageTranslate();
  });

  useEffect(() => {
    const handleMessage = (
      msg: { type: string; text?: string },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (res: any) => void,
    ) => {
      if (msg.type === "CONTEXT_MENU_TRANSLATE" && msg.text) {
        setMode("result");
        translate(msg.text);
        sendResponse({ success: true });
        return true;
      }
      if (msg.type === "FULL_PAGE_TRANSLATE") {
        handleFullPageTranslate();
        sendResponse({ success: true });
        return true;
      }
    };
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [translate]);

  useEffect(() => {
    chrome.storage.sync.get(
      [
        "floatingButtonEnabled",
        "floatingButtonOpacity",
        "floatingButtonSize",
        "floatingButtonIconStyle",
        "selectionTranslate",
        "floatingButtonPosition",
      ],
      (data: StorageConfig) => {
        setFloatConfig({
          enabled: data.floatingButtonEnabled !== false,
          opacity: Number(data.floatingButtonOpacity || 0.9),
          size: Number(data.floatingButtonSize || 48),
          iconStyle:
            (data.floatingButtonIconStyle as "solid" | "outline") || "outline",
          selectionTranslate: data.selectionTranslate !== false,
        });
        if (data.floatingButtonPosition?.x !== undefined) {
          setPosition({
            x: Number(data.floatingButtonPosition.x),
            y: Number(data.floatingButtonPosition.y),
          });
        }
      },
    );

    const handleChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      setFloatConfig((prev) => ({
        enabled:
          changes.floatingButtonEnabled?.newValue !== undefined
            ? changes.floatingButtonEnabled.newValue !== false
            : prev.enabled,
        opacity:
          changes.floatingButtonOpacity?.newValue !== undefined
            ? Number(changes.floatingButtonOpacity.newValue || 0.9)
            : prev.opacity,
        size:
          changes.floatingButtonSize?.newValue !== undefined
            ? Number(changes.floatingButtonSize.newValue || 48)
            : prev.size,
        iconStyle:
          changes.floatingButtonIconStyle?.newValue !== undefined
            ? (changes.floatingButtonIconStyle.newValue as "solid" | "outline")
            : prev.iconStyle,
        selectionTranslate:
          changes.selectionTranslate?.newValue !== undefined
            ? changes.selectionTranslate.newValue !== false
            : prev.selectionTranslate,
      }));
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  const onFloatClick = () => {
    // Read live drag state at click time — not a stale render snapshot
    if (wasRecentDrag()) return;
    handleFullPageTranslate();
  };

  const showBubble = selection && floatConfig.selectionTranslate;
  const sz = floatConfig.size;
  const iconSz = Math.max(18, sz * 0.42);

  return (
    <>
      <style>{FLOAT_CSS}</style>

      {/* ── Floating Action Button ── */}
      {floatConfig.enabled && (
        <button
          ref={floatButtonRef}
          onPointerDown={(e) => onFloatPointerDown(e)}
          onClick={onFloatClick}
          style={{
            position: "fixed",
            left: `${floatPosition.x}px`,
            top: `${floatPosition.y}px`,
            width: `${sz}px`,
            height: `${sz}px`,
            borderRadius: "50%",
            cursor: "pointer",
            zIndex: 2147483647,
            opacity: floatConfig.opacity,

            /* Apple-style glass button */
            background: isFullPageTranslating
              ? "linear-gradient(135deg, #667eea, #764ba2, #667eea)"
              : floatConfig.iconStyle === "solid"
                ? "linear-gradient(135deg, #667eea, #5856d6)"
                : "rgba(44, 44, 46, 0.8)",
            backgroundSize: isFullPageTranslating ? "200% 200%" : "100% 100%",
            animation: isFullPageTranslating
              ? "echoReadGradientShift 3s ease infinite, echoReadPulseRing 1.5s ease-out infinite"
              : "none",

            backdropFilter: "blur(30px) saturate(180%)",
            WebkitBackdropFilter: "blur(30px) saturate(180%)",

            boxShadow: isFullPageTranslating
              ? "0 8px 32px rgba(88, 86, 214, 0.4), inset 0 0 0 0.5px rgba(255, 255, 255, 0.2)"
              : "0 4px 20px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.1), inset 0 0 0 0.5px rgba(255, 255, 255, 0.1)",

            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0",
            color: "#fff",
            pointerEvents: "auto",
            transition:
              "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease",
            transform: isFullPageTranslating ? "scale(1.05)" : "scale(1)",
          }}
          title="拖拽移动，点击翻译整页"
        >
          {isFullPageTranslating ? (
            <div
              style={{
                width: `${iconSz}px`,
                height: `${iconSz}px`,
                borderRadius: "50%",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "#fff",
                animation: "echoReadSpin 0.8s linear infinite",
              }}
            />
          ) : (
            <div
              style={{
                width: `${iconSz}px`,
                height: `${iconSz}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {TRANSLATE_ICON}
            </div>
          )}
        </button>
      )}

      {/* ── Selection Bubble ── */}
      {showBubble && selection && (
        <Bubble
          x={selection.position.x}
          y={selection.position.y}
          rect={selection.rect}
          visible={!!selection}
          mode={mode}
          style={
            mode === "result"
              ? { minWidth: "320px" }
              : {
                  padding: "0",
                  borderRadius: "50%",
                  minWidth: "unset",
                  width: "42px",
                  height: "42px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }
          }
        >
          {mode === "icon" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTranslate();
              }}
              style={{
                background: "linear-gradient(135deg, #667eea, #5856d6)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0",
                color: "#fff",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow:
                  "0 4px 14px rgba(88, 86, 214, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
              }}
              title="点击翻译"
            >
              <svg
                width="20"
                height="20"
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
            </button>
          ) : (
            <div style={{ width: "100%" }}>
              {isLoading && <Skeleton />}
              {error && (
                <div
                  style={{
                    color: "#ff453a",
                    fontSize: "13.5px",
                    padding: "4px 0",
                    lineHeight: "1.5",
                  }}
                >
                  <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>
                    {error}
                  </p>
                  <button
                    onClick={handleTranslate}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "0.5px solid rgba(255, 255, 255, 0.12)",
                      color: "#f5f5f7",
                      padding: "8px 18px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "550",
                      transition: "all 0.2s ease",
                      letterSpacing: "-0.01em",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.18)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.1)";
                    }}
                  >
                    重新尝试
                  </button>
                </div>
              )}
              {data && <TranslationResult data={data} />}
            </div>
          )}
        </Bubble>
      )}
    </>
  );
}
