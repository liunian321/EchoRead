import { useRef, useEffect, useState } from "preact/hooks";

interface Position {
  x: number;
  y: number;
}

export function useDragging(
  initialPosition: Position,
  onDragEnd?: (pos: Position) => void,
) {
  const [position, setPosition] = useState(initialPosition);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const moved = useRef(false);

  const onPointerDown = (event: PointerEvent) => {
    dragging.current = true;
    moved.current = false;
    dragOffset.current = {
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    };
  };

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

      if (
        Math.abs(clampedX - position.x) > 2 ||
        Math.abs(clampedY - position.y) > 2
      ) {
        moved.current = true;
      }
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (onDragEnd && moved.current) onDragEnd(position);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [position, onDragEnd]);

  return {
    position,
    setPosition,
    onPointerDown,
    isDragging: dragging.current,
    hasMoved: moved.current,
  };
}
