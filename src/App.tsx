import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Loader2, 
  FileText, 
  Layout, 
  Info, 
  ExternalLink, 
  Video, 
  UploadCloud, 
  LogIn, 
  LogOut, 
  Copy, 
  Check, 
  RefreshCw, 
  HardDrive 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  transcribeVideo, 
  transcribeLocalFile, 
  transcribeDriveFile, 
  TranscriptionResult 
} from './services/geminiService';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from './services/authService';
import DrivePicker from './components/DrivePicker';
import { User } from 'firebase/auth';

type InputMode = 'url' | 'local' | 'drive';

export default function App() {
  const [mode, setMode] = useState<InputMode>('url');
  
  // URL Input State
  const [url, setUrl] = useState('https://www.weforum.org/videos/ai-why-destruction-necessity-for-creation/');
  
  // Local File Input State
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Auth State for Google Drive
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [showDriveExplorer, setShowDriveExplorer] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<any | null>(null);

  // Operational State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Initialize Auth state on load
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
      if (file.type.startsWith('video/')) {
        setLocalFile(file);
      } else {
        setError('Please drop a valid video file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalFile(e.target.files[0]);
    }
  };

  // Main copy helpers
  const copyToClipboard = async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  // General run trigger
  const handleTranscribe = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (mode === 'url') {
        if (!url) return;
        setLoadingStep('Grounding internet video page details via Google Search...');
        const data = await transcribeVideo(url);
        setResult(data);
      } 
      else if (mode === 'local') {
        if (!localFile) return;
        setLoadingStep('Uploading video content to processing server... (may take some time depending on file size)');
        const data = await transcribeLocalFile(localFile);
        setResult(data);
      } 
      else if (mode === 'drive') {
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
      setError(err.message || 'Failed to analyze or transcribe video context. Ensure the file format is supported and try again.');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const resetAll = () => {
    setResult(null);
    setError(null);
    setLocalFile(null);
    setSelectedDriveFile(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700">
      <header className="border-b border-zinc-800 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700">
              <Video className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-tight">AI Video Transcriber</h1>
              <p className="text-zinc-500 text-xs">Full-Stack multimodal audio analyzing</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                {user.photoURL && (
                  <img src={user.photoURL} alt={user.displayName || 'user'} referrerPolicy="no-referrer" className="w-5 h-5 rounded-full" />
                )}
                <span className="text-zinc-300 font-mono hidden sm:inline">{user.email}</span>
                <button onClick={handleGoogleLogout} className="text-zinc-500 hover:text-red-400 font-medium flex items-center gap-1 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button 
                onClick={handleGoogleSignIn}
                className="text-xs bg-zinc-900 duration-150 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-zinc-300"
              >
                <LogIn className="w-3.5 h-3.5" />
                Connect Google Account
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Mode Selector */}
          {!result && !loading && (
            <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-900 max-w-md mx-auto">
              <button
                onClick={() => { setMode('url'); setError(null); }}
                className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all ${
                  mode === 'url' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Web Video URL
              </button>
              <button
                onClick={() => { setMode('local'); setError(null); }}
                className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all ${
                  mode === 'local' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                PC / Mobile Video
              </button>
              <button
                onClick={() => { setMode('drive'); setError(null); }}
                className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all relative ${
                  mode === 'drive' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Google Drive
              </button>
            </div>
          )}

          {/* Input Section */}
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.section 
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6"
              >
                {/* 1. URL Mode */}
                {mode === 'url' && (
                  <div className="space-y-4">
                    <label htmlFor="url" className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Browse Or Analyze URL
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        id="url"
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste WEF link or any online video URL..."
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all text-xs font-mono text-zinc-300"
                      />
                      <button
                        onClick={handleTranscribe}
                        disabled={!url}
                        className="bg-zinc-100 text-zinc-950 px-8 py-3 rounded-xl font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Transcribe URL
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono">Uses Gemini to perform search grounding on video contexts, summarising information completely.</p>
                  </div>
                )}

                {/* 2. PC / Mobile Local File Mode */}
                {mode === 'local' && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" />
                      Upload PC or Mobile Video
                    </label>

                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        dragActive ? "border-zinc-100 bg-zinc-800/40" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="video/*" 
                        onChange={handleFileChange} 
                        id="local-file-input" 
                        className="hidden" 
                      />
                      
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center mx-auto border border-zinc-800">
                          <Video className="w-6 h-6 text-zinc-500" />
                        </div>
                        {localFile ? (
                          <div className="text-zinc-200">
                            <p className="text-xs font-mono font-bold truncate max-w-xs mx-auto">{localFile.name}</p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1">{(localFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        ) : (
                          <div className="text-zinc-400 text-xs">
                            <p className="font-medium text-zinc-300">Drag and drop file here, or click to choose</p>
                            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Supports MP4, WEBM, MOV up to 100MB</p>
                          </div>
                        )}

                        <label 
                          htmlFor="local-file-input" 
                          className="inline-block mt-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                        >
                          Select File from Device
                        </label>
                      </div>
                    </div>

                    {localFile && (
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleTranscribe}
                          className="bg-zinc-100 text-zinc-950 px-8 py-3 rounded-xl font-bold text-xs hover:bg-white transition-all flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Upload & Transcribe Video
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Google Drive Mode */}
                {mode === 'drive' && (
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      Google Drive Integration
                    </label>

                    {!user ? (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center space-y-4">
                        <h4 className="text-sm font-medium text-zinc-300">Google Drive is disabled</h4>
                        <p className="text-zinc-500 text-xs max-w-sm mx-auto">
                          In order to import files directly, we will connect to your Google Drive read-only endpoint with your permission from the Google accounts dialog.
                        </p>
                        
                        <button 
                          onClick={handleGoogleSignIn}
                          className="gsi-material-button mx-auto"
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <div className="gsi-material-button-state"></div>
                          <div className="gsi-material-button-content-wrapper bg-white py-1.5 px-4 rounded-xl flex items-center gap-3 shadow hover:shadow-md transition-shadow">
                            <div className="gsi-material-button-icon flex items-center">
                              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '18px', height: '18px' }}>
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                <path fill="none" d="M0 0h48v48H0z"></path>
                              </svg>
                            </div>
                            <span className="gsi-material-button-contents text-zinc-900 font-semibold text-xs text-sans">Sign in with Google</span>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!showDriveExplorer ? (
                          <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <div className="flex items-center gap-3">
                              <HardDrive className="w-5 h-5 text-zinc-500" />
                              <div>
                                <p className="text-xs text-zinc-300 font-medium font-mono">Authenticated as: {user.email}</p>
                                <p className="text-[10px] text-zinc-500">Accessing Google Drive files securely in-memory</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowDriveExplorer(true)}
                              className="text-xs bg-zinc-100 hover:bg-white text-zinc-950 py-1.5 px-4 rounded-lg font-bold"
                            >
                              Browse Drive Folder
                            </button>
                          </div>
                        ) : (
                          <DrivePicker 
                            token={authToken!} 
                            onSelect={(file) => {
                              setSelectedDriveFile(file);
                              setShowDriveExplorer(false);
                            }}
                            onCancel={() => setShowDriveExplorer(false)}
                          />
                        )}

                        {selectedDriveFile && (
                          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-zinc-500 font-mono">SELECTED DRIVE FILE:</p>
                              <p className="text-xs text-zinc-100 font-mono font-bold">{selectedDriveFile.name}</p>
                            </div>
                            <button
                              onClick={handleTranscribe}
                              className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs py-2 px-5 rounded-lg font-bold flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              Transcribe Picked File
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex items-center gap-3"
              >
                <Info className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Display */}
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 space-y-6"
              >
                <div className="relative">
                  <Loader2 className="w-12 h-12 text-zinc-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Video className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <p className="text-xs text-zinc-400 font-mono">{loadingStep}</p>
                  <p className="text-[10px] text-zinc-600 italic">This usually finishes within 30-60 seconds for detailed videos. Real integrations are active.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">Processed successfully</span>
                    <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mt-1">{result.title}</h2>
                  </div>
                  <button
                    onClick={resetAll}
                    className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 py-1.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Transcribe New File
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Transcript column */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400" />
                        Complete Transcript
                      </h3>
                      <button
                        onClick={() => copyToClipboard(result.transcript, setCopiedTranscript)}
                        className="text-[11px] font-mono hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        {copiedTranscript ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedTranscript ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative min-h-[400px]">
                      <div className="text-zinc-300 leading-relaxed space-y-4 text-justify text-sm whitespace-pre-wrap">
                        {result.transcript}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar/Summary column */}
                  <div className="space-y-6">
                    {/* Summary Area */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                        <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                          <Layout className="w-4 h-4 text-zinc-500" />
                          Executive Summary
                        </h3>
                        <button
                          onClick={() => copyToClipboard(result.summary, setCopiedSummary)}
                          className="text-[10px] text-zinc-400 hover:text-zinc-200"
                        >
                          {copiedSummary ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed text-justify">
                        {result.summary}
                      </p>
                    </div>

                    {/* Metadata Context Area */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                      <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
                        <Info className="w-4 h-4 text-zinc-500" />
                        Analysis details
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">Source Type</span>
                          <span className="text-zinc-350 font-mono capitalize">{mode}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-500">Status</span>
                          <span className="text-green-500 font-mono">Completed</span>
                        </div>
                        {mode === 'url' && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-zinc-500">Target</span>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-zinc-300 text-[10px] hover:text-white flex items-center gap-1 group truncate max-w-[140px]">
                              Open Video
                              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <footer className="border-t border-zinc-800 py-12 bg-[#080808]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-xs text-sans">
            <span>Built with Gemini 3.1 Pro APIs</span>
            <span>•</span>
            <span>Real-time Video Analysis</span>
          </div>
          <div className="flex gap-4">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">System Status: Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
