import React, { useState } from 'react';
import { ProcessStatus } from '../types';
import { Layers, Link, AlertCircle, Scaling } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface InputPanelProps {
  onProcess: (url: string, chunkHeight: number, resizeWidth: number | null) => void;
  status: ProcessStatus;
  error: string | null;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onProcess, status, error }) => {
  const [url, setUrl] = useState('https://picsum.photos/1200/2400');
  const [chunkHeight, setChunkHeight] = useState(800);
  const [resizeWidth, setResizeWidth] = useState('');
  const { themeColor } = useTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onProcess(url, Number(chunkHeight), resizeWidth ? Number(resizeWidth) : null);
  };

  const isLoading = status === ProcessStatus.LOADING_IMAGE || status === ProcessStatus.PROCESSING;

  return (
    <div className="w-full max-w-md p-6 bg-white/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl backdrop-blur-sm shadow-xl transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className={`p-3 rounded-lg bg-${themeColor}-500/10 transition-colors duration-300`}>
          <Layers className={`w-6 h-6 text-${themeColor}-500`} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Configuration</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Set parameters for the split</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Link className="w-4 h-4" /> Source Image URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/large-image.png"
            className={`w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all`}
            required
          />
          <p className="text-xs text-zinc-500">
            Any image URL is supported. Processing happens server-side to avoid CORS issues.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Layers className="w-4 h-4" /> Split Height (px)
          </label>
          <input
            type="number"
            min="100"
            max="10000"
            value={chunkHeight}
            onChange={(e) => setChunkHeight(Number(e.target.value))}
            className={`w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white transition-all`}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
            <Scaling className="w-4 h-4" /> Resize Width (px) <span className="text-xs text-zinc-400">(Optional)</span>
          </label>
          <input
            type="number"
            min="100"
            max="10000"
            value={resizeWidth}
            onChange={(e) => setResizeWidth(e.target.value)}
            placeholder="e.g. 1280"
            className={`w-full px-4 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none text-sm text-zinc-900 dark:text-white transition-all`}
          />
           <p className="text-xs text-zinc-500">
            Resizes image before splitting, maintains aspect ratio.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 
            ${isLoading 
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' 
              : `bg-${themeColor}-600 hover:bg-${themeColor}-500 text-white shadow-lg shadow-${themeColor}-500/20 active:scale-[0.98]`
            }`}
        >
          {isLoading ? 'Processing...' : 'Process Image'}
        </button>
      </form>
    </div>
  );
};
