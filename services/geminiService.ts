import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini client with proper configuration and User-Agent telemetry
export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      fileRef,
      { text: prompt }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: transcriptionSchema,
    },
  });

  const responseText = response.text || "{}";
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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config,
  });

  const responseText = response.text || "{}";
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
  };
}
