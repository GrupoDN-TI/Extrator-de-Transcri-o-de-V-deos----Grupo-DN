export interface TranscriptionResult {
  transcript: string;
  summary: string;
  title: string;
  keyConcepts?: string;
}

// 1. Transcribe online URL (WEF / YouTube)
export async function transcribeVideo(url: string): Promise<TranscriptionResult> {
  const res = await fetch("/api/transcribe-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to transcribe URL.");
  }

  return res.json();
}

// 2. Transcribe local file upload (PC / Mobile)
export async function transcribeLocalFile(file: File): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch("/api/transcribe-local", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to transcribe local video file.");
  }

  return res.json();
}

// 3. Transcribe Google Drive file
export async function transcribeDriveFile(
  fileId: string,
  accessToken: string,
  fileName?: string,
  mimeType?: string
): Promise<TranscriptionResult> {
  const res = await fetch("/api/transcribe-drive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, accessToken, fileName, mimeType }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to transcribe Google Drive file.");
  }

  return res.json();
}
