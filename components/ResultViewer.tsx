import React, { useState } from 'react';
import { ProcessingResult, ProcessedChunk } from '../types';
import { formatBytes } from '../services/imageProcessor';
import { Download, Image as ImageIcon, Clock, FileDigit, Archive, Check, Loader2, Scaling } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import JSZip from 'jszip';

interface ResultViewerProps {
  result: ProcessingResult;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
  const { themeColor } = useTheme();
  const [isZipping, setIsZipping] = useState(false);
  
  const handleDownload = (chunk: ProcessedChunk) => {
    const link = document.createElement('a');
    link.href = chunk.dataUrl;
    link.download = `chunk_${chunk.id}_${chunk.height}px.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folderName = `splitstream_images_${Date.now()}`;
      const folder = zip.folder(folderName);

      if (folder) {
        result.chunks.forEach((chunk) => {
          // Remove 'data:image/png;base64,' prefix if present, usually toBlob gives blob so we can just use it
          // Since we stored 'blob' in ProcessedChunk, we use it directly
          folder.file(`chunk_${chunk.id + 1}_${chunk.height}px.png`, chunk.blob);
        });

        const content = await zip.generateAsync({ type: "blob" });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${folderName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }
    } catch (error) {
      console.error("Failed to zip images", error);
      alert("Failed to create zip file. Please try again.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      {/* Header Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 flex-shrink-0 pointer-events-auto w-full">
        {result.resizeWidth && (
          <MetricCard 
            icon={<Scaling className="text-fuchsia-500 dark:text-fuchsia-400" />} 
            label="Resize Width" 
            value={`${result.resizeWidth}px`} 
          />
        )}
        <MetricCard 
          icon={<ImageIcon className="text-blue-500 dark:text-blue-400" />} 
          label="Output Dimensions" 
          value={`${result.totalWidth} x ${result.totalHeight}`} 
        />
        <MetricCard 
          icon={<LayersIcon className="text-purple-500 dark:text-purple-400" />} 
          label="Chunks Created" 
          value={result.chunks.length.toString()} 
        />
        <MetricCard 
          icon={<FileDigit className="text-emerald-500 dark:text-emerald-400" />} 
          label="Target Height" 
          value={`${result.chunkHeight}px`} 
        />
        <MetricCard 
          icon={<Clock className="text-orange-500 dark:text-orange-400" />} 
          label="Time Taken" 
          value={`${result.processingTimeMs.toFixed(0)}ms`} 
        />
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          Generated {result.chunks.length} chunks successfully
        </h3>
        
        <button
          onClick={handleDownloadAll}
          disabled={isZipping}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-md active:scale-95 ${
            isZipping 
              ? 'bg-zinc-400 cursor-wait' 
              : `bg-${themeColor}-600 hover:bg-${themeColor}-500 hover:shadow-lg hover:shadow-${themeColor}-500/20`
          }`}
        >
          {isZipping ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Compressing...
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Download All (ZIP)
            </>
          )}
        </button>
      </div>

      {/* Chunks Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full pointer-events-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 pointer-events-auto">
          {result.chunks.map((chunk) => (
            <div
              key={chunk.id}
              className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm pointer-events-auto"
            >
              {/* Preview */}
              <div className="aspect-video bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center">
                <img 
                  src={chunk.dataUrl} 
                  alt={`Chunk ${chunk.id}`} 
                  className="object-contain max-h-full w-full opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4 pointer-events-auto">
                   <button
                    onClick={() => handleDownload(chunk)}
                    className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 hover:bg-zinc-200 shadow-lg active:scale-95 transition-transform pointer-events-auto cursor-pointer"
                   >
                     <Download className="w-3 h-3" /> Download
                   </button>
                </div>
              </div>

              {/* Footer Info */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded">#{chunk.id + 1}</span>
                  <span>{formatBytes(chunk.sizeBytes)}</span>
                </div>
                <div>
                  H: <span className="text-zinc-700 dark:text-zinc-200 font-medium">{chunk.height}px</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }: { icon: React.ReactElement<{ className?: string }>, label: string, value: string }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center gap-4 shadow-sm transition-all hover:shadow-md">
    <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
      {React.cloneElement(icon, { className: `w-5 h-5 ${icon.props.className || ''}` })}
    </div>
    <div>
      <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase font-semibold tracking-wider">{label}</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">{value}</p>
    </div>
  </div>
);

const LayersIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
);
