/**
 * Content Zone Detection — Readability 算法精华版
 *
 * 核心思想：不逐元素判断"这该不该翻译"，
 * 而是先找到页面的"内容区域"，只在内容区域内翻译。
 *
 * 原理（来自 Mozilla Readability，Firefox 阅读模式已验证 15+ 年）：
 * - 文本密度 = 纯文本长度 / innerHTML 长度
 *   → 正文 > 0.5（大段纯文字），UI < 0.2（大量 HTML 标签嵌套）
 * - 链接密度 = <a> 内文字 / 总文字
 *   → 导航栏 > 0.5（全是链接），正文 < 0.3
 *
 * 这两个指标是"物理规律"级别的 — 任何网站都成立。
 * 纯数学计算，零依赖，微秒级性能。
 */

const IGNORE_ZONE_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "video",
  "audio",
  "iframe",
  "img",
]);

const SKIP_ZONE_TAGS = new Set(["nav", "header", "footer", "aside", "menu"]);

/** 正文类名/ID 关键词（加分） */
const CONTENT_HINTS =
  /article|content|post|entry|story|text|body|main|comment|description|paragraph|message|thread|discussion|detail/i;

/** UI 类名/ID 关键词（减分） */
const UI_HINTS =
  /sidebar|widget|nav|menu|toolbar|header|footer|social|share|action|vote|karma|flair|badge|tag-?list|meta|ad-?|banner|promo|related|trending|recommend|signup|login|modal|popup|tooltip|dropdown|breadcrumb|pagination/i;

/**
 * 计算一个容器的"内容得分"。
 * 正分 = 像内容区域，负分 = 像 UI 区域。
 */
function scoreContainer(el: HTMLElement): number {
  const text = (el.textContent || "").trim();
  const innerHTML = el.innerHTML;
  if (text.length < 25) return -10;

  let score = 0;

  // ── 文本密度（最强信号） ──
  const textDensity = text.length / Math.max(innerHTML.length, 1);
  if (textDensity > 0.5) score += 30;
  else if (textDensity > 0.3) score += 15;
  else if (textDensity < 0.1) score -= 20;

  // ── 链接密度（第二强信号） ──
  const links = el.querySelectorAll("a");
  const linkTextLen = Array.from(links).reduce(
    (sum, a) => sum + (a.textContent?.length || 0),
    0,
  );
  const linkDensity = linkTextLen / Math.max(text.length, 1);
  if (linkDensity > 0.6) score -= 40;
  else if (linkDensity > 0.4) score -= 20;
  else if (linkDensity < 0.1) score += 15;

  // ── 段落计数 ──
  const pCount = el.querySelectorAll("p").length;
  score += Math.min(pCount, 5) * 8;

  // ── 标点符号（自然语言标志） ──
  const punctuation = (text.match(/[,，、。.;；!！?？]/g) || []).length;
  score += Math.min(punctuation, 10) * 3;

  // ── 文本长度 ──
  if (text.length > 200) score += 20;
  else if (text.length > 80) score += 10;

  // ── class/id 语义 ──
  const classId = `${el.className || ""} ${el.id || ""}`;
  if (CONTENT_HINTS.test(classId)) score += 25;
  if (UI_HINTS.test(classId)) score -= 30;

  // ── HTML 语义标签 ──
  const tag = el.tagName.toLowerCase();
  if (tag === "article" || tag === "main") score += 30;
  if (tag === "section") score += 10;
  if (tag === "aside") score -= 30;

  return score;
}

/**
 * 找到页面中的"内容区域"。
 *
 * 策略：
 * 1. 直接识别 `<main>`, `<article>`, `[role=main]`
 * 2. 对 body 直接子元素和第二层子元素做内容评分
 * 3. 得分 > 20 的标记为内容区域
 * 4. 没找到任何区域时回退到 body（不阻止翻译）
 *
 * 返回一组内容区域元素。后续只扫描这些区域内的文本。
 */
export function findContentZones(root: HTMLElement): Set<HTMLElement> {
  const zones = new Set<HTMLElement>();

  // 1) 语义容器直接识别
  const semanticContainers = root.querySelectorAll(
    "main, article, [role='main'], [role='article']",
  );
  for (const el of Array.from(semanticContainers) as HTMLElement[]) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if ((el.textContent || "").trim().length > 40) {
      zones.add(el);
    }
  }

  // 2) 对主要区块评分（body → children → grandchildren）
  const candidates: HTMLElement[] = [];
  for (const child of Array.from(root.children) as HTMLElement[]) {
    if (!child.tagName) continue;
    const tag = child.tagName.toLowerCase();
    if (IGNORE_ZONE_TAGS.has(tag) || SKIP_ZONE_TAGS.has(tag)) continue;
    const rect = child.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    candidates.push(child);
    // 也分析第二层
    for (const gc of Array.from(child.children) as HTMLElement[]) {
      if (!gc.tagName) continue;
      const gtag = gc.tagName.toLowerCase();
      if (IGNORE_ZONE_TAGS.has(gtag) || SKIP_ZONE_TAGS.has(gtag)) continue;
      const gr = gc.getBoundingClientRect();
      if (gr.width === 0 || gr.height === 0) continue;
      candidates.push(gc);
    }
  }

  for (const el of candidates) {
    if (zones.has(el)) continue;
    // 跳过已被语义容器覆盖的
    let covered = false;
    for (const zone of zones) {
      if (zone.contains(el) || el.contains(zone)) {
        covered = true;
        break;
      }
    }
    if (covered) continue;

    const score = scoreContainer(el);
    if (score > 20) {
      zones.add(el);
    }
  }

  // 3) 回退：没找到任何内容区域 → 用 root
  if (zones.size === 0) {
    zones.add(root);
  }

  return zones;
}

/**
 * 检查元素是否位于某个内容区域内。
 */
export function isInsideContentZone(
  el: HTMLElement,
  zones: Set<HTMLElement>,
): boolean {
  for (const zone of zones) {
    if (zone.contains(el)) return true;
  }
  return false;
}

// ── Element-level UI filters ──
// 这些在内容区域内部进一步过滤掉 UI 碎片

/** UI 短文本模式 — 时间戳、计数器、用户名、操作按钮文字 */
const UI_TEXT_PATTERNS = [
  /^\d+[KkMm]?$/, // "57", "1.2K"
  /^\d+(\.\d+)?[KkMm]?\s*(votes?|comments?|replies|views?|likes?|shares?|upvotes?|downvotes?|points?)$/i,
  /^\d+\s*[hmd]\s*(ago)?$/i, // "2h ago", "3d"
  /^\d{1,2}:\d{2}(:\d{2})?$/, // "12:30"
  /^@[\w.-]+$/, // "@username"
  /^[rvu]\/[\w.-]+$/i, // "r/subreddit"
  /^(share|reply|save|report|hide|block|follow|subscribe|like|award|more|menu|edit|delete|copy|pin|bookmark|repost|retweet|quote|upvote|downvote|crosspost|log\s*in|sign\s*up)$/i,
  /^(分享|回复|保存|举报|隐藏|屏蔽|关注|订阅|点赞|编辑|删除|复制|收藏|转发|登录|注册|查看|展开|收起)$/,
  /^\d+\s*(hr|min|sec|hours?|minutes?|seconds?|days?|weeks?|months?|years?)\s*(ago)?$/i,
];

/** 检测文本是否匹配 UI 短文本模式 */
export function isUIText(text: string): boolean {
  const t = text.trim();
  if (t.length > 40) return false; // 长文本不可能是 UI 单词
  return UI_TEXT_PATTERNS.some((p) => p.test(t));
}

/** 检测元素是否是按钮或可点击控件 */
export function isButtonLike(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === "button") return true;
  if (el.getAttribute("role") === "button") return true;
  // 短链接（≤ 3 个单词）视为 UI 控件
  if (tag === "a") {
    const text = (el.textContent || "").trim();
    if (text.length < 30 && text.split(/\s+/).length <= 3) return true;
  }
  return false;
}

/** 检测元素旁边是否有图标 */
export function hasAdjacentIcon(el: HTMLElement): boolean {
  if (
    el.querySelector(
      "svg, img[width], i[class*='icon'], span[class*='icon'], [data-icon]",
    )
  )
    return true;
  const prev = el.previousElementSibling;
  if (
    prev &&
    (prev.tagName === "SVG" ||
      prev.tagName === "IMG" ||
      prev.querySelector?.("svg"))
  )
    return true;
  return false;
}

/**
 * 检测元素是否是"操作栏"（投票/评论/分享栏等）。
 * 特征：子元素多，但每个子元素文字很少。
 */
export function isActionBar(el: HTMLElement): boolean {
  const children = el.children.length;
  if (children < 2) return false;
  const textLen = (el.textContent || "").trim().length;
  // 平均每个子元素 < 15 字 且 子元素 ≥ 3
  if (textLen / children < 15 && children >= 3) return true;
  // 大量交互元素（按钮/链接）
  const interactiveCount = el.querySelectorAll(
    "button, a, [role='button']",
  ).length;
  if (interactiveCount >= 3 && interactiveCount / children > 0.5) return true;
  return false;
}
