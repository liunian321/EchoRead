import { useRef, useEffect, useState, useCallback } from "preact/hooks";

interface Position {
  x: number;
  y: number;
}

/**
 * Drag threshold in pixels – pointer must move more than this to count
 * as a drag rather than a click.
 */
const DRAG_THRESHOLD = 4;

export function useDragging(
  initialPosition: Position,
  onDragEnd?: (pos: Position) => void,
) {
  const [position, setPosition] = useState(initialPosition);
  const dragOffset = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  /**
   * Track whether the *most recent* pointer-down→pointer-up sequence was a
   * drag (pointer moved beyond threshold).
   *
   * Event order: pointerdown → pointermove → pointerup → click
   *
   * We keep `moved` set to `true` through the `click` handler so the
   * consumer can suppress clicks that followed a drag.  The reset to
   * `false` is deferred via `requestAnimationFrame` so it only takes
   * effect on the *next* interaction.
   */
  const moved = useRef(false);
  const resetTimer = useRef(0);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      // Cancel any pending reset so a fast re-press doesn't race
      if (resetTimer.current) {
        cancelAnimationFrame(resetTimer.current);
        resetTimer.current = 0;
      }
      dragging.current = true;
      moved.current = false;
      startPos.current = { x: event.clientX, y: event.clientY };
      dragOffset.current = {
        x: event.clientX - position.x,
        y: event.clientY - position.y,
      };
    },
    [position],
  );

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragging.current) return;

      const nextX = event.clientX - dragOffset.current.x;
      const nextY = event.clientY - dragOffset.current.y;

      // Clamp within viewport
      const margin = 8;
      const clampedX = Math.min(
        window.innerWidth - 60 - margin,
        Math.max(margin, nextX),
      );
      const clampedY = Math.min(
        window.innerHeight - 60 - margin,
        Math.max(margin, nextY),
      );

      // Use distance from the initial pointer-down position so the
      // threshold is independent of the current element position.
      const dx = event.clientX - startPos.current.x;
      const dy = event.clientY - startPos.current.y;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        moved.current = true;
      }
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleUp = () => {
      if (!dragging.current) return;
      const wasDrag = moved.current;
      dragging.current = false;

      if (onDragEnd && wasDrag) onDragEnd(position);

      // Defer the `moved` reset so the forthcoming `click` event (which
      // fires synchronously right after `pointerup`) can still read the
      // `true` value and suppress the click.  The reset happens on the
      // next animation frame – well before any new user interaction.
      resetTimer.current = requestAnimationFrame(() => {
        moved.current = false;
        resetTimer.current = 0;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [position, onDragEnd]);

  /**
   * Returns `true` if the most recent pointer-down→pointer-up was a drag.
   * Call this inside event handlers (e.g. onClick) to get the **live** value
   * rather than a stale render-time snapshot.
   */
  const wasRecentDrag = useCallback(() => moved.current, []);

  return {
    position,
    setPosition,
    onPointerDown,
    isDragging: dragging.current,
    hasMoved: moved.current, // kept for backward compat (render snapshot)
    wasRecentDrag, // ← preferred: call inside event handlers
  };
}
