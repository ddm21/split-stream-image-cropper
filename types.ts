export interface ProcessedChunk {
  id: number;
  blob: Blob;
  dataUrl: string;
  height: number;
  yOffset: number;
  sizeBytes: number;
}

export interface ProcessingResult {
  originalUrl: string;
  totalWidth: number;
  totalHeight: number;
  chunkHeight: number;
  resizeWidth?: number | null;
  chunkCount: number;
  chunks: ProcessedChunk[];
  processingTimeMs: number;
}

export enum ProcessStatus {
  IDLE = 'IDLE',
  LOADING_IMAGE = 'LOADING_IMAGE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}