/**
 * Service Worker (Background)
 * 处理如跨域请求、本地IndexedDB缓存或长时间保持后台服务等核心逻辑
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("EchoRead 安装成功 - 初始化本地Cache");
});

// 处理 Content Script 发来的长连接或单次通信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "TRANSLATE_TEXT") {
    // 此处可接本地推流模型 或 外部 API
    // 采用异步响应
    handleTranslate(request.payload.text)
      .then((res) => sendResponse({ success: true, data: res }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true; // 告知 Chrome 将采用异步 sendResponse
  }
});

async function handleTranslate(text: string) {
  // 模拟一个 API 延迟，实现高性能逻辑可在这里接入缓存(Map/LRU)或IndexedDB
  await new Promise((resolve) => setTimeout(resolve, 600)); // 稍微增加延迟以展示 Loading 效果

  // Mock 响应数据结构
  return {
    original: text,
    detectedLang: "en",
    targetLang: "zh-CN",
    translation: `[Mock] ${text} 的中文翻译`,
    pronunciation: "https://example.com/audio.mp3", // 模拟发音链接
    phonetic: "/ˈekoʊ riːd/",
    definitions: [
      {
        partOfSpeech: "n.",
        definition: "回声；反响；共鸣",
        example: "The echo of the footsteps died away."
      },
      {
        partOfSpeech: "v.",
        definition: "发出回声；充满回声",
        example: "The valley echoed with their laughter."
      }
    ]
  };
}
