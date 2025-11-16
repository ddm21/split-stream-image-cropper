import React, { useState, useCallback, useEffect } from 'react';
import { InputPanel } from './components/InputPanel';
import { ResultViewer } from './components/ResultViewer';
import { ApiDocsModal } from './components/ApiDocsModal';
import { Accordion } from './components/Accordion';
import { ProcessingResult, ProcessStatus } from './types';
import { splitImage } from './services/imageProcessor';
import { Scissors, Github, Terminal } from 'lucide-react';
import { useTheme, ThemeColor } from './contexts/ThemeContext';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const { themeColor, setThemeColor } = useTheme();
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        // Check if we already performed health check this session
        const healthCheckKey = 'splitstream_health_checked';
        const hasCheckedThisSession = sessionStorage.getItem(healthCheckKey);

        if (hasCheckedThisSession) {
          // Use cached result - backend was online when we last checked
          setBackendStatus('online');
          return;
        }

        // Only perform health check if not already done this session
        const response = await fetch('/api/health');
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
            // Mark that we've checked and backend is online
            sessionStorage.setItem(healthCheckKey, 'true');
            setBackendStatus('online');
            return;
          }
        }
        setBackendStatus('offline');
      } catch (error) {
        console.error('Backend health check failed:', error);
        setBackendStatus('offline');
      }
    };

    checkBackendStatus();
  }, []);

  const handleProcess = useCallback(async (url: string, chunkHeight: number, resizeWidth: number | null) => {
    try {
      setStatus(ProcessStatus.LOADING_IMAGE);
      setError(null);
      setResult(null);

      // Slight delay to allow UI to update status
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setStatus(ProcessStatus.PROCESSING);
      const data = await splitImage(url, chunkHeight, resizeWidth);
      
      setResult(data);
      setStatus(ProcessStatus.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while processing the image.');
      setStatus(ProcessStatus.ERROR);
    }
  }, []);

  const themeOptions: { id: ThemeColor; color: string }[] = [
    { id: 'indigo', color: 'bg-indigo-500' },
    { id: 'emerald', color: 'bg-emerald-500' },
    { id: 'rose', color: 'bg-rose-500' },
    { id: 'amber', color: 'bg-amber-500' },
    { id: 'violet', color: 'bg-violet-500' },
    { id: 'cyan', color: 'bg-cyan-500' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      
      {/* Left Sidebar (Controls) */}
      <aside className="w-full md:w-[400px] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden z-0 transition-colors duration-300">
        
        <header className="h-16 flex-shrink-0 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800 px-6">
          <div className={`flex items-center gap-2 text-${themeColor}-500 transition-colors duration-300`}>
            <Scissors className="w-6 h-6" />
            <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">SplitStream</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <InputPanel onProcess={handleProcess} status={status} error={error} />
            
            <div className="mt-8">
              <Accordion title="How it works">
                  <p>
                    This tool processes images server-side to handle any image URL, including those without CORS support.
                  </p>
                  <p className="mt-2">
                    Simply enter your image URL, set the chunk height, and optionally resize. The server will fetch, process, and split the image into chunks.
                  </p>
                  <p className="mt-2">
                    The output is generated as binary and ready for instant download.
                  </p>
              </Accordion>
            </div>
          </div>
        </div>
        
        {/* Theme Switcher Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Appearance</span>
          </div>
          
          <div className="flex items-center gap-3">
            {themeOptions.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setThemeColor(theme.id)}
                className={`w-6 h-6 rounded-full ${theme.color} transition-all duration-200 ${
                  themeColor === theme.id 
                    ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-950 ring-zinc-400 dark:ring-zinc-500 scale-110' 
                    : 'hover:scale-110 opacity-70 hover:opacity-100'
                }`}
                aria-label={`Set theme to ${theme.id}`}
              />
            ))}
          </div>

          <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-500">
            <span>&copy; {new Date().getFullYear()} SplitStream</span>
            <div className="flex items-center gap-2" title={`Backend API is ${backendStatus}`}>
              <span className={`w-2 h-2 rounded-full ${
                  backendStatus === 'online' ? 'bg-green-500 animate-pulse' :
                  backendStatus === 'offline' ? 'bg-red-500' :
                  'bg-yellow-500'
              }`}></span>
              <span className="font-medium">
                {
                  backendStatus === 'online' ? 'API Online' :
                  backendStatus === 'offline' ? 'API Offline' :
                  'Connecting'
                }
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Content (Results) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 flex-shrink-0 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl px-6">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">Results</h1>
          <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowDocs(true)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <Terminal className="w-4 h-4" /> API Reference
              </button>
              <a 
                href="https://github.com/ddm21/split-stream-image-cropper" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm px-3 py-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
          </div>
        </header>

        <section className="flex-1 bg-zinc-100/50 dark:bg-black/20 flex flex-col relative overflow-hidden transition-colors duration-300">
          {status === ProcessStatus.IDLE && !result && (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-400 dark:text-zinc-600 pointer-events-none">
              <div className="text-center">
                <Scissors className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Configure settings and click Process to start</p>
              </div>
            </div>
          )}

          {(status === ProcessStatus.LOADING_IMAGE || status === ProcessStatus.PROCESSING) && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm transition-colors duration-300 pointer-events-auto">
              <div className="flex flex-col items-center gap-4">
                <div className={`w-12 h-12 border-4 border-${themeColor}-500/30 border-t-${themeColor}-500 rounded-full animate-spin`}></div>
                <p className={`text-${themeColor}-600 dark:text-${themeColor}-200 font-medium animate-pulse`}>
                  {status === ProcessStatus.LOADING_IMAGE ? 'Fetching Source Image...' : 'Slicing Image Chunks...'}
                </p>
              </div>
            </div>
          )}

          {result && (
            <div className="flex-1 flex flex-col w-full h-full p-6 overflow-hidden">
              <ResultViewer result={result} />
            </div>
          )}
        </section>
      </main>
      
      <ApiDocsModal isOpen={showDocs} onClose={() => setShowDocs(false)} />
    </div>
  );
};

export default App;