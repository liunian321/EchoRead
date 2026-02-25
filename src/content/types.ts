export interface TranslationResult {
  original: string;
  detectedLang: string;
  targetLang: string;
  translation: string;
  pronunciation?: string;
  phonetic?: string;
  definitions?: Array<{
    partOfSpeech: string;
    definition: string;
    example?: string;
  }>;
}

export interface SelectionData {
  text: string;
  rect: DOMRect;
  position: { x: number; y: number };
}

export interface TranslateResponse {
  success: boolean;
  data?: TranslationResult;
  error?: string;
}
