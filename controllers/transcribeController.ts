import { Request, Response } from "express";
import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import { YoutubeTranscript } from "youtube-transcript";
import {
  ai,
  waitForFileActive,
  generateStructuredTranscription,
  generateStructuredUrlTranscription,
  getCachedResult,
  persistResultToCache,
} from "../services/geminiService";

// Helper function to extract YouTube video ID
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

// Controller: Transcribe a local file with cache lookup
export async function transcribeLocal(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: "No video file was uploaded." });
  }

  const filePath = req.file.path;
  const mimeType = req.file.mimetype;
  const originalName = req.file.originalname;
  const size = req.file.size;

  // 1. Generate Idempotency Cache Fingerprint
  const cacheKey = `local_file:${originalName}_size:${size}`;
  const cacheHit = getCachedResult(cacheKey);
  
  if (cacheHit) {
    console.log(`[Idempotency API HIT] local file "${originalName}" served natively from cache.`);
    
    // Safely delete the temporary uploaded file immediately to prevent disk space leaks
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Cleanup error for cached local file upload:", err);
      }
    }
    return res.json(cacheHit);
  }

  let uploadResult: any = null;

  try {
    // 2. Upload local file to Gemini Files API
    uploadResult = await ai.files.upload({
      file: filePath,
      mimeType: mimeType,
    } as any);

    // 3. Poll until state becomes ACTIVE
    await waitForFileActive(uploadResult);

    // 4. Generate structured content
    const parsed = await generateStructuredTranscription(uploadResult, originalName);
    
    // 5. Cache the outcome to promise future idempotency
    persistResultToCache(cacheKey, parsed);

    return res.json(parsed);

  } catch (error: any) {
    console.error("Transcription local error:", error);
    return res.status(500).json({ error: error.message || "Failed to process video file." });
  } finally {
    // Cleanup local temp file
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete local temp file:", err);
      }
    }
    // Cleanup Gemini uploaded file to free storage slot
    if (uploadResult) {
      try {
        await ai.files.delete({ name: uploadResult.name });
      } catch (err) {
        console.error("Failed to delete Gemini temp file:", err);
      }
    }
  }
}

// Controller: Transcribe a Google Drive file with cache lookup
export async function transcribeDrive(req: Request, res: Response) {
  const { fileId, accessToken, fileName, mimeType } = req.body;

  if (!fileId || !accessToken) {
    return res.status(400).json({ error: "File ID and Access Token are required." });
  }

  // 1. Generate Idempotency Cache Fingerprint
  const cacheKey = `drive_file:${fileId}`;
  const cacheHit = getCachedResult(cacheKey);
  
  if (cacheHit) {
    console.log(`[Idempotency API HIT] drive file "${fileId}" (${fileName || 'unnamed'}) served instantly from cache.`);
    return res.json(cacheHit);
  }

  const tempFilePath = `/tmp/drive_${fileId}`;
  let uploadResult: any = null;

  try {
    // 2. Fetch file stream from Google Drive API
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!driveRes.ok) {
      throw new Error(`Failed to fetch file from Google Drive: ${driveRes.statusText}`);
    }

    if (!driveRes.body) {
      throw new Error("No download stream returned from Google Drive.");
    }

    // 3. Stream to a temporary file locally directly to disk without RAM overload
    const nodeReadable = Readable.fromWeb(driveRes.body as any);
    await pipeline(nodeReadable, createWriteStream(tempFilePath));

    // 4. Upload to Gemini Files API
    uploadResult = await ai.files.upload({
      file: tempFilePath,
      mimeType: mimeType || "video/mp4",
    } as any);

    // 5. Poll until state is ACTIVE
    await waitForFileActive(uploadResult);

    // 6. Generate structured content
    const parsed = await generateStructuredTranscription(uploadResult, fileName || "Google Drive File");
    
    // 7. Save to cache
    persistResultToCache(cacheKey, parsed);

    return res.json(parsed);

  } catch (error: any) {
    console.error("Transcription Drive error:", error);
    return res.status(500).json({ error: error.message || "Failed to process Google Drive file." });
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
}

// Controller: Transcribe content by URL with cache lookup
export async function transcribeUrl(req: Request, res: Response) {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // 1. Generate Idempotency Cache Fingerprint
  const cacheKey = `url:${url}`;
  const cacheHit = getCachedResult(cacheKey);
  
  if (cacheHit) {
    console.log(`[Idempotency API HIT] URL target "${url}" served instantly from cache database.`);
    return res.json(cacheHit);
  }

  // Check if YouTube video URL
  const ytId = getYouTubeId(url);
  if (ytId) {
    console.log(`YouTube URL detected. Fetching subtitles natively for ID: ${ytId}`);
    try {
      const transcriptParts = await YoutubeTranscript.fetchTranscript(ytId);
      const plainTranscript = transcriptParts.map((part) => part.text).join(" ");

      // Execute structured layout generation directly over subtitles
      const parsed = await generateStructuredUrlTranscription(plainTranscript, url, "YouTube Video");
      
      // Override transcript with original timestamps-matched string if parsed transcript looks too short/truncated
      if (parsed.transcript.length < 50) {
        parsed.transcript = plainTranscript;
      }
      
      // Cache subtitles-based generation
      persistResultToCache(cacheKey, parsed);

      return res.json(parsed);
    } catch (ytError: any) {
      console.warn("Native YouTube transcript fetch failed. Falling back to Search grounding:", ytError);
    }
  }

  // Fallback / Standard URL parsing path using Search grounding
  try {
    const parsed = await generateStructuredUrlTranscription("", url, "Video Transcription");
    
    // Cache search-grounded generation
    persistResultToCache(cacheKey, parsed);

    return res.json(parsed);
  } catch (error: any) {
    console.error("Transcription URL error:", error);
    return res.status(500).json({ error: error.message || "Failed to ground transcribe content." });
  }
}
