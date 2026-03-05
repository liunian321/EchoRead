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

export interface StorageConfig {
  floatingButtonEnabled?: boolean;
  floatingButtonOpacity?: number | string;
  floatingButtonSize?: number | string;
  floatingButtonIconStyle?: "solid" | "outline";
  selectionTranslate?: boolean;
  lazyFullPageTranslate?: boolean;
  floatingButtonPosition?: { x: number; y: number };
}
