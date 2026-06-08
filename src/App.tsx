import { 
  Loader2, 
  Video, 
  LogIn, 
  LogOut, 
  HardDrive,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranscription } from './hooks/useTranscription';
import UrlInput from './components/UrlInput';
import LocalFileUploader from './components/LocalFileUploader';
import ResultsDashboard from './components/ResultsDashboard';
import DrivePicker from './components/DrivePicker';

export default function App() {
  const {
    mode,
    setMode,
    url,
    setUrl,
    localFile,
    selectedDriveFile,
    setSelectedDriveFile,
    dragActive,
    user,
    authToken,
    showDriveExplorer,
    setShowDriveExplorer,
    loading,
    loadingStep,
    result,
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
  } = useTranscription();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-zinc-700">
      <div className="print:hidden">
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
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'user'} 
                      referrerPolicy="no-referrer" 
                      className="w-5 h-5 rounded-full" 
                    />
                  )}
                  <span className="text-zinc-350 font-mono hidden sm:inline">{user.email}</span>
                  <button 
                    onClick={handleGoogleLogout} 
                    className="text-zinc-500 hover:text-red-400 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleGoogleSignIn}
                  className="text-xs bg-zinc-900 duration-150 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-zinc-300 cursor-pointer"
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
              <div className="flex bg-[#0f0f0f] p-1 rounded-xl border border-zinc-900 max-w-md mx-auto">
                <button
                  onClick={() => { setMode('url'); setError(null); }}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'url' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  Web Video URL
                </button>
                <button
                  onClick={() => { setMode('local'); setError(null); }}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    mode === 'local' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-450 hover:text-zinc-200'
                  }`}
                >
                  PC / Mobile Video
                </button>
                <button
                  onClick={() => { setMode('drive'); setError(null); }}
                  className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer relative ${
                    mode === 'drive' ? 'bg-zinc-100 text-zinc-950 font-bold shadow' : 'text-zinc-455 hover:text-zinc-200'
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
                    <UrlInput 
                      url={url} 
                      setUrl={setUrl} 
                      onSubmit={handleTranscribe} 
                      disabled={loading} 
                    />
                  )}

                  {/* 2. PC / Mobile Local File Mode */}
                  {mode === 'local' && (
                    <LocalFileUploader 
                      localFile={localFile}
                      dragActive={dragActive}
                      onDrag={handleDrag}
                      onDrop={handleDrop}
                      onChange={handleFileChange}
                      onSubmit={handleTranscribe}
                    />
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
                          <p className="text-zinc-550 text-xs max-w-sm mx-auto font-sans leading-relaxed">
                            In order to import files directly, we will connect to your Google Drive read-only endpoint with your permission from the Google accounts dialog.
                          </p>
                          
                          <button 
                            onClick={handleGoogleSignIn}
                            className="bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs py-2 px-5 rounded-xl inline-flex items-center gap-2 transition-shadow shadow cursor-pointer"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 48 48">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            </svg>
                            <span>Sign in with Google Account</span>
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
                                className="text-xs bg-zinc-100 hover:bg-white text-zinc-950 py-1.5 px-4 rounded-lg font-bold cursor-pointer"
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
                                className="bg-zinc-100 hover:bg-white text-zinc-950 text-xs py-2 px-5 rounded-lg font-bold flex items-center gap-2 cursor-pointer"
                              >
                                <Video className="w-4 h-4" />
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
                  <Info className="w-4 h-4 text-red-500" />
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
                    <p className="text-[10px] text-zinc-650 italic">
                      This usually finishes within 30-60 seconds for detailed videos. Real integrations are active.
                    </p>
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
                >
                  <ResultsDashboard 
                    result={result}
                    mode={mode}
                    url={url}
                    resetAll={resetAll}
                    onPrint={handlePrint}
                    onDownloadPdf={handleDownloadPdf}
                    copyToClipboard={copyToClipboard}
                    copiedTranscript={copiedTranscript}
                    setCopiedTranscript={setCopiedTranscript}
                    copiedSummary={copiedSummary}
                    setCopiedSummary={setCopiedSummary}
                    copiedConcepts={copiedConcepts}
                    setCopiedConcepts={setCopiedConcepts}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </main>

        <footer className="border-t border-zinc-800 py-12 bg-[#080808]">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs text-sans">
              <span>Built with Gemini Pro APIs</span>
              <span>•</span>
              <span>Structured Response Outputs</span>
            </div>
            <div className="flex gap-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-1" />
              <span className="text-[10px] text-zinc-650 uppercase tracking-widest font-mono">System Status: Active</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Pristine Print-Only Report Layout */}
      {result && (
        <div id="printable-content" className="hidden print:block text-black bg-white p-8 max-w-4xl mx-auto font-sans">
          <div className="border-b-2 border-zinc-900 pb-4 mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-950 leading-tight">
              {result.title}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-neutral-500 mt-4 border-t border-neutral-200 pt-3 font-mono">
              <div>
                <span className="font-bold text-neutral-700">Document Type:</span> Transcription Dossier
              </div>
              <div>
                <span className="font-bold text-neutral-700">Source:</span> <span className="capitalize">{mode}</span>
              </div>
              {mode === 'url' && (
                <div className="truncate max-w-[350px]">
                  <span className="font-bold text-neutral-700">Target URL:</span> {url}
                </div>
              )}
              {mode === 'local' && localFile && (
                <div>
                  <span className="font-bold text-neutral-700">File Name:</span> {localFile.name}
                </div>
              )}
              {mode === 'drive' && selectedDriveFile && (
                <div>
                  <span className="font-bold text-neutral-700">Drive File:</span> {selectedDriveFile.name}
                </div>
              )}
              <div>
                <span className="font-bold text-neutral-700">Date Generated:</span> {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          <div className="mb-8 avoid-break">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-widest border-b-2 border-neutral-300 pb-1 mb-3">
              Executive Summary
            </h2>
            <div className="text-neutral-850 leading-relaxed text-sm text-justify whitespace-pre-wrap font-sans">
              {result.summary}
            </div>
          </div>

          {result.keyConcepts && result.keyConcepts !== 'Key Concepts not specified.' && (
            <div className="mb-8 avoid-break">
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-widest border-b-2 border-neutral-300 pb-1 mb-3">
                Key Takeaways & Concepts
              </h2>
              <div className="text-neutral-850 leading-relaxed text-sm text-justify whitespace-pre-wrap font-sans">
                {result.keyConcepts}
              </div>
            </div>
          )}

          <div className="avoid-break pt-4">
            <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-widest border-b-2 border-neutral-300 pb-1 mb-3">
              Complete Transcription
            </h2>
            <div className="text-neutral-850 leading-relaxed text-sm text-justify whitespace-pre-wrap font-sans">
              {result.transcript}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
