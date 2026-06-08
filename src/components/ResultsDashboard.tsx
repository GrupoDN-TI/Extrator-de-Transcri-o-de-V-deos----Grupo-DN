import { 
  Printer, 
  RefreshCw, 
  Layout, 
  FileText, 
  Check, 
  Copy, 
  Info, 
  ExternalLink 
} from 'lucide-react';
import { TranscriptionResult } from '../services/geminiService';

interface ResultsDashboardProps {
  result: TranscriptionResult;
  mode: string;
  url: string;
  resetAll: () => void;
  onPrint: () => void;
  onDownloadPdf: () => void;
  copyToClipboard: (text: string, setCopied: (v: boolean) => void) => Promise<void>;
  copiedTranscript: boolean;
  setCopiedTranscript: (v: boolean) => void;
  copiedSummary: boolean;
  setCopiedSummary: (v: boolean) => void;
  copiedConcepts: boolean;
  setCopiedConcepts: (v: boolean) => void;
}

export default function ResultsDashboard({
  result,
  mode,
  url,
  resetAll,
  onPrint,
  onDownloadPdf,
  copyToClipboard,
  copiedTranscript,
  setCopiedTranscript,
  copiedSummary,
  setCopiedSummary,
  copiedConcepts,
  setCopiedConcepts,
}: ResultsDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
              Processed successfully
            </span>
            {result.cachedAt && (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                ⚡ Instant Cache Hit
              </span>
            )}
            {result.modelUsed && (
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${
                result.modelUsed === 'gemini-2.5-flash' 
                  ? 'text-amber-400 bg-amber-950/40 border-amber-900' 
                  : 'text-zinc-400 bg-zinc-900 border-zinc-800'
              }`}>
                Model: {result.modelUsed} {result.modelUsed === 'gemini-2.5-flash' ? '(Graceful Fallback)' : ''}
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mt-1">{result.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="text-xs font-bold text-zinc-950 duration-150 hover:bg-white bg-zinc-100 flex items-center gap-1.5 py-1.5 px-4 rounded-xl cursor-pointer shadow-lg"
            title="Print this report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
          <button
            onClick={onDownloadPdf}
            className="text-xs font-bold text-white duration-150 hover:bg-emerald-600 bg-emerald-700 flex items-center gap-1.5 py-1.5 px-4 rounded-xl cursor-pointer shadow-lg"
            title="Download report as PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={resetAll}
            className="text-xs font-medium text-zinc-400 hover:text-white flex items-center gap-1.5 py-1.5 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/60 rounded-xl cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Transcribe New</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transcript & Insights column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Concepts Block */}
          {result.keyConcepts && result.keyConcepts !== 'Key Concepts not specified.' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <Layout className="w-4 h-4 text-emerald-400" />
                  Key Concepts & Business Insights
                </h3>
                <button
                  onClick={() => copyToClipboard(result.keyConcepts || '', setCopiedConcepts)}
                  className="text-[11px] font-mono hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedConcepts ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedConcepts ? 'Copied' : 'Copy Takeaways'}
                </button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative">
                <div className="text-zinc-300 leading-relaxed text-xs space-y-3 whitespace-pre-wrap text-justify">
                  {result.keyConcepts}
                </div>
              </div>
            </div>
          )}

          {/* Complete Spoken Transcript */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Complete Spoken Transcript
              </h3>
              <button
                onClick={() => copyToClipboard(result.transcript, setCopiedTranscript)}
                className="text-[11px] font-mono hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedTranscript ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedTranscript ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 relative min-h-[300px]">
              <div className="text-zinc-305 leading-relaxed space-y-4 text-justify text-sm whitespace-pre-wrap">
                {result.transcript}
              </div>
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
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={onPrint}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-800/40 hover:bg-zinc-800/80 px-2.5 py-1 rounded transition-all cursor-pointer font-medium"
                  title="Print complete report dossier"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => copyToClipboard(result.summary, setCopiedSummary)}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 bg-zinc-800/40 hover:bg-zinc-800/80 px-2.5 py-1 rounded transition-all cursor-pointer font-medium"
                  title="Copy Executive Summary text"
                >
                  {copiedSummary ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
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
                <span className="text-zinc-300 font-mono capitalize">{mode}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Status</span>
                <span className="text-green-500 font-mono">Completed</span>
              </div>
              {mode === 'url' && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Target</span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-zinc-300 text-[10px] hover:text-white flex items-center gap-1 group truncate max-w-[140px]"
                  >
                    Open Video
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
