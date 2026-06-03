import React from 'react';
import { UploadCloud, Video, FileText } from 'lucide-react';

interface LocalFileUploaderProps {
  localFile: File | null;
  dragActive: boolean;
  onDrag: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

export default function LocalFileUploader({
  localFile,
  dragActive,
  onDrag,
  onDrop,
  onChange,
  onSubmit,
}: LocalFileUploaderProps) {
  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-zinc-400 flex items-center gap-2 border-b border-transparent pb-0">
        <UploadCloud className="w-4 h-4" />
        Upload PC or Mobile Video
      </label>

      <div 
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive ? "border-zinc-100 bg-zinc-800/40" : "border-zinc-800 hover:border-zinc-700 bg-zinc-950"
        }`}
      >
        <input 
          type="file" 
          accept="video/*" 
          onChange={onChange} 
          id="local-file-input" 
          className="hidden" 
        />
        
        <div className="space-y-3">
          <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center mx-auto border border-zinc-800 animate-pulse">
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
            className="inline-block mt-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-805 text-zinc-350 hover:text-white px-4 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            Select File from Device
          </label>
        </div>
      </div>

      {localFile && (
        <div className="flex justify-end pt-2">
          <button
            onClick={onSubmit}
            className="bg-zinc-100 text-zinc-950 px-8 py-3 rounded-xl font-bold text-xs hover:bg-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Upload & Transcribe Video
          </button>
        </div>
      )}
    </div>
  );
}
