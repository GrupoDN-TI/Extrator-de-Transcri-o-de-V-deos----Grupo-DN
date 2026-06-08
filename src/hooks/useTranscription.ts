import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  transcribeVideo,
  transcribeLocalFile,
  transcribeDriveFile,
  TranscriptionResult,
} from "../services/geminiService";
import {
  initAuth,
  googleSignIn,
  logout,
} from "../services/authService";

export type InputMode = "url" | "local" | "drive";

export function useTranscription() {
  const [mode, setMode] = useState<InputMode>("url");
  
  // Inputs
  const [url, setUrl] = useState("https://www.weforum.org/videos/ai-why-destruction-necessity-for-creation/");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<any | null>(null);

  // Drag State
  const [dragActive, setDragActive] = useState(false);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);

  // Operations and Results State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clipboard Copied confirmation states
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedConcepts, setCopiedConcepts] = useState(false);

  // Wire up Auth Listener inside Hook
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAuthToken(token);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setAuthToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sign In / Sign Out actions
  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAuthToken(res.accessToken);
        setNeedsAuth(false);
        setShowDriveExplorer(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setAuthToken(null);
      setNeedsAuth(true);
      setShowDriveExplorer(false);
      setSelectedDriveFile(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/")) {
        setLocalFile(file);
      } else {
        setError("Please drop a valid video file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalFile(e.target.files[0]);
    }
  };

  // Trigger main analysis API calls
  const handleTranscribe = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === "url") {
        if (!url) return;
        setLoadingStep("Grounding internet video page details via Google Search...");
        const data = await transcribeVideo(url);
        setResult(data);
      } 
      else if (mode === "local") {
        if (!localFile) return;
        setLoadingStep("Uploading video content to processing server... (may take some time depending on file size)");
        const data = await transcribeLocalFile(localFile);
        setResult(data);
      } 
      else if (mode === "drive") {
        if (!selectedDriveFile || !authToken) return;
        setLoadingStep(`Contacting Google Drive to safely pull: "${selectedDriveFile.name}"...`);
        const data = await transcribeDriveFile(
          selectedDriveFile.id, 
          authToken, 
          selectedDriveFile.name, 
          selectedDriveFile.mimeType
        );
        setResult(data);
      }
    } catch (err: any) {
      setError(
        err.message || 
        "Failed to analyze or transcribe video context. Ensure the file format is supported and try again."
      );
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const resetAll = () => {
    setResult(null);
    setError(null);
    setLocalFile(null);
    setSelectedDriveFile(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("printable-content");
    if (!element) return;
    
    const { jsPDF } = await import("jspdf");
    const html2canvas = (await import("html2canvas")).default;
    
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`transcription_${result?.title || 'dossier'}.pdf`);
  };

  return {
    mode,
    setMode,
    url,
    setUrl,
    localFile,
    setLocalFile,
    selectedDriveFile,
    setSelectedDriveFile,
    dragActive,
    setDragActive,
    user,
    setUser,
    authToken,
    setAuthToken,
    needsAuth,
    showDriveExplorer,
    setShowDriveExplorer,
    loading,
    loadingStep,
    result,
    setResult,
    error,
    setError,
    copiedTranscript,
    setCopiedTranscript,
    copiedSummary,
    setCopiedSummary,
    copiedConcepts,
    setCopiedConcepts,
    handleGoogleSignIn,
    handleGoogleLogout,
    handleDrag,
    handleDrop,
    handleFileChange,
    handleTranscribe,
    copyToClipboard,
    resetAll,
    handlePrint,
    handleDownloadPdf,
  };
}
