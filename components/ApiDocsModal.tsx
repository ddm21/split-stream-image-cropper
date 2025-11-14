import React, { useState } from 'react';
import { X, Terminal, Copy, Check, Key, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({ isOpen, onClose }) => {
  const { themeColor } = useTheme();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${themeColor}-500/10 rounded-lg border border-${themeColor}-500/20`}>
              <Terminal className={`w-5 h-5 text-${themeColor}-500`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">API Documentation</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Server-side integration reference</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Uses global scrollbar styles */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-zinc-900">

          {/* Public API Quick Start Section */}
          <section className="space-y-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-400/10 border-2 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-medium text-lg">
              <Terminal className="w-5 h-5" />
              <h3>🚀 Quick Start - Try it Now!</h3>
            </div>
            <p className="text-amber-800 dark:text-amber-200 text-sm">
              Use these credentials to test the API immediately. Rate limit: <strong>10 requests/minute</strong> (Fair use only).
            </p>
            <div className="space-y-2 text-sm font-mono">
              <div><span className="text-amber-700 dark:text-amber-300">Domain:</span> <span className="text-amber-900 dark:text-amber-100">https://split-stream-image-cropper.vercel.app</span></div>
              <div><span className="text-amber-700 dark:text-amber-300">API Key:</span> <span className="text-amber-900 dark:text-amber-100">u6wc2eEJRPdQaMdoGYetvgzs</span></div>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 italic">
              For production use or higher limits, clone this repository and host your own instance.
            </p>
          </section>

          {/* Authentication Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-medium text-lg">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3>Authentication</h3>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
              All API requests require valid authentication. You must include your API key in the HTTP headers of every request. 
              The server expects the header key to be <code className="text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-400/10 px-1.5 py-0.5 rounded text-xs">API_KEY</code>.
            </p>
            
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
               <div className="flex items-center gap-3 text-sm">
                 <Key className="w-4 h-4 text-zinc-500" />
                 <span className="text-zinc-500 dark:text-zinc-400">Environment Variable:</span>
                 <code className={`text-${themeColor}-600 dark:text-${themeColor}-300 bg-${themeColor}-100 dark:bg-${themeColor}-400/10 px-2 py-1 rounded font-mono`}>API_KEY</code>
               </div>
               <p className="text-xs text-zinc-500 mt-2 ml-7">
                 Ensure this environment variable is set in your deployment configuration.
               </p>
            </div>
          </section>

          {/* Endpoints Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-medium text-lg">
              <Terminal className="w-5 h-5 text-blue-500" />
              <h3>Endpoint: Process Image</h3>
            </div>
            
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 font-mono text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">POST</span>
              <span className="text-zinc-700 dark:text-zinc-300">/api/v1/process</span>
            </div>

            <div className="space-y-3">
               <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Request Body (JSON)</h4>
               <div className="grid grid-cols-1 gap-2">
                 <ParamRow name="url" type="string" required desc="Direct URL of the source image to split." />
                 <ParamRow name="chunkHeight" type="integer" required desc="Target height for each image chunk in pixels." />
                 <ParamRow name="resizeWidth" type="integer" desc="Resize image before splitting (maintains aspect ratio)." />
               </div>
            </div>
          </section>

          {/* Examples Section */}
          <section className="space-y-4">
            <h3 className="text-zinc-900 dark:text-white font-medium text-lg">Example Request</h3>
            <CodeBlock
              language="bash"
              code={`curl -X POST https://split-stream-image-cropper.vercel.app/api/v1/process \\
  -H "Content-Type: application/json" \\
  -H "API_KEY: u6wc2eEJRPdQaMdoGYetvgzs" \\
  -d '{
    "url": "https://example.com/large-image.jpg",
    "chunkHeight": 1200,
    "resizeWidth": 1280
  }'`}
            />
             <p className="text-xs text-zinc-500 mt-2">
                <strong>For self-hosted instances:</strong> Replace the domain with your hosted URL and the API key with your <code className="text-zinc-500">API_KEY</code> environment variable.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

const ParamRow = ({ name, type, required, desc }: any) => {
  const { themeColor } = useTheme();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 p-3 rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center gap-2 w-40 shrink-0">
        <span className={`font-mono text-${themeColor}-600 dark:text-${themeColor}-300 text-sm`}>{name}</span>
        {required && <span className={`text-[10px] bg-${themeColor}-500/20 text-${themeColor}-700 dark:text-${themeColor}-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider`}>Req</span>}
      </div>
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <span className="text-xs text-zinc-500 font-mono">{type}</span>
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{desc}</span>
      </div>
    </div>
  );
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleCopy}
          className="p-2 rounded-md bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm font-mono text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
