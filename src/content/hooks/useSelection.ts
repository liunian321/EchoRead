import { useState, useEffect } from "preact/hooks";
import { getSelectionRect, debounce, isInputActive } from "../utils";
import { SelectionData } from "../types";

export function useSelection() {
  const [selection, setSelection] = useState<SelectionData | null>(null);

  useEffect(() => {
    // Function to calculate and update selection state
    const updateSelection = () => {
      if (isInputActive()) {
        setSelection(null);
        return;
      }

      const rect = getSelectionRect();
      const text = window.getSelection()?.toString().trim();

      if (text && rect) {
        // We use viewport coordinates for fixed positioning
        setSelection({
          text,
          rect,
          position: {
            x: rect.right,
            y: rect.bottom,
          },
        });
      } else {
        setSelection(null);
      }
    };

    // Debounced version for selection changes (dragging)
    const debouncedUpdate = debounce(updateSelection, 300);

    const onSelectionChange = () => {
      debouncedUpdate();
    };

    const onMouseUp = () => {
      // Immediate update on mouseup to respond quickly after drag ends
      // setTimeout ensures we run after the current event loop (and potentially after click events)
      setTimeout(updateSelection, 0);
    };

    const onMouseDown = () => {
      // Clear selection immediately when user starts clicking/dragging elsewhere
      setSelection(null);
    };

    const onScroll = () => {
      // Optional: hide or update position on scroll.
      // For now, hiding is safer to avoid detached bubbles.
      // or we can just let it stay if it's fixed, but it might look weird if text moves.
      if (selection) {
        setSelection(null);
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });

    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("scroll", onScroll);
    };
  }, [selection]);

  return selection;
}
