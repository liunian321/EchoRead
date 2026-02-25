import { render } from "preact";
import { App } from "./App";

/**
 * Entry point for Content Script.
 * Encapsulates the App in Shadow DOM.
 */

const ECHO_READ_ROOT_ID = "echoread-extension-root";

function init() {
  // Check if already exists (e.g. re-injection)
  if (document.getElementById(ECHO_READ_ROOT_ID)) return;

  const root = document.createElement("div");
  root.id = ECHO_READ_ROOT_ID;

  // Ensure the container doesn't affect page layout
  Object.assign(root.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "0",
    height: "0",
    zIndex: "2147483647",
    pointerEvents: "none", // Let events pass through the container
  });

  document.documentElement.appendChild(root);

  // Create Shadow DOM
  const shadow = root.attachShadow({ mode: "open" });

  // Create mount point inside Shadow DOM
  const mountPoint = document.createElement("div");

  // Reset styles for the mount point to ensure consistent rendering
  mountPoint.style.all = "initial";
  // Re-enable pointer events for the app container
  mountPoint.style.pointerEvents = "auto";
  mountPoint.style.fontFamily = "system-ui, -apple-system, sans-serif";

  shadow.appendChild(mountPoint);

  render(<App />, mountPoint);
}

// Initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
