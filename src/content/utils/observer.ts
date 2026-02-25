import { translatePageContent } from "./fullPageTranslate";
import { debounce } from "./index";

let observer: MutationObserver | null = null;
let isObserving = false;

/**
 * Initializes a mutation observer to watch for new content dynamically added to the page (e.g. infinite scrolling)
 * and triggers translation batching automatically.
 */
export function startAutoTranslationObserver() {
  if (isObserving) return;

  const pendingNodes = new Set<Node>();

  const handleMutations = debounce(() => {
    if (pendingNodes.size === 0) return;
    const nodesToProcess = Array.from(pendingNodes);
    pendingNodes.clear();

    // Only fetch a small batch to test dynamic injection continuously
    for (const node of nodesToProcess) {
      if (document.body.contains(node)) {
        translatePageContent(5, node).catch(console.error);
      }
    }
  }, 1000);

  observer = new MutationObserver((mutations) => {
    let hasSignificantAddition = false;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // Skip our own injected nodes and React/Vue internal text nodes
          if (
            !el.classList?.contains("echo-read-bilingual") &&
            !el.classList?.contains("echo-read-inline-spinner") &&
            el.id !== "echoread-extension-root"
          ) {
            pendingNodes.add(node);
            hasSignificantAddition = true;
          }
        }
      });
    }

    if (hasSignificantAddition) {
      handleMutations();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  isObserving = true;
  console.log("EchoRead: Auto-translation observer started.");
}

export function stopAutoTranslationObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
    isObserving = false;
    console.log("EchoRead: Auto-translation observer stopped.");
  }
}
