import { translatePageContent } from "./fullPageTranslate";
import { debounce } from "./index";

type AutoTranslationObserverOptions = {
  enableScroll?: boolean;
  viewportBatchSize?: number;
  mutationBatchSize?: number;
};

let observer: MutationObserver | null = null;
let scrollListener: ((this: Window, ev: Event) => void) | null = null;
let isObserving = false;
let isTranslating = false;
let pendingTask: (() => Promise<void>) | null = null;

function hasValidRuntime() {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function enqueueTranslation(task: () => Promise<void>) {
  if (isTranslating) {
    pendingTask = task;
    return;
  }
  isTranslating = true;
  task()
    .catch(console.error)
    .finally(() => {
      isTranslating = false;
      if (pendingTask) {
        const nextTask = pendingTask;
        pendingTask = null;
        enqueueTranslation(nextTask);
      }
    });
}

export function startAutoTranslationObserver(options: AutoTranslationObserverOptions = {}) {
  if (isObserving) return;
  const enableScroll = options.enableScroll !== false;
  const viewportBatchSize = Math.max(1, options.viewportBatchSize || 30);
  const mutationBatchSize = Math.max(1, options.mutationBatchSize || 20);

  const pendingNodes = new Set<Node>();

  const handleMutations = debounce(() => {
    if (!hasValidRuntime()) {
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

    enqueueTranslation(() =>
      translatePageContent({
        batchSize: mutationBatchSize,
        rootNode: root,
        viewportOnly: true,
      }),
    );
  }, 1000);

  observer = new MutationObserver((mutations) => {
    let hasSignificantAddition = false;
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
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

  if (enableScroll) {
    const handleScroll = debounce(() => {
      if (!hasValidRuntime()) {
        stopAutoTranslationObserver();
        return;
      }
      enqueueTranslation(() =>
        translatePageContent({
          batchSize: viewportBatchSize,
          rootNode: document.body,
          viewportOnly: true,
        }),
      );
    }, 350);
    scrollListener = function onScroll() {
      handleScroll();
    };
    window.addEventListener("scroll", scrollListener, { passive: true });
  }

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  isObserving = true;
  console.log("EchoRead: Auto-translation observer started.");
}

export function stopAutoTranslationObserver() {
  pendingTask = null;
  isTranslating = false;
  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener);
    scrollListener = null;
  }
  if (observer) {
    observer.disconnect();
    observer = null;
    isObserving = false;
    console.log("EchoRead: Auto-translation observer stopped.");
  }
}
