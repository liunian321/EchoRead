import { useState, useCallback } from "preact/hooks";
import { translateText } from "../services/api";
import { TranslationResult } from "../types";

export interface UseTranslateReturn {
  isLoading: boolean;
  data: TranslationResult | null;
  error: string | null;
  translate: (text: string) => Promise<void>;
  reset: () => void;
}

export function useTranslate(): UseTranslateReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<TranslationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (text: string) => {
    if (!text) return;

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await translateText(text);
      setData(result);
    } catch (err: any) {
      console.error("Translation error:", err);
      setError(err.message || "Translation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { isLoading, data, error, translate, reset };
}
