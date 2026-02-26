import { useState, useEffect, useRef } from "preact/hooks";
import { getSelectionRect, debounce, isInputActive } from "../utils";
import { SelectionData } from "../types";

type SelectionConfig = {
  triggerMode: "none" | "alt" | "ctrl" | "shift";
  domainBlacklist: string[];
  selectionTranslate: boolean;
};

export function useSelection() {
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const selectionRef = useRef<SelectionData | null>(null);
  const lastPointerEvent = useRef<MouseEvent | null>(null);
  const modifierState = useRef({ alt: false, ctrl: false, shift: false });
  const configRef = useRef<SelectionConfig>({
    triggerMode: "none",
    domainBlacklist: [],
    selectionTranslate: true,
  });

  // Keep ref in sync with state for use in event handlers
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  // Load config once on mount and keep it updated via storage change listener
  useEffect(() => {
    chrome.storage.sync.get(
      ["triggerMode", "domainBlacklist", "selectionTranslate"],
      (data) => {
        configRef.current = {
          triggerMode:
            (data.triggerMode as SelectionConfig["triggerMode"]) || "none",
          domainBlacklist: Array.isArray(data.domainBlacklist)
            ? data.domainBlacklist
            : [],
          selectionTranslate: data.selectionTranslate !== false,
        };
      },
    );

    const handleChange: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, area) => {
      if (area !== "sync") return;
      if (changes.triggerMode?.newValue !== undefined) {
        configRef.current.triggerMode =
          (changes.triggerMode.newValue as SelectionConfig["triggerMode"]) ||
          "none";
      }
      if (changes.domainBlacklist?.newValue !== undefined) {
        configRef.current.domainBlacklist = Array.isArray(
          changes.domainBlacklist.newValue,
        )
          ? changes.domainBlacklist.newValue
          : [];
      }
      if (changes.selectionTranslate?.newValue !== undefined) {
        configRef.current.selectionTranslate =
          changes.selectionTranslate.newValue !== false;
      }
    };
    chrome.storage.onChanged.addListener(handleChange);
    return () => chrome.storage.onChanged.removeListener(handleChange);
  }, []);

  // Register event listeners once (no dependency on selection)
  useEffect(() => {
    const updateSelection = (e?: MouseEvent) => {
      if (isInputActive()) {
        setSelection(null);
        return;
      }

      const config = configRef.current;

      if (!config.selectionTranslate) {
        setSelection(null);
        return;
      }

      const hostname = window.location.hostname;
      const isBlacklisted = config.domainBlacklist.some(
        (d: string) => hostname === d || hostname.endsWith(`.${d}`),
      );
      if (isBlacklisted) {
        setSelection(null);
        return;
      }

      if (config.triggerMode !== "none") {
        const altKey = e?.altKey ?? modifierState.current.alt;
        const ctrlKey = e?.ctrlKey ?? modifierState.current.ctrl;
        const shiftKey = e?.shiftKey ?? modifierState.current.shift;
        const metaKey = e?.metaKey ?? false;
        if (config.triggerMode === "alt" && !altKey) return;
        if (config.triggerMode === "ctrl" && !ctrlKey && !metaKey) return;
        if (config.triggerMode === "shift" && !shiftKey) return;
      }

      const rect = getSelectionRect();
      const text = window.getSelection()?.toString().trim();

      if (text && rect) {
        setSelection((prev) => {
          if (
            prev &&
            prev.text === text &&
            prev.rect.x === rect.x &&
            prev.rect.y === rect.y &&
            prev.rect.width === rect.width &&
            prev.rect.height === rect.height
          ) {
            return prev;
          }
          return {
            text,
            rect,
            position: {
              x: rect.right,
              y: rect.bottom,
            },
          };
        });
      } else {
        setSelection(null);
      }
    };

    // Debounced version for selection changes (dragging)
    const debouncedUpdate = debounce(
      () => updateSelection(lastPointerEvent.current || undefined),
      300,
    );

    const onSelectionChange = () => {
      debouncedUpdate();
    };

    const onMouseUp = (e: MouseEvent) => {
      lastPointerEvent.current = e;
      // Immediate update on mouseup to respond quickly after drag ends
      // setTimeout ensures we run after the current event loop (and potentially after click events)
      setTimeout(() => {
        const path = e.composedPath();
        const isClickOnApp = path.some(
          (node) =>
            node instanceof HTMLElement &&
            node.id === "echoread-extension-root",
        );
        // Do not re-evaluate selection if the user clicked inside our own UI.
        if (isClickOnApp) return;

        updateSelection(e);
      }, 0);
    };

    const onMouseDown = (e: MouseEvent) => {
      lastPointerEvent.current = e;
      // Clear selection immediately when user starts clicking/dragging elsewhere
      const path = e.composedPath();
      const isClickOnApp = path.some(
        (node) =>
          node instanceof HTMLElement && node.id === "echoread-extension-root",
      );
      if (!isClickOnApp) {
        setSelection(null);
      }
    };

    const onScroll = () => {
      // Use ref instead of closure to avoid stale capture
      if (selectionRef.current) {
        setSelection(null);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      modifierState.current = {
        alt: e.altKey,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      };
    };

    const onKeyUp = (e: KeyboardEvent) => {
      modifierState.current = {
        alt: e.altKey,
        ctrl: e.ctrlKey || e.metaKey,
        shift: e.shiftKey,
      };
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("scroll", onScroll);
    };
  }, []);

  return selection;
}
