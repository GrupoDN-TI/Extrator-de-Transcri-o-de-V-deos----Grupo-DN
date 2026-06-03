import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dns from "dns";
import { YoutubeTranscript } from "youtube-transcript";

// Fix Node.js DNS resolving issue if any
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

// Helper function to extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper function to parse responses structurally
function parseGeminiResponse(text: string, defaultTitle: string) {
  const titleMatch = text.match(/TITLE:\s*(.*)/i);
  const summaryMatch = text.match(/SUMMARY:\s*([\s\S]*?)(?=KEY CONCEPTS:|TRANSCRIPT:|$)/i);
  const keyConceptsMatch = text.match(/KEY CONCEPTS:\s*([\s\S]*?)(?=TRANSCRIPT:|$)/i);
  const transcriptMatch = text.match(/TRANSCRIPT:\s*([\s\S]*)/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : defaultTitle,
    summary: summaryMatch ? summaryMatch[1].trim() : "Summary not specified.",
    keyConcepts: keyConceptsMatch ? keyConceptsMatch[1].trim() : "Key Concepts not specified.",
    transcript: transcriptMatch ? transcriptMatch[1].trim() : text
  };
}

// Set up server-side Gemini AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure Multer for local PC/Mobile file uploads
const upload = multer({
  dest: "/tmp/",
  limits: {
    fileSize: 100 * 1024 * 1024, // Limit to 100MB
  },
});

app.use(express.json());

// Helper function to poll Gemini file state
async function waitForFileActive(fileRef: any) {
  let fileState = await ai.files.get({ name: fileRef.name });
  let attempts = 0;
  while (fileState.state === 'PROCESSING' && attempts < 60) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    fileState = await ai.files.get({ name: fileRef.name });
    attempts++;
  }
  if (fileState.state !== 'ACTIVE') {
    throw new Error(`File processing failed. State: ${fileState.state}`);
  }
  return fileState;
}

// Prompt for transcribe and summarize
function getTranscriptionPrompt() {
  return `
    Please analyze this video file in detail.
    
    1. Provide an accurate, human-readable transcript of what is spoken in the video, including speaker names if distinguishable.
    2. Provide an Executive Summary (under 250 words) highlighting the key themes, main arguments, and conclusions of the video.
    3. Extract 4 to 8 Key Concepts/Takeaways from the video, each formatted as a bullet point with a bold title (e.g. "* **[Concept Title]**: [Description]") followed by a concise 1-2 sentence description.
    4. Determine a suitable title for this presentation or discussion.
    
    Format your response EXACTLY as follows:
    TITLE: [Insert title here]
    SUMMARY: [Insert summary here]
    KEY CONCEPTS: [Insert bulleted key concepts here]
    TRANSCRIPT: [Insert transcript here]
  `;
}

// 1. Endpoint: Local file transcription (PC / Mobile)
app.post("/api/transcribe-local", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file was uploaded." });
  }

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  let uploadResult: any = null;

  try {
    // 1. Upload local file to Gemini Files API
    uploadResult = await ai.files.upload({
      file: filePath,
      mimeType: mimeType,
    } as any);

    // 2. Poll until state becomes ACTIVE
    await waitForFileActive(uploadResult);

    // 3. Generate content
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        uploadResult,
        { text: getTranscriptionPrompt() }
      ],
    });

    const text = response.text || "";
    
    // Parse response
    const parsed = parseGeminiResponse(text, req.file.originalname);
    res.json(parsed);

  } catch (error: any) {
    console.error("Transcription local error:", error);
    res.status(500).json({ error: error.message || "Failed to process video file." });
  } finally {
    // Cleanup local temp file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete local temp file:", err);
      }
    }
    // Cleanup Gemini uploaded file to free slot
    if (uploadResult) {
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (err) {
        console.error("Failed to delete Gemini temp file:", err);
      }
    }
  }
});

// 2. Endpoint: Google Drive file transcription
app.post("/api/transcribe-drive", async (req, res) => {
  const { fileId, accessToken, fileName, mimeType } = req.body;

  if (!fileId || !accessToken) {
    return res.status(400).json({ error: "File ID and Access Token are required." });
  }

  const tempFilePath = `/tmp/drive_${fileId}`;
  let uploadResult: any = null;

  try {
    // 1. Fetch file stream from Google Drive API
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveRes.ok) {
      throw new Error(`Failed to fetch file from Google Drive: ${driveRes.statusText}`);
    }

    // 2. Stream to a temporary file locally
    const fileStream = fs.createWriteStream(tempFilePath);
    const buffer = Buffer.from(await driveRes.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);

    // 3. Upload to Gemini Files API
    uploadResult = await ai.files.upload({
      file: tempFilePath,
      mimeType: mimeType || "video/mp4",
    } as any);

    // 4. Poll until state is ACTIVE
    await waitForFileActive(uploadResult);

    // 5. Generate content
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        uploadResult,
        { text: getTranscriptionPrompt() }
      ],
    });

    const text = response.text || "";

    // Parse response
    const parsed = parseGeminiResponse(text, fileName || "Google Drive File");
    res.json(parsed);

  } catch (error: any) {
    console.error("Transcription Drive error:", error);
    res.status(500).json({ error: error.message || "Failed to process Google Drive file." });
  } finally {
    // Cleanup local temp file
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Failed to delete local Drive temp file:", err);
      }
    }
    // Cleanup Gemini file
    if (uploadResult) {
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (err) {
        console.error("Failed to delete Gemini temp file:", err);
      }
    }
  }
});

// 3. Endpoint: URL Transcription (Web-grounding URL option with native YouTube subtitle scraping)
app.post("/api/transcribe-url", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Check if YouTube video URL
  const ytId = getYouTubeId(url);
  if (ytId) {
    console.log(`YouTube URL detected. Fetching subtitles natively for ID: ${ytId}`);
    try {
      const transcriptParts = await YoutubeTranscript.fetchTranscript(ytId);
      const plainTranscript = transcriptParts.map((part) => part.text).join(" ");

      const responseText = `
        Below is the complete spoken transcript of a YouTube video (ID: ${ytId}, URL: ${url}).
        Using this transcript, please perform the following:
        1. Determine a highly precise, elegant, and descriptive official title for this video/discussion.
        2. Provide an Executive Summary (under 250 words) outlining the main thesis, themes, and key conclusions of the presentation.
        3. Extract 4 to 8 Key Concepts/Takeaways from the content, each formatted as an individual bullet point with a bold title (e.g. "* **[Concept Title]**: [Description]") followed by a clean, 1-2 sentence description. Focus on unique conceptual elements and takeaways.
        
        Format your response EXACTLY as follows:
        TITLE: [Insert title here]
        SUMMARY: [Insert summary here]
        KEY CONCEPTS: [Insert bulleted key concepts here]
        TRANSCRIPT: [Original transcript or processed version]
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: responseText,
      });

      const text = response.text || "";
      const parsed = parseGeminiResponse(text, "YouTube Video");
      
      // Keep the native transcript if parsing is truncated
      if (parsed.transcript === text || parsed.transcript.length < 50) {
        parsed.transcript = plainTranscript;
      }
      return res.json(parsed);
    } catch (ytError: any) {
      console.warn("Native YouTube transcript fetch failed. Falling back to Search grounding:", ytError);
    }
  }

  // Fallback / Standard URL parsing path (e.g. WEF or other URLs)
  try {
    const prompt = `
      Please analyze the video or content at this URL: ${url}
      
      1. Transcribe the spoken text or accurately reproduce the key transcript from online info.
      2. Provide a concise summary of the key messages (under 250 words).
      3. Extract 4 to 8 Key Concepts/Takeaways from the video page, each formatted as an individual bullet point with a bold title (e.g. "* **[Concept Title]**: [Description]") followed by a clean, 1-2 sentence description.
      4. Identify the main title or topic.
      
      Output your response exactly in this format:
      TITLE: [Title]
      SUMMARY: [Summary]
      KEY CONCEPTS: [Bullet points with titles]
      TRANSCRIPT: [Transcript]
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const parsed = parseGeminiResponse(text, "Video Transcription");
    res.json(parsed);
  } catch (error: any) {
    console.error("Transcription URL error:", error);
    res.status(500).json({ error: error.message || "Failed to ground transcribe content." });
  }
});

// Vite Middleware Integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
