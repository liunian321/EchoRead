import { streamTranslateText } from "../services/api";
import {
  clamp,
  retryWithBackoff,
  runAllSettledWithConcurrency,
  withTimeout,
} from "./translationQueue";

// 完全跳过的标签
const IGNORE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "code",
  "pre",
  "svg",
  "math",
  "canvas",
  "video",
  "audio",
  "iframe",
  "object",
  "embed",
  "img",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "nav",
  "header",
  "footer",
]);

// 内联标签：跳过，继续向上查找段落根
const INLINE_TAGS = new Set([
  "a",
  "span",
  "strong",
  "b",
  "i",
  "em",
  "mark",
  "small",
  "del",
  "ins",
  "sub",
  "sup",
  "label",
  "abbr",
  "cite",
  "q",
  "time",
  "data",
  "var",
  "samp",
  "kbd",
]);

// 语义段落标签：天然的翻译单元边界
const PARAGRAPH_TAGS = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "td",
  "th",
  "blockquote",
  "figcaption",
  "dt",
  "dd",
]);

// 跳过翻译的 ARIA role
const SKIP_ROLES = new Set([
  "button",
  "navigation",
  "banner",
  "toolbar",
  "tablist",
  "tab",
  "menubar",
  "menu",
  "menuitem",
  "search",
  "complementary",
  "contentinfo",
  "img",
  "separator",
]);

// 通用 block 元素作为段落根的最低文本长度
const MIN_PARAGRAPH_TEXT = 20;

const MIN_TEXT_LENGTH = 2;
const PROCESSED_ATTR = "data-echo-read-id";
const HOST_CLASS = "echo-read-bilingual";
const SPINNER_CLASS = "echo-read-inline-spinner";
let nextBlockId = 1;

type TranslateOptions = {
  batchSize?: number;
  rootNode?: Node;
  concurrency?: number;
  timeoutMs?: number;
  viewportOnly?: boolean;
};

type PageSettings = {
  concurrency: number;
  timeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  domainBlacklist: string[];
};

// ── Settings ──

async function loadPageSettings(): Promise<PageSettings> {
  const data = await chrome.storage.sync.get([
    "translationConcurrency",
    "translationTimeoutMs",
    "domainBlacklist",
  ]);
  return {
    concurrency: clamp(Number(data.translationConcurrency || 3), 1, 10),
    timeoutMs: clamp(Number(data.translationTimeoutMs || 30000), 5000, 60000),
    retryCount: 3,
    retryDelayMs: 1000,
    domainBlacklist: (data.domainBlacklist || []) as string[],
  };
}

function isDomainBlocked(host: string, blacklist: string[]) {
  const normalized = host.toLowerCase();
  return blacklist.some((entry) => {
    const candidate = entry.trim().toLowerCase();
    if (!candidate) return false;
    return normalized === candidate || normalized.endsWith(`.${candidate}`);
  });
}

// ── DOM Utilities ──

function isBlockElement(el: HTMLElement): boolean {
  if (INLINE_TAGS.has(el.tagName.toLowerCase())) return false;
  const display = window.getComputedStyle(el).display;
  return (
    display === "block" ||
    display === "flex" ||
    display === "grid" ||
    display === "list-item" ||
    display === "table-cell"
  );
}

function isElementVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isTranslatableNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return false;
  if (parent.closest("[contenteditable='true'], input, textarea")) return false;
  if (parent.closest(`.${HOST_CLASS}`)) return false;
  if (parent.closest("#echoread-extension-root")) return false;

  const tag = parent.tagName.toLowerCase();
  if (IGNORE_TAGS.has(tag)) return false;

  const roleAncestor = parent.closest("[role]");
  if (roleAncestor) {
    const role = roleAncestor.getAttribute("role")?.toLowerCase() || "";
    if (SKIP_ROLES.has(role)) return false;
  }

  if (parent.closest("button, nav, header, footer, select")) return false;

  const text = node.textContent?.trim() || "";
  return text.length >= 2;
}

function isTranslatableBlock(el: HTMLElement): boolean {
  const text = (el.textContent || "").trim();
  if (text.length < MIN_TEXT_LENGTH) return false;

  const wordCount = text.split(/\s+/).filter((w) => w.length > 1).length;
  const cjkCount = (
    text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []
  ).length;
  if (wordCount < 2 && cjkCount < 3) return false;

  if (/^https?:\/\/\S+$/.test(text)) return false;

  const alphaOrCjk = (
    text.match(/[a-zA-Z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []
  ).length;
  if (text.length > 5 && alphaOrCjk / text.length < 0.3) return false;

  return true;
}

/**
 * 从文本节点向上查找段落根元素。
 * 优先选择语义标签（p/h1-h6/li/td），
 * 通用 block 元素需满足最低文本量才作为段落根，
 * 避免 flex 布局下每个小 div 被当作独立段落。
 */
function findParagraphRoot(node: Node): HTMLElement | null {
  let el = node.parentElement;
  let depth = 0;
  const MAX_DEPTH = 8;

  while (el && el !== document.body && depth < MAX_DEPTH) {
    const tag = el.tagName.toLowerCase();

    // 语义段落标签，理想的翻译边界
    if (PARAGRAPH_TAGS.has(tag)) return el;

    // 通用 block 元素：只有文本量足够才作为段落根
    if (isBlockElement(el)) {
      const textLen = (el.textContent || "").trim().length;
      if (textLen >= MIN_PARAGRAPH_TEXT) return el;
    }

    el = el.parentElement;
    depth++;
  }

  // 未找到合适段落根
  return null;
}

function hasProcessedAncestor(el: HTMLElement): boolean {
  let current = el.parentElement;
  while (current && current !== document.body) {
    if (current.hasAttribute(PROCESSED_ATTR)) return true;
    current = current.parentElement;
  }
  return false;
}

function collectTranslatableBlocks(rootNode: Node, viewportOnly: boolean) {
  const blocks = new Set<HTMLElement>();
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      isTranslatableNode(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP,
  });

  let currentNode: Node | null;
  while ((currentNode = walker.nextNode())) {
    const parent = findParagraphRoot(currentNode);
    if (!parent) continue;
    if (parent.hasAttribute(PROCESSED_ATTR)) continue;
    if (hasProcessedAncestor(parent)) continue;
    if (!isElementVisible(parent)) continue;
    if (!isTranslatableBlock(parent)) continue;
    if (viewportOnly) {
      const rect = parent.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight * 1.5) continue;
    }
    blocks.add(parent);
  }

  return Array.from(blocks);
}

// ── Inline Spinner（内联在原文旁边） ──

let spinnerKeyframesReady = false;

function ensureSpinnerKeyframes() {
  if (spinnerKeyframesReady) return;
  const style = document.createElement("style");
  style.id = "echo-read-spinner-kf";
  style.textContent = `@keyframes echoReadInlineSpin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  spinnerKeyframesReady = true;
}

function createInlineSpinner(anchor: HTMLElement): HTMLSpanElement {
  ensureSpinnerKeyframes();
  const s = document.createElement("span");
  s.className = SPINNER_CLASS;
  Object.assign(s.style, {
    display: "inline-block",
    width: "11px",
    height: "11px",
    marginLeft: "5px",
    border: "1.5px solid rgba(107,114,128,0.2)",
    borderTopColor: "#6b7280",
    borderRadius: "50%",
    animation: "echoReadInlineSpin 0.6s linear infinite",
    verticalAlign: "middle",
    flexShrink: "0",
  });
  anchor.appendChild(s);
  return s;
}

// ── Translation Result Row（Shadow DOM 隔离） ──

const SHADOW_STYLES = `
  :host {
    display: block;
    all: initial;
    font-family: inherit;
  }
  .row {
    margin: 2px 0;
    font-size: 0.92em;
    line-height: 1.6;
    color: #6b7280;
    word-break: break-word;
    box-sizing: border-box;
  }
  .row.error { color: #dc2626; cursor: help; }
  .retry-btn {
    display: inline;
    margin-left: 4px;
    padding: 0;
    border: none;
    background: none;
    color: #6b7280;
    font-size: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .retry-btn:hover { color: #374151; }
`;

type TranslationRow = {
  setText: (text: string) => void;
  setCompleted: () => void;
  setError: (message: string, detail: string, onRetry: () => void) => void;
  host: HTMLElement;
};

function createTranslationRow(anchor: HTMLElement): TranslationRow {
  const shadowHost = document.createElement("div");
  shadowHost.className = HOST_CLASS;
  if (anchor.nextSibling) {
    anchor.parentNode!.insertBefore(shadowHost, anchor.nextSibling);
  } else {
    anchor.parentNode!.appendChild(shadowHost);
  }

  const shadow = shadowHost.attachShadow({ mode: "open" });
  const styleEl = document.createElement("style");
  styleEl.textContent = SHADOW_STYLES;
  shadow.appendChild(styleEl);

  const row = document.createElement("div");
  row.className = "row";
  shadow.appendChild(row);

  return {
    setText(text: string) {
      row.textContent = text;
    },
    setCompleted() {
      // no-op, row stays with final text
    },
    setError(message: string, detail: string, onRetry: () => void) {
      row.classList.add("error");
      row.title = detail;
      row.textContent = `⚠ ${message} `;
      const btn = document.createElement("button");
      btn.className = "retry-btn";
      btn.textContent = "重试";
      btn.onclick = (e) => {
        e.stopPropagation();
        row.classList.remove("error");
        row.title = "";
        row.textContent = "翻译中...";
        btn.remove();
        onRetry();
      };
      row.appendChild(btn);
    },
    host: shadowHost,
  };
}

// ── Block Translation ──

async function translateBlock(
  element: HTMLElement,
  settings: PageSettings,
): Promise<void> {
  const blockId = String(nextBlockId++);
  element.setAttribute(PROCESSED_ATTR, blockId);

  const text = (element.innerText || element.textContent || "").trim();
  if (text.length < MIN_TEXT_LENGTH) return;

  // Phase 1: 内联 spinner 显示在原文旁边
  const inlineSpinner = createInlineSpinner(element);
  let translationRow: TranslationRow | null = null;
  let latestTranslation = "";

  /** 延迟创建翻译行：首次收到翻译文本时才创建 */
  const ensureRow = (): TranslationRow => {
    if (!translationRow) {
      inlineSpinner.remove();
      translationRow = createTranslationRow(element);
    }
    return translationRow;
  };

  const runTranslation = async () => {
    let ignore = false;

    const task = () =>
      withTimeout(
        streamTranslateText(text, (data) => {
          if (ignore) return;
          latestTranslation = data.translation;
          ensureRow().setText(data.translation);
        }),
        settings.timeoutMs,
        () => {
          ignore = true;
        },
      );

    try {
      await retryWithBackoff(task, settings.retryCount, settings.retryDelayMs);
      const row = ensureRow();
      row.setText(latestTranslation || "（无翻译结果）");
      row.setCompleted();
    } catch (error) {
      // 确保 spinner 被移除
      inlineSpinner.remove();
      const raw = error instanceof Error ? error.message : String(error);
      const message =
        raw === "Translation timeout"
          ? "翻译超时"
          : raw.includes("429")
            ? "请求过于频繁"
            : "翻译失败";
      ensureRow().setError(
        latestTranslation ? `${latestTranslation} [${message}]` : message,
        raw,
        () => {
          latestTranslation = "";
          runTranslation().catch(() => {});
        },
      );
    }
  };

  await runTranslation();
}

// ── Public API ──

export async function translatePageContent(
  batchSizeOrOptions: number | TranslateOptions = 10,
  rootNode: Node = document.body,
) {
  const options =
    typeof batchSizeOrOptions === "number"
      ? { batchSize: batchSizeOrOptions, rootNode }
      : { batchSize: 10, rootNode: document.body, ...batchSizeOrOptions };

  const settings = await loadPageSettings();
  if (isDomainBlocked(location.hostname, settings.domainBlacklist)) return;

  const targets = collectTranslatableBlocks(
    options.rootNode || document.body,
    options.viewportOnly !== false,
  ).slice(0, options.batchSize || 10);

  const concurrency = options.concurrency || settings.concurrency;
  const timeoutMs = options.timeoutMs || settings.timeoutMs;
  const mergedSettings = { ...settings, concurrency, timeoutMs };

  console.info(
    `EchoRead: translating ${targets.length} blocks (concurrency: ${concurrency})`,
  );
  const tasks = targets.map((el) => () => translateBlock(el, mergedSettings));
  await runAllSettledWithConcurrency(tasks, mergedSettings.concurrency);
}
