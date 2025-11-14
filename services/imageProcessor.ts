import { ProcessedChunk, ProcessingResult } from '../types';

/**
 * Process image via backend API (server-side processing)
 * This avoids CORS issues and works with any image URL
 */
export const splitImage = async (
  imageUrl: string, 
  targetChunkHeight: number,
  resizeWidth: number | null
): Promise<ProcessingResult> => {
  try {
    const response = await fetch('/api/ui/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: imageUrl,
        chunkHeight: targetChunkHeight,
        resizeWidth: resizeWidth
      })
    });

    if (!response.ok) {
      let errorMessage = `Backend API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch (textError) {
          // If all else fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
      }
      throw new Error(errorMessage);
    }

    const apiResult = await response.json();
    
    // Convert base64 chunks to Blobs for consistency
    const chunks: ProcessedChunk[] = apiResult.chunks.map((chunk: any) => {
      // Convert base64 to blob
      const base64Data = chunk.base64.includes(',') 
        ? chunk.base64.split(',')[1] 
        : chunk.base64;
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      const dataUrl = URL.createObjectURL(blob);

      return {
        id: chunk.id,
        blob,
        dataUrl,
        height: chunk.height,
        yOffset: chunk.yOffset,
        sizeBytes: blob.size
      };
    });

    return {
      originalUrl: apiResult.originalUrl,
      totalWidth: apiResult.totalWidth,
      totalHeight: apiResult.totalHeight,
      chunkHeight: apiResult.chunkHeight,
      resizeWidth: apiResult.resizeWidth,
      chunkCount: apiResult.chunkCount,
      chunks,
      processingTimeMs: apiResult.processingTimeMs
    };
  } catch (error: any) {
    // Preserve the original error message
    const errorMessage = error.message || 'Unknown error occurred';
    console.error('Image processing error:', error);
    throw new Error(`Image processing failed: ${errorMessage}`);
  }
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};