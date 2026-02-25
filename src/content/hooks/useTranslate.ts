import { useState, useCallback } from "preact/hooks";
import { streamTranslateText } from "../services/api";
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
      // Use streaming translation instead of single request
      await streamTranslateText(text, (incrementalData) => {
        setData(incrementalData);
        setIsLoading(false); // Stop loading animation once first chunk arrives
      });
    } catch (err: unknown) {
      console.error("Translation error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Translation failed. Please try again.";
      setError(errorMessage);
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
