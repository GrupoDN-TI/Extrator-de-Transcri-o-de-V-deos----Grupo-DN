import { useState, useEffect } from 'react';
import { Search, HardDrive, Loader2, PlayCircle, Clock, Database, ChevronDown } from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
}

interface DrivePickerProps {
  token: string;
  onSelect: (file: DriveFile) => void;
  onCancel: () => void;
}

export default function DrivePicker({ token, onSelect, onCancel }: DrivePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  useEffect(() => {
    fetchDriveFiles(true);
  }, [token]);

  const fetchDriveFiles = async (isInitial = true) => {
    if (isInitial) {
      setLoading(true);
      setError(null);
      setFiles([]);
    } else {
      setLoadingMore(true);
    }

    try {
      // Query videos from Google Drive
      const q = encodeURIComponent("mimeType contains 'video/' and trashed = false");
      let url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,createdTime)&pageSize=25`;
      
      // Append webpage pagination token
      if (!isInitial && nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to query Google Drive files: ${res.statusText}`);
      }

      const data = await res.json();
      const fetchedFiles = data.files || [];
      
      if (isInitial) {
        setFiles(fetchedFiles);
      } else {
        setFiles((prev) => [...prev, ...fetchedFiles]);
      }
      
      setNextPageToken(data.nextPageToken || null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch files from your Google Drive. Make sure Drive permissions are granted.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const getReadableSize = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 flex items-center gap-2">
              Google Drive Videos
            </h3>
            <p className="text-zinc-500 text-xs text-sans">Browse, paginate and select video files for AI transcription</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1.5 px-3 bg-[#0a0a0a] border border-zinc-800 rounded-lg cursor-pointer"
        >
          Close Drive File Explorer
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter Drive videos..."
          className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all text-xs text-zinc-300 font-mono"
        />
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
          <p className="text-zinc-600 text-xs font-mono">Accessing Google Drive files securely...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-center gap-2.5">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filteredFiles.length === 0 && (
        <div className="text-center py-16 space-y-3 border border-dashed border-zinc-800 rounded-xl">
          <Database className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-xs">No video files found in your Google Drive.</p>
          <p className="text-zinc-650 text-[10px] font-mono">Ensure you have files matching standard video formats in your account.</p>
        </div>
      )}

      {!loading && !error && filteredFiles.length > 0 && (
        <div className="space-y-4">
          <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 border border-zinc-800/80 rounded-xl p-2 bg-[#0a0a0a]">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onSelect(file)}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-zinc-900 transition-all cursor-pointer border border-transparent hover:border-zinc-800"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlayCircle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-zinc-200 text-xs font-mono truncate max-w-[280px] md:max-w-[400px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {file.mimeType}
                    </p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-zinc-500 font-mono flex-shrink-0 flex items-center gap-3 pl-2">
                  <span>{getReadableSize(file.size)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(file.createdTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {nextPageToken && (
            <div className="flex justify-center pt-2 border-t border-zinc-800/50">
              <button
                type="button"
                onClick={() => fetchDriveFiles(false)}
                disabled={loadingMore}
                className="text-xs text-zinc-400 hover:text-white font-medium flex items-center gap-2 py-2 px-5 bg-zinc-900/40 hover:bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>{loadingMore ? 'Loading More videos...' : 'Load More Videos'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
