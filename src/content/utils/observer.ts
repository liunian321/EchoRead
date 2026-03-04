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
    // 扩展上下文失效时自动停止观察
    try {
      if (!chrome.runtime?.id) {
        stopAutoTranslationObserver();
        return;
      }
    } catch {
      stopAutoTranslationObserver();
      return;
    }

    if (pendingNodes.size === 0) return;
    const nodes = Array.from(pendingNodes).filter((n) =>
      document.body.contains(n),
    );
    pendingNodes.clear();
    if (nodes.length === 0) return;

    // Find the common ancestor to issue a single translatePageContent call
    // instead of one per node — prevents API rate limiting blow-up
    let root: Node = nodes[0];
    for (let i = 1; i < nodes.length; i++) {
      while (root && !root.contains(nodes[i])) {
        root = root.parentNode || document.body;
      }
    }
    if (!root || root === document) root = document.body;

    translatePageContent({
      batchSize: 20,
      rootNode: root,
      viewportOnly: true,
    }).catch(console.error);
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
