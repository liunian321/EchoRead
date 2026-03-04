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

const BUBBLE_CSS = `
  @keyframes echoReadBubbleIn {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.92);
      filter: blur(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
      filter: blur(0);
    }
  }
  @keyframes echoReadBubbleOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }
`;

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

      // Prevent overflow bottom → show above selection
      if (top + bubbleRect.height > window.innerHeight - margin) {
        if (rect) {
          top = rect.top - bubbleRect.height - margin;
        } else {
          top = window.innerHeight - bubbleRect.height - margin;
        }
      }

      // Prevent overflow top
      if (top < margin) {
        top = margin;
      }

      setCoords({ top, left });
    };

    updatePosition();

    const observer = new ResizeObserver(() => updatePosition());
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [x, y, visible, rect, mode]);

  const isIcon = mode === "icon";

  const style: h.JSX.CSSProperties = {
    position: "fixed",
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    zIndex: 2147483647,

    /* Apple Glass Morphism */
    background: isIcon ? "rgba(44, 44, 46, 0.85)" : "rgba(28, 28, 30, 0.78)",
    backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",

    /* Generous Apple rounding */
    borderRadius: isIcon ? "50%" : "20px",
    padding: isIcon ? "0" : "18px",

    /* Text */
    color: "#f5f5f7",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Inter', system-ui, sans-serif",
    fontSize: "14px",
    lineHeight: "1.55",
    letterSpacing: "-0.01em",

    /* Shadow — multi-layered Apple depth */
    boxShadow: [
      "0 24px 80px rgba(0, 0, 0, 0.25)",
      "0 8px 24px rgba(0, 0, 0, 0.15)",
      "0 2px 6px rgba(0, 0, 0, 0.1)",
      "inset 0 0 0 0.5px rgba(255, 255, 255, 0.12)",
    ].join(", "),

    border: "0.5px solid rgba(255, 255, 255, 0.08)",

    /* Animation */
    animation: visible
      ? "echoReadBubbleIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both"
      : "echoReadBubbleOut 0.2s ease-in both",
    pointerEvents: visible ? "auto" : "none",

    maxWidth: isIcon ? "unset" : "420px",
    minWidth: "auto",
    overflow: "hidden",
    ...customStyle,
  };

  return (
    <>
      <style>{BUBBLE_CSS}</style>
      <div ref={ref} style={style} className="echo-read-bubble">
        {children}
      </div>
    </>
  );
}
