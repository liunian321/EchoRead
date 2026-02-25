import { h, ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface BubbleProps {
  x: number;
  y: number;
  rect?: DOMRect;
  visible: boolean;
  mode?: "icon" | "result";
  children: ComponentChildren;
  style?: h.JSX.CSSProperties;
}

export function Bubble({
  x,
  y,
  rect,
  visible,
  mode = "icon",
  children,
  style: customStyle,
}: BubbleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: y + 10, left: x });

  useEffect(() => {
    if (!visible) {
      setCoords({ top: y + 10, left: x });
      return;
    }

    const updatePosition = () => {
      if (!ref.current) return;
      const bubbleRect = ref.current.getBoundingClientRect();
      const margin = 12;

      let top = y + margin;
      let left = x;

      // Prevent overflow right & left
      if (left + bubbleRect.width > window.innerWidth - margin) {
        left = window.innerWidth - bubbleRect.width - margin;
      }
      if (left < margin) {
        left = margin;
      }

      // Prevent overflow bottom
      if (top + bubbleRect.height > window.innerHeight - margin) {
        // If bottom overflow, show above selection
        if (rect) {
          top = rect.top - bubbleRect.height - margin;
        } else {
          top = window.innerHeight - bubbleRect.height - margin;
        }
      }

      // Prevent overflow top (if it didn't fit above either)
      if (top < margin) {
        top = margin;
      }

      setCoords({ top, left });
    };

    updatePosition();

    // Observe size changes to adjust position dynamically (e.g. icon -> result mode)
    const observer = new ResizeObserver(() => {
      updatePosition();
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [x, y, visible, rect, mode]); // Depend on mode to immediately trigger position check

  const style = {
    position: "fixed" as const,
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    zIndex: 2147483647,
    background: "rgba(28, 28, 30, 0.72)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    borderRadius: "18px",
    padding: mode === "icon" ? "0" : "16px",
    color: "#f5f5f7",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', sans-serif",
    boxShadow:
      "0 12px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    opacity: visible ? 1 : 0,
    transform: visible
      ? "translateY(0) scale(1)"
      : "translateY(12px) scale(0.92)",
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    pointerEvents: visible ? ("auto" as const) : ("none" as const),
    maxWidth: "380px",
    minWidth: "auto",
    fontSize: "14px",
    lineHeight: "1.5",
    overflow: "hidden",
    ...customStyle,
  };

  return (
    <div ref={ref} style={style} className="echo-read-bubble">
      {children}
    </div>
  );
}
