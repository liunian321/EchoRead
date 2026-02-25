import { translateText } from "../services/api";

/**
 * Basic implementation of "Immersion Translation".
 * Scans visible block elements and appends translation below them.
 */
export async function translatePageContent() {
  // Select common text block elements
  const blocks = document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, td, blockquote");

  // Filter for valid targets
  const targets = Array.from(blocks).filter(el => {
    // Avoid double translation
    if (el.getAttribute("data-echo-read-processed")) return false;

    // Ignore small or empty text
    const text = el.textContent?.trim();
    if (!text || text.length < 10) return false;

    // Ignore invisible elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    // Check if within or near viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) return false;

    // Ignore if it contains too many child elements (likely a container, not a text block)
    // Heuristic: if it has other block children, skip
    if (el.querySelector("p, div, section, article")) return false;

    return true;
  });

  // Process a batch (limit to avoid freezing UI)
  const batch = targets.slice(0, 15);

  for (const el of batch) {
    el.setAttribute("data-echo-read-processed", "true");
    const text = el.textContent?.trim() || "";

    try {
      // Show a placeholder or loading state?
      // For now, just wait and append.
      const res = await translateText(text);

      const transEl = document.createElement("div");
      transEl.className = "echo-read-inline-translation";
      // Apply inline styles to avoid external CSS dependency for injected content
      Object.assign(transEl.style, {
        color: "#5f6368",
        fontSize: "0.9em",
        marginTop: "4px",
        marginBottom: "8px",
        padding: "4px 8px",
        backgroundColor: "rgba(0,0,0,0.03)",
        borderRadius: "4px",
        borderLeft: "3px solid #4CAF50",
        fontFamily: "system-ui, -apple-system, sans-serif",
        lineHeight: "1.5",
        pointerEvents: "none" // Don't interfere with clicks
      });
      transEl.textContent = res.translation;

      el.appendChild(transEl);
    } catch (e) {
      console.error("EchoRead: Failed to translate block", e);
    }
  }
}
