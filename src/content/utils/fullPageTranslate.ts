import { streamTranslateText } from "../services/api";
import {
  findContentZones,
  isInsideContentZone,
  isUIText,
  isButtonLike,
  hasAdjacentIcon,
  isActionBar,
} from "./contentZone";
import {
  clamp,
  retryWithBackoff,
  runAllSettledWithConcurrency,
  withTimeout,
} from "./translationQueue";

/**
 * 检测扩展上下文是否仍然有效。
 * 扩展被重新加载/更新后，旧 content script 的 chrome API 会失效，
 * 调用时会抛出 "Extension context invalidated" 错误。
 */
function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

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
// 注意：不包含 `a`、`button`、`article`、`section` 等容器级标签。
// 容器级标签会把整个 feed/文章作为一个翻译单元，粒度太粗。
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
  "caption",
]);

// 语义段落标签的 CSS 选择器（预计算避免重复构建）
const PARAGRAPH_SELECTOR = Array.from(PARAGRAPH_TAGS).join(",");

// 跳过的容器标签 — 这些是导航/工具栏/页脚区域，不含正文内容
const SKIP_TAGS = new Set(["nav", "header", "footer", "aside", "menu"]);

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
  "button",
  "group",
]);

// 通用 block 元素作为段落根的最低文本长度
const MIN_PARAGRAPH_TEXT = 40;

const MIN_TEXT_LENGTH = 4;
const MAX_TEXT_LENGTH = 5000; // 超过此长度的块跳过，避免 API token 超限
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
  if (!isExtensionContextValid()) {
    // 上下文已失效，返回默认值（调用方会提前退出）
    return {
      concurrency: 3,
      timeoutMs: 30000,
      retryCount: 3,
      retryDelayMs: 1000,
      domainBlacklist: [],
    };
  }
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

  // 跳过按钮和可点击控件
  if (isButtonLike(parent)) return false;

  // 检查所有上层 role 祖先
  let roleEl: Element | null = parent.closest("[role]");
  while (roleEl) {
    const role = roleEl.getAttribute("role")?.toLowerCase() || "";
    if (SKIP_ROLES.has(role)) return false;
    roleEl = roleEl.parentElement?.closest("[role]") || null;
  }

  // 跳过导航/工具栏等区域
  if (parent.closest("nav, header, footer, aside, menu")) return false;
  if (parent.closest("select")) return false;

  const text = node.textContent?.trim() || "";
  if (text.length < MIN_TEXT_LENGTH) return false;

  // 跳过 UI 短文本（时间戳、计数器、操作按钮文字）
  if (isUIText(text)) return false;

  return true;
}

function isTranslatableBlock(el: HTMLElement): boolean {
  const text = (el.textContent || "").trim();
  if (text.length < MIN_TEXT_LENGTH) return false;
  if (text.length > MAX_TEXT_LENGTH) return false;

  // 跳过导航/工具栏区域
  if (el.closest("nav, header, footer, aside, menu")) return false;

  // ── 元素级 UI 检测 ──

  // 跳过按钮和可点击控件
  if (isButtonLike(el)) return false;

  // 跳过操作栏（投票/评论/分享栏等）
  if (isActionBar(el)) return false;

  // 跳过面积过小的元素（UI 图标/标签）
  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0 && rect.width * rect.height < 800)
    return false;

  // 跳过 UI 短文本模式（时间戳、计数器、用户名等）
  if (isUIText(text)) return false;

  // 跳过紧邻图标的短文本（"Share" 旁边有分享图标）
  if (text.length < 30 && hasAdjacentIcon(el)) return false;

  // ── 文本质量检测（单次遍历统计字符类型） ──

  const wordCount = text.split(/\s+/).filter((w) => w.length > 1).length;
  let cjkCount = 0,
    alphaCount = 0,
    kanaCount = 0,
    hangulCount = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x4e00 && code <= 0x9fff) cjkCount++;
    else if (code >= 0x3040 && code <= 0x30ff) {
      cjkCount++;
      kanaCount++;
    } else if (code >= 0xac00 && code <= 0xd7af) {
      cjkCount++;
      hangulCount++;
    } else if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a))
      alphaCount++;
  }
  const alphaOrCjk = alphaCount + cjkCount;

  // 至少 3 个单词或 4 个 CJK 字符
  if (wordCount < 3 && cjkCount < 4) return false;

  // 跳过纯 URL
  if (/^https?:\/\/\S+$/.test(text)) return false;

  // 跳过以数字/符号为主的内容
  const strippedNumbers = text
    .replace(/[\d,.\s\u4e07\u4ebf\u5343\u767eKkMm]+/g, "")
    .trim();
  if (strippedNumbers.length < 6) return false;

  // 文字占比太低
  if (text.length > 5 && alphaOrCjk / text.length < 0.3) return false;

  // 跳过已经是目标语言（中文）的文本（CJK 占比 > 70%）
  // 但如果含有日文假名（平假名/片假名）或韩文谚文，说明不是中文，不应跳过
  if (
    kanaCount === 0 &&
    hangulCount === 0 &&
    cjkCount > 0 &&
    cjkCount / text.length > 0.7
  )
    return false;

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

    // 跳过导航/工具栏等非内容区域
    if (SKIP_TAGS.has(tag)) return null;

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
 * 三阶段扫描策略（内容区域感知版）：
 *
 * Phase 0: 内容区域检测 — 用文本密度+链接密度找到页面的正文区域，
 *          一次性排除整个侧边栏/导航/页脚。灵感来自 Mozilla Readability。
 *
 * Phase 1: 在内容区域内扫描语义段落标签。
 * Phase 2: TreeWalker 补充扫描非语义标签内的内容。
 * Phase 3: 去重。
 */
function collectTranslatableBlocks(rootNode: Node, viewportOnly: boolean) {
  const blocks = new Set<HTMLElement>();
  const rootElement =
    rootNode.nodeType === Node.ELEMENT_NODE
      ? (rootNode as HTMLElement)
      : document.body;

  // Phase 0: 内容区域检测
  const contentZones = findContentZones(rootElement);

  // Phase 1: 在内容区域内扫描语义标签
  const candidates = rootElement.querySelectorAll(PARAGRAPH_SELECTOR);
  for (const el of Array.from(candidates) as HTMLElement[]) {
    if (el.hasAttribute(PROCESSED_ATTR)) continue;
    if (hasProcessedAncestor(el)) continue;
    if (!isInsideContentZone(el, contentZones)) continue;
    if (!isElementVisible(el)) continue;
    if (!isTranslatableBlock(el)) continue;

    if (viewportOnly) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight * 1.5) continue;
    }
    blocks.add(el);
  }

  // Phase 2: TreeWalker 补充扫描
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
    if (!isInsideContentZone(parent, contentZones)) continue;
    if (parent.hasAttribute(PROCESSED_ATTR) || hasProcessedAncestor(parent))
      continue;
    if (!isElementVisible(parent) || !isTranslatableBlock(parent)) continue;

    if (viewportOnly) {
      const rect = parent.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight * 1.5) continue;
    }
    blocks.add(parent);
  }

  // Phase 3: 去重
  const deduped = Array.from(blocks).filter((el) => {
    let ancestor = el.parentElement;
    while (ancestor && ancestor !== document.body) {
      if (blocks.has(ancestor)) return false;
      ancestor = ancestor.parentElement;
    }
    return true;
  });

  styleCache.clear();

  return deduped;
}

// ── Inline Spinner（内联在原文旁边） ──

function ensureSpinnerKeyframes() {
  if (document.getElementById("echo-read-spinner-kf")) return;
  const style = document.createElement("style");
  style.id = "echo-read-spinner-kf";
  style.textContent = `@keyframes echoReadInlineSpin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
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
    position: relative;
    clear: both;
    z-index: 0;
  }
  .row {
    margin: 4px 0 0;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    font-style: inherit;
    line-height: inherit;
    letter-spacing: inherit;
    word-spacing: inherit;
    text-align: inherit;
    color: inherit;
    opacity: 0.88;
    word-break: break-word;
    box-sizing: border-box;
    animation: echoFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .row.error {
    color: #ff453a;
    opacity: 1;
    cursor: help;
  }
  .retry-btn {
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    padding: 2px 8px;
    border: none;
    background: rgba(128, 128, 128, 0.12);
    color: inherit;
    font-size: 0.85em;
    font-weight: 550;
    text-decoration: none;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s ease;
  }
  .retry-btn:hover {
    background: rgba(128, 128, 128, 0.22);
  }
  @keyframes echoFadeIn {
    from { opacity: 0; transform: translateY(3px); }
    to   { opacity: 0.88; transform: translateY(0); }
  }
`;

type TranslationRow = {
  setText: (text: string) => void;
  setCompleted: () => void;
  setError: (message: string, detail: string, onRetry: () => void) => void;
  host: HTMLElement;
};

/** 检测元素是否有受限布局，不适合内部追加子元素 */
function hasConstrainedLayout(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);

  // 1) overflow: hidden/clip + 显式高度
  const overflowY = style.overflowY || style.overflow;
  if (overflowY === "hidden" || overflowY === "clip") {
    const height = style.height;
    if (height !== "auto" && height !== "" && parseFloat(height) > 0)
      return true;
  }

  // 2) max-height 限制
  const maxHeight = style.maxHeight;
  if (
    maxHeight &&
    maxHeight !== "none" &&
    maxHeight !== "0px" &&
    parseFloat(maxHeight) > 0
  ) {
    return true;
  }

  // 3) -webkit-line-clamp（截断多行文字时常用）
  const lineClamp = style.getPropertyValue("-webkit-line-clamp");
  if (lineClamp && lineClamp !== "none" && lineClamp !== "unset") {
    return true;
  }

  // 4) absolute/fixed 定位的元素，内部追加会导致重叠
  const position = style.position;
  if (position === "absolute" || position === "fixed") {
    return true;
  }

  return false;
}

/**
 * 解除元素上阻止子元素展开的 CSS 约束。
 * 在插入内部翻译行之前调用，确保翻译文本能正常撑开容器。
 */
function removeLayoutConstraints(el: HTMLElement) {
  const style = window.getComputedStyle(el);

  // 解除 -webkit-line-clamp（常见于 Reddit 等卡片式布局）
  const lineClamp = style.getPropertyValue("-webkit-line-clamp");
  if (lineClamp && lineClamp !== "none" && lineClamp !== "unset") {
    el.style.setProperty("-webkit-line-clamp", "unset", "important");
    // line-clamp 依赖 display: -webkit-box + -webkit-box-orient，一并解除
    if (style.display === "-webkit-box") {
      el.style.setProperty("display", "block", "important");
    }
  }

  // 解除 max-height
  const maxHeight = style.maxHeight;
  if (maxHeight && maxHeight !== "none" && parseFloat(maxHeight) > 0) {
    el.style.setProperty("max-height", "none", "important");
  }

  // 解除 overflow: hidden/clip（在有显式高度的情况下）
  const overflowY = style.overflowY || style.overflow;
  if (overflowY === "hidden" || overflowY === "clip") {
    const height = style.height;
    if (height !== "auto" && height !== "" && parseFloat(height) > 0) {
      el.style.setProperty("overflow", "visible", "important");
    }
  }
}

/**
 * 创建翻译结果行并插入到合适位置。
 *
 * 插入策略（综合考虑三种场景）：
 *
 * 1. 父容器是 flex/grid → 必须插入 **内部**
 *    因为 sibling 会成为新的 flex item，与原文卡片并排显示。
 *    同时调用 removeLayoutConstraints 解除 anchor 的高度/裁剪约束，
 *    确保翻译行能正常撑开容器。
 *
 * 2. 父容器非 flex/grid + anchor 有受限布局 → 插入为 **sibling**
 *    避免翻译被 overflow:hidden / max-height / line-clamp 裁剪。
 *
 * 3. 其他情况 → 插入 **内部**（最自然、不影响外部布局）
 */
function createTranslationRow(anchor: HTMLElement): TranslationRow {
  const shadowHost = document.createElement("div");
  shadowHost.className = HOST_CLASS;

  const anchorDisplay = window.getComputedStyle(anchor).display;
  const anchorIsFlex =
    anchorDisplay.includes("flex") || anchorDisplay.includes("grid");

  // 检查父容器是否为 flex/grid
  const parentEl = anchor.parentElement;
  const parentIsFlex = parentEl
    ? (() => {
        const d = window.getComputedStyle(parentEl).display;
        return d.includes("flex") || d.includes("grid");
      })()
    : false;

  let insertInside: boolean;

  if (parentIsFlex) {
    // 父容器是 flex/grid — sibling 会变成新 flex item 导致并排
    // 必须插入内部，同时解除 anchor 上的约束让译文能展开
    insertInside = true;
    if (hasConstrainedLayout(anchor)) {
      removeLayoutConstraints(anchor);
    }
  } else if (anchorIsFlex || hasConstrainedLayout(anchor)) {
    // anchor 自身是 flex 容器 或 有约束 — 插入内部会挤压/被裁剪
    insertInside = false;
  } else {
    // 普通 block 元素，插入内部最安全
    insertInside = true;
  }

  if (insertInside) {
    anchor.appendChild(shadowHost);
  } else {
    // ── sibling 插入 ──
    if (anchor.nextSibling) {
      anchor.parentNode!.insertBefore(shadowHost, anchor.nextSibling);
    } else {
      anchor.parentNode!.appendChild(shadowHost);
    }
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

  // 继承父元素的文本样式（穿透 Shadow DOM 边界）
  Object.assign(shadowHost.style, {
    fontSize: "inherit",
    fontFamily: "inherit",
    fontWeight: "inherit",
    fontStyle: "inherit",
    lineHeight: "inherit",
    textAlign: "inherit",
    color: "inherit",
    letterSpacing: "inherit",
    wordSpacing: "inherit",
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
): Promise<boolean> {
  const blockId = String(nextBlockId++);
  element.setAttribute(PROCESSED_ATTR, blockId);

  // 用 textContent 代替 innerText 避免触发布局重排
  const text = (element.textContent || "").trim();
  if (text.length < MIN_TEXT_LENGTH) return true; // skip counts as success

  // Phase 1: 内联 spinner 显示在原文旁边
  const inlineSpinner = createInlineSpinner(element);
  let translationRow: TranslationRow | null = null;
  let latestTranslation = "";
  let success = true;

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
      success = true;
    } catch (error) {
      success = false;
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
  return success;
}

// ── Error Notification ──

function showTranslationError(message: string) {
  document.getElementById("echo-read-error-toast")?.remove();
  const host = document.createElement("div");
  host.id = "echo-read-error-toast";
  Object.assign(host.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%) translateY(-10px)",
    zIndex: "2147483647",
    padding: "12px 24px",
    borderRadius: "12px",
    background: "rgba(30, 30, 32, 0.92)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    color: "#ff453a",
    fontSize: "14px",
    fontWeight: "500",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    boxShadow:
      "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(255, 255, 255, 0.08)",
    opacity: "0",
    transition:
      "opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
    pointerEvents: "none",
    lineHeight: "1.4",
    maxWidth: "480px",
    textAlign: "center",
  });
  host.textContent = message;
  document.body.appendChild(host);

  // Animate in
  requestAnimationFrame(() => {
    host.style.opacity = "1";
    host.style.transform = "translateX(-50%) translateY(0)";
  });

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    host.style.opacity = "0";
    host.style.transform = "translateX(-50%) translateY(-10px)";
    setTimeout(() => host.remove(), 350);
  }, 4000);
}

// ── Public API ──

// Module-level AbortController for cancellation support
let currentAbortController: AbortController | null = null;

/**
 * Cancel any in-progress full-page translation.
 * Safe to call even when no translation is running.
 */
export function cancelPageTranslation(): void {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    console.info("EchoRead: full page translation cancelled by user");
  }
}

export async function translatePageContent(
  batchSizeOrOptions: number | TranslateOptions = 10,
  rootNode: Node = document.body,
) {
  // 扩展上下文失效时静默退出，避免报错
  if (!isExtensionContextValid()) return;

  const options =
    typeof batchSizeOrOptions === "number"
      ? { batchSize: batchSizeOrOptions, rootNode }
      : { batchSize: 10, rootNode: document.body, ...batchSizeOrOptions };

  const settings = await loadPageSettings();
  if (isDomainBlocked(location.hostname, settings.domainBlacklist)) return;

  // Cancel any previous in-flight translation
  if (currentAbortController) {
    currentAbortController.abort();
  }
  const abortController = new AbortController();
  currentAbortController = abortController;

  const targets = collectTranslatableBlocks(
    options.rootNode || document.body,
    options.viewportOnly !== false,
  ).slice(0, options.batchSize || 10);

  if (targets.length === 0) {
    console.info("EchoRead: no translatable blocks found on this page");
    showTranslationError(
      "未找到可翻译的内容（页面可能已是目标语言，或内容太少）",
    );
    currentAbortController = null;
    return;
  }

  const concurrency = options.concurrency || settings.concurrency;
  const timeoutMs = options.timeoutMs || settings.timeoutMs;
  const mergedSettings = { ...settings, concurrency, timeoutMs };

  console.info(
    `EchoRead: translating ${targets.length} blocks (concurrency: ${concurrency})`,
  );

  const cleanup = () => {
    styleCache.clear();
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }
  };

  try {
    // ── Probe: translate the first block with 0 retries to quickly detect API issues ──
    const probeSettings = { ...mergedSettings, retryCount: 0 };
    const probeSuccess = await translateBlock(targets[0], probeSettings);

    if (!probeSuccess) {
      // First request failed — API is likely misconfigured or unavailable.
      // Stop immediately and notify the user.
      console.warn(
        "EchoRead: probe translation failed, skipping remaining blocks",
      );
      showTranslationError(
        "⚠ 翻译服务连接失败，已跳过后续翻译。请检查 API 配置。",
      );
      return;
    }

    // Check if cancelled during probe
    if (abortController.signal.aborted) return;

    // ── Translate remaining blocks with full concurrency + retries ──
    const remaining = targets.slice(1);
    if (remaining.length > 0) {
      const tasks = remaining.map(
        (el) => () => translateBlock(el, mergedSettings),
      );
      await runAllSettledWithConcurrency(tasks, mergedSettings.concurrency, {
        signal: abortController.signal,
      });
    }
  } finally {
    cleanup();
  }
}
