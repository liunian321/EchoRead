import { useState, useEffect, useRef } from "preact/hooks";
import { useSelection } from "./hooks/useSelection";
import { useTranslate } from "./hooks/useTranslate";
import { useShortcut } from "./hooks/useShortcut";
import { translatePageContent } from "./utils/fullPageTranslate";
import { Bubble } from "./components/Bubble";
import { Skeleton } from "./components/Skeleton";
import { TranslationResult } from "./components/TranslationResult";
import { StorageConfig } from "./types";

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
    size: 44,
    iconStyle: "outline",
    selectionTranslate: true,
  });
  const [floatPosition, setFloatPosition] = useState({
    x: window.innerWidth - 72,
    y: window.innerHeight - 160,
  });
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const moved = useRef(false);
  const floatButtonRef = useRef<HTMLButtonElement>(null);

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
      console.info("EchoRead: full page translate start");
      await translatePageContent({
        batchSize: Number.MAX_SAFE_INTEGER,
        viewportOnly: false,
      });
      import("./utils/observer")
        .then((m) => m.startAutoTranslationObserver())
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
          size: Number(data.floatingButtonSize || 44),
          iconStyle:
            (data.floatingButtonIconStyle as "solid" | "outline") || "outline",
          selectionTranslate: data.selectionTranslate !== false,
        });
        if (data.floatingButtonPosition?.x !== undefined) {
          setFloatPosition({
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
            ? Number(changes.floatingButtonSize.newValue || 44)
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

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const buttonWidth =
        floatButtonRef.current?.offsetWidth || floatConfig.size;
      const buttonHeight =
        floatButtonRef.current?.offsetHeight || floatConfig.size;
      const nextX = clampPosition(
        event.clientX - dragOffset.current.x,
        buttonWidth,
        window.innerWidth,
      );
      const nextY = clampPosition(
        event.clientY - dragOffset.current.y,
        buttonHeight,
        window.innerHeight,
      );
      if (
        Math.abs(nextX - floatPosition.x) > 2 ||
        Math.abs(nextY - floatPosition.y) > 2
      ) {
        moved.current = true;
      }
      setFloatPosition({ x: nextX, y: nextY });
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      chrome.storage.sync.set({ floatingButtonPosition: floatPosition });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [floatPosition, floatConfig.size]);

  const onFloatPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    dragging.current = true;
    moved.current = false;
    dragOffset.current = {
      x: event.clientX - floatPosition.x,
      y: event.clientY - floatPosition.y,
    };
  };

  const onFloatClick = () => {
    if (moved.current || dragging.current) return;
    handleFullPageTranslate();
  };

  const showBubble = selection && floatConfig.selectionTranslate;

  const floatingStyles = `
    @keyframes echoReadSpin { to { transform: rotate(360deg); } }
  `;

  return (
    <>
      <style>{floatingStyles}</style>
      {floatConfig.enabled && (
        <button
          ref={floatButtonRef}
          onPointerDown={(e) => onFloatPointerDown(e)}
          onClick={onFloatClick}
          style={{
            position: "fixed",
            left: `${floatPosition.x}px`,
            top: `${floatPosition.y}px`,
            height: `${floatConfig.size}px`,
            minWidth: `${floatConfig.size}px`,
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            zIndex: 2147483647,
            opacity: floatConfig.opacity,
            background:
              floatConfig.iconStyle === "solid"
                ? "linear-gradient(135deg, #0ea5e9, #6366f1)"
                : "rgba(15, 23, 42, 0.78)",
            boxShadow:
              floatConfig.iconStyle === "solid"
                ? "0 6px 18px rgba(79,70,229,0.35)"
                : "0 6px 18px rgba(15,23,42,0.35)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "0 14px",
            color: "#fff",
            pointerEvents: "auto",
            backdropFilter: "blur(16px) saturate(160%)",
            fontSize: "13px",
            fontWeight: "600",
            lineHeight: "1",
            whiteSpace: "nowrap",
          }}
          title="拖拽移动，点击翻译"
        >
          {isFullPageTranslating ? (
            <>
              <div
                style={{
                  width: `${Math.max(12, floatConfig.size / 3)}px`,
                  height: `${Math.max(12, floatConfig.size / 3)}px`,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "#fff",
                  animation: "echoReadSpin 0.8s linear infinite",
                }}
              />
              <span>翻译中</span>
            </>
          ) : (
            <>
              {floatConfig.iconStyle === "solid" ? (
                <svg
                  width={Math.max(16, floatConfig.size / 2)}
                  height={Math.max(16, floatConfig.size / 2)}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4 4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V4z" />
                  <path
                    d="M7 8h8M7 12h5M7 16h8"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  width={Math.max(16, floatConfig.size / 2)}
                  height={Math.max(16, floatConfig.size / 2)}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 8l6 6" />
                  <path d="M4 14l4-4 4 4" />
                  <path d="M2 5h12" />
                  <path d="M7 2h1" />
                  <path d="M22 22l-5-5" />
                  <path d="M14 10a10 10 0 1 0 0 20" />
                  <path d="M17 17l4 4" />
                </svg>
              )}
              <span>翻译网页</span>
            </>
          )}
        </button>
      )}
      {showBubble && selection && (
        <Bubble
          x={selection.position.x}
          y={selection.position.y}
          rect={selection.rect}
          visible={!!selection}
          mode={mode}
          style={
            mode === "result"
              ? { minWidth: "300px" }
              : {
                  padding: "8px",
                  borderRadius: "50%",
                  minWidth: "unset",
                  width: "40px",
                  height: "40px",
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
                background: "linear-gradient(135deg, #0071e3, #00d2ff)",
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
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 4px 12px rgba(0, 113, 227, 0.4)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1.1)";
                (e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform =
                  "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.filter =
                  "brightness(1)";
              }}
              title="点击翻译"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 8l6 6" />
                <path d="M4 14l4-4 4 4" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="M22 22l-5-5" />
                <path d="M14 10a10 10 0 1 0 0 20" />
                <path d="M17 17l4 4" />
              </svg>
            </button>
          ) : (
            <div style={{ width: "100%" }}>
              {isLoading && <Skeleton />}
              {error && (
                <div
                  style={{
                    color: "#ff5252",
                    fontSize: "14px",
                    padding: "8px 0",
                  }}
                >
                  <p style={{ margin: "0 0 8px 0" }}>{error}</p>
                  <button
                    onClick={handleTranslate}
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "none",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "500",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.25)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.15)";
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

function clampPosition(value: number, size: number, maxSize: number) {
  const margin = 8;
  return Math.min(maxSize - size - margin, Math.max(margin, value));
}
