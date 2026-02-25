import { h, ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

interface BubbleProps {
  x: number;
  y: number;
  visible: boolean;
  children: ComponentChildren;
  style?: h.JSX.CSSProperties;
}

export function Bubble({ x, y, visible, children, style: customStyle }: BubbleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: y, left: x });

  useEffect(() => {
    if (ref.current && visible) {
      const rect = ref.current.getBoundingClientRect();
      let top = y + 10;
      let left = x;

      // Prevent overflow right
      if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width - 20;
      }

      // Prevent overflow bottom
      if (top + rect.height > window.innerHeight) {
        // If bottom overflow, show above selection
        // We need height of selection, but we only have bottom y.
        // Assuming we want to flip, we would need the top of selection.
        // For simplicity, just shift up.
        top = window.innerHeight - rect.height - 20;
      }

      setCoords({ top, left });
    } else {
        // Reset to input coordinates when becoming visible or moving
        setCoords({ top: y + 10, left: x });
    }
  }, [x, y, visible]);

  const style = {
    position: "fixed" as const,
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    zIndex: 2147483647,
    background: "rgba(30, 30, 30, 0.8)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius: "12px",
    padding: "16px",
    color: "#fff",
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
    transition: "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), top 0.1s ease, left 0.1s ease",
    pointerEvents: visible ? "auto" as const : "none" as const,
    maxWidth: "360px",
    minWidth: "auto",
    fontSize: "14px",
    lineHeight: "1.5",
    ...customStyle,
  };

  return (
    <div ref={ref} style={style} className="echo-read-bubble">
      {children}
    </div>
  );
}
