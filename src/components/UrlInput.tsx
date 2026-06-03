import { Search, FileText } from 'lucide-react';

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export default function UrlInput({ url, setUrl, onSubmit, disabled }: UrlInputProps) {
  return (
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
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-750 transition-all text-xs font-mono text-zinc-300"
        />
        <button
          onClick={onSubmit}
          disabled={disabled || !url}
          className="bg-zinc-100 text-zinc-950 px-8 py-3 rounded-xl font-bold text-xs hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Transcribe URL
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 font-mono">
        Uses Gemini to perform search grounding on video contexts, summarising information completely.
      </p>
    </div>
  );
}
