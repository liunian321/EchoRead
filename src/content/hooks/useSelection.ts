import { useState, useEffect, useRef } from "preact/hooks";
import { getSelectionRect, debounce, isInputActive } from "../utils";
import { SelectionData } from "../types";

export function useSelection() {
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const lastPointerEvent = useRef<MouseEvent | null>(null);
  const modifierState = useRef({ alt: false, ctrl: false, shift: false });

  useEffect(() => {
    // Function to calculate and update selection state
    const updateSelection = (e?: MouseEvent) => {
      if (isInputActive()) {
        setSelection(null);
        return;
      }

      chrome.storage.sync.get(
        ["triggerMode", "domainBlacklist", "selectionTranslate"],
        (config) => {
          if (config.selectionTranslate === false) {
            setSelection(null);
            return;
          }

          const hostname = window.location.hostname;
          const blacklist: string[] = Array.isArray(config.domainBlacklist)
            ? config.domainBlacklist
            : [];
          const isBlacklisted = blacklist.some(
            (d: string) => hostname === d || hostname.endsWith(`.${d}`),
          );

          if (isBlacklisted) {
            setSelection(null);
            return;
          }

          const triggerMode = config.triggerMode || "none";
          if (triggerMode !== "none") {
            // If a modifier is required, we can only safely evaluate it when we have a mouse event
            const altKey = e?.altKey ?? modifierState.current.alt;
            const ctrlKey = e?.ctrlKey ?? modifierState.current.ctrl;
            const shiftKey = e?.shiftKey ?? modifierState.current.shift;
            const metaKey = e?.metaKey ?? false;
            if (triggerMode === "alt" && !altKey) return;
            if (triggerMode === "ctrl" && !ctrlKey && !metaKey) return;
            if (triggerMode === "shift" && !shiftKey) return;
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
        },
      );
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
        // It might accidentally clear the selection if the browser collapsed it.
        if (isClickOnApp) return;

        updateSelection(e);
      }, 0);
    };

    const onMouseDown = (e: MouseEvent) => {
      lastPointerEvent.current = e;
      // Clear selection immediately when user starts clicking/dragging elsewhere
      // Wait, we should not clear if the click is on our own injected shadow DOM.
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
      // Optional: hide or update position on scroll.
      // For now, hiding is safer to avoid detached bubbles.
      // or we can just let it stay if it's fixed, but it might look weird if text moves.
      if (selection) {
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
  }, [selection]);

  return selection;
}
