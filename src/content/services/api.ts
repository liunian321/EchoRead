import { TranslateResponse, TranslationResult } from "../types";

/**
 * Sends a translation request to the background script.
 * @param text The text to translate.
 * @returns A promise resolving to the translation result.
 */
export function translateText(text: string): Promise<TranslationResult> {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(
        { type: "TRANSLATE_TEXT", payload: { text } },
        (response: TranslateResponse) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (response && response.success && response.data) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Translation failed"));
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  });
}
