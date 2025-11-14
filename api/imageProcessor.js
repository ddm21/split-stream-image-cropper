const Jimp = require('jimp');
const fetch = require('node-fetch');

// Helper function to fetch image with multiple retry strategies
async function fetchImageBuffer(imageUrl) {
  const maxRetries = 2;
  let lastError;

  // Strategy 1: Direct fetch with browser headers (Cloudflare detection)
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[ImageProcessor] Attempt ${attempt}: Direct fetch with browser headers...`);
      const response = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000,
        redirect: 'follow'
      });

      console.log(`[ImageProcessor] Response status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.startsWith('image/') || contentType === '') {
          const buffer = await response.buffer();
          console.log(`[ImageProcessor] Successfully fetched ${buffer.length} bytes (attempt ${attempt})`);
          return buffer;
        }
      }

      if (response.status === 403 && attempt < maxRetries) {
        console.warn(`[ImageProcessor] Got 403, retrying with different approach...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.warn(`[ImageProcessor] Attempt ${attempt} failed: ${error.message}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  // If direct fetch failed with 403, try without strict Sec-Fetch headers
  try {
    console.log(`[ImageProcessor] Strategy 2: Fetch with minimal headers...`);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Node.js)'
      },
      timeout: 15000,
      redirect: 'follow'
    });

    console.log(`[ImageProcessor] Response status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const buffer = await response.buffer();
      console.log(`[ImageProcessor] Successfully fetched ${buffer.length} bytes (strategy 2)`);
      return buffer;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    lastError = error;
    console.error(`[ImageProcessor] Strategy 2 failed: ${error.message}`);
  }

  throw lastError || new Error('Failed to fetch image with all strategies');
}

/**
 * The main backend logic run in Node.js.
 * Splits the source image into chunks of specific height and returns them as base64 data URIs.
 */
const splitImageApi = async (imageUrl, targetChunkHeight, resizeWidth) => {
  const startTime = Date.now();

  let image;
  try {
    // 1. Load the source image using Jimp with proper headers and error handling
    console.log(`[ImageProcessor] Attempting to load image from: ${imageUrl}`);

    // Fetch image buffer with retry strategies
    let imageBuffer;
    try {
      imageBuffer = await fetchImageBuffer(imageUrl);
    } catch (fetchError) {
      console.error(`[ImageProcessor] Fetch error: ${fetchError.message}`);
      console.error(`[ImageProcessor] Fetch error stack:`, fetchError.stack);
      throw fetchError;
    }

    // Load image from buffer using Jimp
    image = await Jimp.read(imageBuffer);
  } catch (error) {
    console.error(`[ImageProcessor] Image loading failed: ${error.message}`);
    throw new Error(`Failed to load image from URL: ${error.message || 'Unknown error'}`);
  }

  // 1.5 Optionally resize the image
  if (resizeWidth && resizeWidth > 0 && image.bitmap.width !== resizeWidth) {
    await image.resize(resizeWidth, Jimp.AUTO);
  }
  
  const { width, height } = image.bitmap;

  // 2. Prepare splitting logic
  const chunks = [];
  let currentY = 0;
  let chunkId = 0;

  // 3. Iterate and slice the image
  while (currentY < height) {
    // Calculate the actual height of this chunk (the last one might be shorter)
    const actualChunkHeight = Math.min(targetChunkHeight, height - currentY);
    
    // Create a new image for the chunk by cloning and cropping
    const chunkImage = image.clone().crop(
      0, currentY, width, actualChunkHeight
    );

    // 4. Convert the chunk to a base64 data URI
    const base64Data = await chunkImage.getBase64Async(Jimp.MIME_PNG);

    chunks.push({
      id: chunkId,
      base64: base64Data,
      height: actualChunkHeight,
      yOffset: currentY,
    });

    currentY += actualChunkHeight;
    chunkId++;
  }

  const endTime = Date.now();

  // 5. Return a structured result object
  return {
    originalUrl: imageUrl,
    totalWidth: width,
    totalHeight: height,
    chunkHeight: targetChunkHeight,
    resizeWidth: resizeWidth || null,
    chunkCount: chunks.length,
    chunks,
    processingTimeMs: endTime - startTime,
  };
};

module.exports = { splitImageApi };