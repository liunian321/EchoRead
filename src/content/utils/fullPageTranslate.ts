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
  "button",
  "a",
]);

// 跳过翻译的 ARIA role
const SKIP_ROLES = new Set([
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

const styleCache = new Map<HTMLElement, CSSStyleDeclaration>();

function getCachedStyle(el: HTMLElement): CSSStyleDeclaration {
  if (styleCache.has(el)) return styleCache.get(el)!;
  const style = window.getComputedStyle(el);
  styleCache.set(el, style);
  return style;
}

function isBlockElement(el: HTMLElement): boolean {
  if (INLINE_TAGS.has(el.tagName.toLowerCase())) return false;
  // 核心语义标签默认视为块级，跳过昂贵的样式查寻
  if (PARAGRAPH_TAGS.has(el.tagName.toLowerCase())) return true;

  const display = getCachedStyle(el).display;
  return (
    display === "block" ||
    display === "flex" ||
    display === "grid" ||
    display === "list-item" ||
    display === "table-cell"
  );
}

function isElementVisible(el: HTMLElement) {
  const style = getCachedStyle(el);
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

  if (parent.closest("select")) return false;

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

  const isSmallAction =
    el.tagName.toLowerCase() === "button" || el.tagName.toLowerCase() === "a";
  if (!isSmallAction && wordCount < 2 && cjkCount < 3) return false;

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

/**
 * 优化后的扫描策略：
 * 1. 首先通过 querySelectorAll 获取所有可能的语义容器 (Paragraph Tags)。
 * 2. 对这些容器进行可见性、Processed 状态及有效性过滤。
 * 3. 只有在语义容器不足或网页结构特殊时，才回退到 TreeWalker 扫描。
 */
function collectTranslatableBlocks(rootNode: Node, viewportOnly: boolean) {
  const blocks = new Set<HTMLElement>();
  const containerSelector = Array.from(PARAGRAPH_TAGS).join(",");
  const rootElement =
    rootNode.nodeType === Node.ELEMENT_NODE
      ? (rootNode as HTMLElement)
      : document.body;

  // 1. 快速扫描已知语义标签
  const candidates = rootElement.querySelectorAll(containerSelector);
  for (const el of Array.from(candidates) as HTMLElement[]) {
    if (el.hasAttribute(PROCESSED_ATTR)) continue;
    if (hasProcessedAncestor(el)) continue;
    if (!isElementVisible(el)) continue;
    if (!isTranslatableBlock(el)) continue;

    if (viewportOnly) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight * 1.5) continue;
    }
    blocks.add(el);
  }

  // 2. 对于不在语义标签内的孤立文本块，使用 TreeWalker 补充（仅限根扫描时，避免过深遍历）
  if (blocks.size < 5) {
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        isTranslatableNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP,
    });

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      const parent = findParagraphRoot(currentNode);
      if (!parent || blocks.has(parent)) continue;
      if (parent.hasAttribute(PROCESSED_ATTR) || hasProcessedAncestor(parent))
        continue;
      if (!isElementVisible(parent) || !isTranslatableBlock(parent)) continue;

      if (viewportOnly) {
        const rect = parent.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight * 1.5) continue;
      }
      blocks.add(parent);
    }
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
  }
  .row {
    margin: 2px 0 0;
    padding: 0;
    font-size: 0.92em;
    line-height: inherit;
    color: inherit;
    opacity: 0.8;
    word-break: break-word;
    box-sizing: border-box;
    animation: echoFadeIn 0.3s ease-out;
  }
  .row.error {
    color: #dc2626;
    opacity: 1;
    cursor: help;
    border-left-color: #dc2626;
  }
  .retry-btn {
    display: inline;
    margin-left: 4px;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    font-size: inherit;
    text-decoration: underline;
    cursor: pointer;
    opacity: 0.8;
  }
  .retry-btn:hover { opacity: 1; }
  @keyframes echoFadeIn {
    from { opacity: 0; transform: translateY(2px); }
  }
`;

type TranslationRow = {
  setText: (text: string) => void;
  setCompleted: () => void;
  setError: (message: string, detail: string, onRetry: () => void) => void;
  host: HTMLElement;
};

/** 检测元素是否有受限的 overflow（hidden + 显式高度），不适合内部追加子元素 */
function hasConstrainedOverflow(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY || style.overflow;
  if (overflowY !== "hidden" && overflowY !== "clip") return false;
  const height = style.height;
  return height !== "auto" && height !== "" && parseFloat(height) > 0;
}

/**
 * 创建翻译结果行并插入到合适位置。
 * 插入策略：
 * - 默认追加到 anchor 内部（避免成为 flex/grid 容器的新 item）
 * - anchor 自身是 flex/grid 容器时回退为 sibling（避免挤压原文）
 * - anchor 有受限 overflow 时回退为 sibling 插入
 * 插入后检测上下文，对 flex/grid 布局应用安全样式。
 */
function createTranslationRow(anchor: HTMLElement): TranslationRow {
  const shadowHost = document.createElement("div");
  shadowHost.className = HOST_CLASS;

  // anchor 自身是 flex/grid 容器时，内部插入会让 shadowHost 成为 flex item，
  // 与原文内容并排导致布局破坏（如文字被挤成竖排单字）
  const anchorTagName = anchor.tagName.toLowerCase();
  const anchorDisplay = window.getComputedStyle(anchor).display;
  const anchorIsFlex =
    anchorDisplay.includes("flex") || anchorDisplay.includes("grid");

  // 对于按钮，强烈建议插入内部以保持单一按钮身份
  const isButton = anchorTagName === "button";
  const insertInside =
    (isButton || !anchorIsFlex) && !hasConstrainedOverflow(anchor);

  if (insertInside) {
    anchor.appendChild(shadowHost);
  } else if (anchor.nextSibling) {
    anchor.parentNode!.insertBefore(shadowHost, anchor.nextSibling);
  } else {
    anchor.parentNode!.appendChild(shadowHost);
  }

  // 对 flex/grid 布局上下文应用安全布局样式
  const hostParent = shadowHost.parentElement;
  if (hostParent) {
    const parentDisplay = window.getComputedStyle(hostParent).display;
    if (parentDisplay.includes("flex") || parentDisplay.includes("grid")) {
      Object.assign(shadowHost.style, {
        width: "100%",
        flexBasis: "100%",
        flexShrink: "0",
        order: "99999",
        minWidth: "0",
      });
    }
  }

  // 继承父元素的文本样式
  Object.assign(shadowHost.style, {
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
    lineHeight: "inherit",
    textAlign: "inherit",
  });

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
  try {
    await runAllSettledWithConcurrency(tasks, mergedSettings.concurrency);
  } finally {
    styleCache.clear();
  }
}
