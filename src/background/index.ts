const DEFAULT_CONFIG = {
  apiUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-3.5-turbo",
  targetLang: "zh-CN",
  systemPrompt:
    "你是一个专业的翻译引擎，请将用户发送的文本翻译为中文。如果用户发送的是中文，请翻译为目标语言（根据源语言定，通常为英文）。只返回翻译结果，如果提供了多行文本，请按行翻译，不要任何额外解释。",
};

/** Splits text into non-empty trimmed lines (replaces wasm-core build_segments). */
function buildSegments(text: string): string {
  const segments = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments.join("\n") : text;
}

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private capacity: number = 200) {}

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const val = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, val);
    return val;
  }

  put(key: K, value: V) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const translationCache = new LRUCache<string, string>(200);
const MODEL_CACHE_KEY = "modelListCache";
const MODEL_CACHE_TTL = 24 * 60 * 60 * 1000;

type TranslationProfile = {
  id: string;
  name: string;
  targetLang: string;
  model: string;
  domainPreference?: string;
  engine?: string;
};

type ModelInfo = {
  id: string;
  name: string;
  supportedLangs: string[];
  maxTokens: number;
  ownedBy?: string;
};

const MODEL_SPECS: Record<
  string,
  { maxTokens: number; supportedLangs: string[] }
> = {
  "gpt-3.5-turbo": { maxTokens: 16385, supportedLangs: ["auto"] },
  "gpt-4": { maxTokens: 8192, supportedLangs: ["auto"] },
  "gpt-4-turbo": { maxTokens: 128000, supportedLangs: ["auto"] },
  "gpt-4o": { maxTokens: 128000, supportedLangs: ["auto"] },
  "gpt-4o-mini": { maxTokens: 128000, supportedLangs: ["auto"] },
  "claude-3-haiku": { maxTokens: 200000, supportedLangs: ["auto"] },
  "claude-3-sonnet": { maxTokens: 200000, supportedLangs: ["auto"] },
  "claude-3-opus": { maxTokens: 200000, supportedLangs: ["auto"] },
  "deepseek-chat": { maxTokens: 64000, supportedLangs: ["auto"] },
  "deepseek-reasoner": { maxTokens: 64000, supportedLangs: ["auto"] },
};

async function fetchWithRetry(url: string, options: RequestInit, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      attempt++;
      if (attempt >= retries)
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      const delay = Math.pow(2, attempt) * 500; // Exponential backoff: 1s, 2s, 4s...
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  throw new Error(`API Error: Max retries reached`);
}

function resolveModelMeta(id: string, ownedBy?: string): ModelInfo {
  const spec = MODEL_SPECS[id] || { maxTokens: 4096, supportedLangs: ["auto"] };
  return {
    id,
    name: id,
    supportedLangs: spec.supportedLangs,
    maxTokens: spec.maxTokens,
    ownedBy,
  };
}

/**
 * Normalizes user-provided API URL to the chat completions endpoint.
 * Accepts: base/v1, base/v1/, base/v1/chat/completions, or arbitrary paths.
 */
function buildChatUrl(apiUrl: string): string {
  const trimmed = apiUrl.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
  // If it has /v1/ with something else after, replace the tail
  if (trimmed.includes("/v1/")) {
    const base = trimmed.split("/v1/")[0];
    return `${base}/v1/chat/completions`;
  }
  return `${trimmed}/v1/chat/completions`;
}

function buildModelsUrl(apiUrl: string) {
  const chatUrl = buildChatUrl(apiUrl);
  return chatUrl.replace("/chat/completions", "/models");
}

async function getActiveProfileConfig() {
  const data = await chrome.storage.sync.get([
    "apiUrl",
    "apiKey",
    "model",
    "targetLang",
    "systemPrompt",
    "translationProfiles",
    "activeProfileId",
  ]);
  const profiles = (data.translationProfiles || []) as TranslationProfile[];
  const activeId = data.activeProfileId as string | undefined;
  const activeProfile =
    profiles.find((p) => p.id === activeId) || profiles[0] || null;
  return {
    apiUrl: (data.apiUrl as string) || DEFAULT_CONFIG.apiUrl,
    apiKey: (data.apiKey as string) || DEFAULT_CONFIG.apiKey,
    model:
      activeProfile?.model || (data.model as string) || DEFAULT_CONFIG.model,
    targetLang:
      activeProfile?.targetLang ||
      (data.targetLang as string) ||
      DEFAULT_CONFIG.targetLang,
    domainPreference: activeProfile?.domainPreference || "",
    systemPrompt: (data.systemPrompt as string) || DEFAULT_CONFIG.systemPrompt,
  };
}

async function fetchModelList(
  forceRefresh = false,
  providedApiUrl?: string,
  providedApiKey?: string,
) {
  if (!forceRefresh) {
    const cached = await chrome.storage.local.get([MODEL_CACHE_KEY]);
    const entry = cached[MODEL_CACHE_KEY] as
      | { timestamp: number; models: ModelInfo[] }
      | undefined;
    if (entry && Date.now() - entry.timestamp < MODEL_CACHE_TTL) {
      return { models: entry.models, fromCache: true };
    }
  }

  const activeConfig = await getActiveProfileConfig();
  const apiUrl = providedApiUrl || activeConfig.apiUrl;
  const apiKey = providedApiKey || activeConfig.apiKey;
  const modelsUrl = buildModelsUrl(apiUrl);
  const response = await fetchWithRetry(modelsUrl, {
    method: "GET",
    headers: apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : {},
  });

  const payload = (await response.json()) as {
    data?: Array<{ id: string; owned_by?: string }>;
  };
  const models = (payload.data || []).map((item) =>
    resolveModelMeta(item.id, item.owned_by),
  );
  const cacheEntry = { timestamp: Date.now(), models };
  await chrome.storage.local.set({ [MODEL_CACHE_KEY]: cacheEntry });
  return { models, fromCache: false };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("EchoRead 安装成功 - 初始化本地Cache");
  chrome.contextMenus.create({
    id: "translate_selection",
    title: "翻译选中文本",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate_selection" && tab?.id) {
    chrome.tabs
      .sendMessage(tab.id, {
        type: "CONTEXT_MENU_TRANSLATE",
        text: info.selectionText,
      })
      .catch((err) => {
        console.warn(
          "Failed to send message to tab (content script might not be loaded):",
          err,
        );
      });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "translate-stream") {
    port.onMessage.addListener(async (msg) => {
      if (msg.type === "TRANSLATE_TEXT") {
        try {
          const activeConfig = await getActiveProfileConfig();
          const { targetLang } = activeConfig;
          const cacheKey = `${msg.payload.text}::${targetLang}`;

          // Check Cache First
          const cachedTr = translationCache.get(cacheKey);
          if (cachedTr) {
            port.postMessage({
              type: "STREAM_DATA",
              data: {
                original: msg.payload.text,
                targetLang,
                detectedLang: "auto",
                translation: cachedTr,
              },
            });
            port.postMessage({ type: "STREAM_END", fullTranslation: cachedTr });
            port.disconnect();
            return;
          }

          const preprocessedText = buildSegments(msg.payload.text);

          await handleTranslateStream(
            msg.payload.text,
            preprocessedText,
            port,
            activeConfig,
          );
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error);
          port.postMessage({ type: "ERROR", error: errMsg });
          port.disconnect();
        }
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "FETCH_MODEL_LIST") {
    fetchModelList(!!message.forceRefresh, message.apiUrl, message.apiKey)
      .then((result) =>
        sendResponse({
          success: true,
          data: result.models,
          fromCache: result.fromCache,
        }),
      )
      .catch((error: unknown) => {
        const errMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errMsg });
      });
    return true;
  }
  if (message?.type === "TEST_CONNECTION") {
    const { apiUrl, apiKey, model } = message;
    (async () => {
      try {
        const chatEndpoint = buildChatUrl(apiUrl);
        const resp = await fetchWithRetry(
          chatEndpoint,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 1,
            }),
          },
          1,
        );
        const body = await resp.json();
        sendResponse({ success: true, status: resp.status, body });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        sendResponse({ success: false, error: errMsg });
      }
    })();
    return true;
  }
});

async function handleTranslateStream(
  originalText: string,
  preprocessedText: string,
  port: chrome.runtime.Port,
  activeConfig: Awaited<ReturnType<typeof getActiveProfileConfig>>,
) {
  const apiUrl = buildChatUrl(activeConfig.apiUrl);
  const apiKey = activeConfig.apiKey;
  const model = activeConfig.model;
  const targetLang = activeConfig.targetLang;
  const domainPreference = activeConfig.domainPreference;
  const systemPrompt = activeConfig.systemPrompt;

  // 读取流式配置，默认 false（兼容本地 LLM）
  const storageData = await chrome.storage.sync.get(["useStreaming"]);
  const useStreaming = storageData.useStreaming === true;

  const mergedSystemPrompt = [
    systemPrompt,
    targetLang ? `目标语言：${targetLang}` : "",
    domainPreference ? `专业领域偏好：${domainPreference}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: mergedSystemPrompt },
      { role: "user", content: preprocessedText },
    ],
  };
  if (useStreaming) {
    payload.stream = true;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetchWithRetry(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  let result: string;

  if (useStreaming) {
    result = await readStreamResponse(response, originalText, targetLang, port);
  } else {
    result = await readJsonResponse(response);
    // 非流式：一次性发送完整翻译
    port.postMessage({
      type: "STREAM_DATA",
      data: {
        original: originalText,
        targetLang,
        detectedLang: "auto",
        translation: result,
      },
    });
  }

  const cacheKey = `${originalText}::${targetLang}`;
  translationCache.put(cacheKey, result);
  port.postMessage({ type: "STREAM_END", fullTranslation: result });
  port.disconnect();
}

/** 解析非流式 JSON 响应 */
async function readJsonResponse(response: Response): Promise<string> {
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return body.choices?.[0]?.message?.content?.trim() || "";
}

/** 解析 SSE 流式响应 */
async function readStreamResponse(
  response: Response,
  originalText: string,
  targetLang: string,
  port: chrome.runtime.Port,
): Promise<string> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let result = "";

  if (!reader) return result;

  let buffer = "";
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      if (trimmedLine === "data: [DONE]") {
        streamDone = true;
        break;
      }

      if (trimmedLine.startsWith("data: ")) {
        try {
          const data = JSON.parse(trimmedLine.slice(6));
          if (
            data.choices &&
            data.choices[0].delta &&
            data.choices[0].delta.content
          ) {
            result += data.choices[0].delta.content;
            port.postMessage({
              type: "STREAM_DATA",
              data: {
                original: originalText,
                targetLang,
                detectedLang: "auto",
                translation: result,
              },
            });
          }
        } catch (e) {
          console.error("Parse error on chunk:", e, trimmedLine);
        }
      }
    }
  }

  return result;
}
