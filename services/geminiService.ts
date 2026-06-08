import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

// Initialize Gemini client with proper configuration and User-Agent telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Cache implementation for Idempotency
const CACHE_FILE_PATH = path.join("/tmp", "video_transcriber_cache.json");

export interface TranscriptionRecord {
  title: string;
  summary: string;
  keyConcepts: string;
  transcript: string;
  modelUsed?: string;
  cachedAt?: number;
}

interface CacheStore {
  [key: string]: TranscriptionRecord;
}

// Safely load persistent cache from temp disk
function loadCacheFromDisk(): CacheStore {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, "utf8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("[Cache] Warmup error reading cache disk storage:", err);
  }
  return {};
}

// Safely write persistent cache state to temp disk
function saveCacheToDisk(store: CacheStore) {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("[Cache] Write err while serializing cache state to disk:", err);
  }
}

// Local runtime dictionary
const memoryCache: CacheStore = loadCacheFromDisk();

/**
 * Checks cache for existing transcription to guarantee idempotency.
 * @param key unique lookup key (url code, local file fingerprint, google drive ID)
 */
export function getCachedResult(key: string): TranscriptionRecord | null {
  const normKey = key.trim().toLowerCase();
  const hit = memoryCache[normKey];
  if (hit) {
    console.log(`[Idempotency Cache HIT] Instant return for key query: "${key}"`);
    return hit;
  }
  return null;
}

/**
 * Saves analysis outcomes in persistent Cache.
 */
export function persistResultToCache(key: string, record: TranscriptionRecord) {
  const normKey = key.trim().toLowerCase();
  memoryCache[normKey] = {
    ...record,
    cachedAt: Date.now(),
  };
  saveCacheToDisk(memoryCache);
  console.log(`[Idempotency Cache SAVE] Persisted outcome for key query: "${key}"`);
}

// JSON Schema for structured transcription output to ensure 100% valid JSON
export const transcriptionSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A highly precise, elegant, and descriptive official title for the video or discussion.",
    },
    summary: {
      type: Type.STRING,
      description: "An Executive Summary (under 250 words) highlighting the main thesis, themes, and key conclusions of the presentation.",
    },
    keyConcepts: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "A bulleted list of 4 to 8 key concepts or takeaways from the content. Each takeaway must start with a descriptive bold title (e.g., '**[Concept Title]**: [Description]') followed by a concise 1-2 sentence description.",
    },
    transcript: {
      type: Type.STRING,
      description: "An accurate, human-readable transcript of what is spoken in the video, including speaker names if distinguishable.",
    },
  },
  required: ["title", "summary", "keyConcepts", "transcript"],
};

// Monitor the uploaded file state until it transitions to ACTIVE
export async function waitForFileActive(fileRef: { name: string }) {
  let fileState = await ai.files.get({ name: fileRef.name });
  let attempts = 0;
  
  while (fileState.state === "PROCESSING" && attempts < 60) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    fileState = await ai.files.get({ name: fileRef.name });
    attempts++;
  }
  
  if (fileState.state !== "ACTIVE") {
    throw new Error(`Gemini files API processing failed. State: ${fileState.state}`);
  }
  
  return fileState;
}

/**
 * Executes a Gemini content generation request with automatic fallback redirection.
 * Primary model: gemini-3.1-pro-preview (premium, smaller quota in free tier)
 * Fallback model: gemini-2.5-flash (extremely resilient, higher quota / lower limits)
 */
async function callGeminiWithFallback(params: {
  contents: any;
  config: any;
}): Promise<{ responseText: string; modelUsed: string }> {
  const primaryModel = "gemini-3.1-pro-preview";
  const fallbackModel = "gemini-2.5-flash";

  try {
    console.log(`[Gemini API] Dispatching query to primary model: "${primaryModel}"`);
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: params.contents,
      config: params.config,
    });
    return {
      responseText: response.text || "{}",
      modelUsed: primaryModel,
    };
  } catch (error: any) {
    const errorMsg = String(error?.message || error || "");
    const isQuotaError =
      errorMsg.includes("429") ||
      errorMsg.includes("quota") ||
      errorMsg.includes("RESOURCE_EXHAUSTED") ||
      errorMsg.includes("limit") ||
      errorMsg.includes("exhausted");

    console.warn(`[Gemini API Warning] Primary Model "${primaryModel}" failed. reason: ${isQuotaError ? "Quota Limit (429)" : "Unknown issue"}. Details: ${errorMsg}`);
    console.log(`[Gemini API Fallback] Overriding and redirecting request to: "${fallbackModel}" to recover gracefully.`);

    try {
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents: params.contents,
        config: params.config,
      });
      return {
        responseText: response.text || "{}",
        modelUsed: fallbackModel,
      };
    } catch (fallbackError: any) {
      console.error(`[Gemini API Critical] Both primary (${primaryModel}) and fallback (${fallbackModel}) models failed!`);
      throw fallbackError;
    }
  }
}

// Generate structured response using the JSON schema
export async function generateStructuredTranscription(
  fileRef: any,
  fileName: string
) {
  const prompt = `
    Analyze this video file in detail. Focus on accuracy:
    1. Provide a precise, spoken transcript.
    2. Summarize key messages in under 250 words.
    3. Exclude any non-relevant commentary.
  `;

  const { responseText, modelUsed } = await callGeminiWithFallback({
    contents: [
      fileRef,
      { text: prompt }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: transcriptionSchema,
    },
  });

  const parsed = JSON.parse(responseText.trim());

  // Format array of keyConcepts into a single unified markdown bullet string
  const formattedConcepts = Array.isArray(parsed.keyConcepts)
    ? parsed.keyConcepts.map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
          return trimmed;
        }
        return `* ${trimmed}`;
      }).join("\n")
    : "Key Concepts not specified.";

  return {
    title: parsed.title || fileName,
    summary: parsed.summary || "Summary not specified.",
    keyConcepts: formattedConcepts,
    transcript: parsed.transcript || "Transcript not specified.",
    modelUsed,
  };
}

// Generate structured response for URLs or pre-scaped text
export async function generateStructuredUrlTranscription(
  inputText: string,
  url: string,
  defaultTitle: string
) {
  const prompt = `
    Context Source URL: ${url}
    Content Info to process:
    ${inputText}

    Using the provided content or transcript, perform the following:
    1. Extract the main title or topic.
    2. Provide an Executive Summary (under 250 words) outlining key themes and conclusions.
    3. Extract 4 to 8 Key Concepts/Takeaways from the content.
    4. Provide the full transcription/spoken text in pristine human-readable format.
  `;

  const config: any = {
    responseMimeType: "application/json",
    responseSchema: transcriptionSchema,
  };

  if (!inputText) {
    config.tools = [{ googleSearch: {} }];
  }

  const { responseText, modelUsed } = await callGeminiWithFallback({
    contents: prompt,
    config,
  });

  const parsed = JSON.parse(responseText.trim());

  const formattedConcepts = Array.isArray(parsed.keyConcepts)
    ? parsed.keyConcepts.map((item: string) => {
        const trimmed = item.trim();
        if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
          return trimmed;
        }
        return `* ${trimmed}`;
      }).join("\n")
    : "Key Concepts not specified.";

  return {
    title: parsed.title || defaultTitle,
    summary: parsed.summary || "Summary not specified.",
    keyConcepts: formattedConcepts,
    transcript: parsed.transcript || "Transcript not specified.",
    modelUsed,
  };
}
