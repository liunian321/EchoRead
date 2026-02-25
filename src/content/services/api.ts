import { TranslationResult } from "../types";

/**
 * Sends a streaming translation request to the background script using connection ports.
 * @param text The text to translate.
 * @param onProgress Callback passing the incremental translation result.
 * @returns A promise resolving to the final complete translation result.
 */
export function streamTranslateText(
  text: string,
  onProgress: (data: TranslationResult) => void,
): Promise<TranslationResult> {
  return new Promise((resolve, reject) => {
    let finalData: TranslationResult | null = null;
    let settled = false;
    try {
      const port = chrome.runtime.connect({ name: "translate-stream" });

      port.onMessage.addListener((msg) => {
        if (msg.type === "STREAM_DATA") {
          finalData = msg.data;
          onProgress(msg.data);
        } else if (msg.type === "STREAM_END") {
          settled = true;
          if (finalData) {
            resolve(finalData);
          } else {
            reject(new Error("Translation returned empty result"));
          }
        } else if (msg.type === "ERROR") {
          settled = true;
          reject(new Error(msg.error));
        }
      });

      port.onDisconnect.addListener(() => {
        if (settled) return;
        settled = true;
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (finalData) {
          // background 正常 disconnect 但未发 STREAM_END，用已有数据 resolve
          resolve(finalData);
        } else {
          reject(new Error("Connection closed without result"));
        }
      });

      port.postMessage({ type: "TRANSLATE_TEXT", payload: { text } });
    } catch (e) {
      reject(e);
    }
  });
}
