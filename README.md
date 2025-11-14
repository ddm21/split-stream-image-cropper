# SplitStream Image Cropper

SplitStream is a high-performance image processing application built with React and TypeScript. It allows users to split large images into vertical chunks of specific heights. All processing happens server-side, enabling support for any image URL without CORS restrictions.

![SplitStream Banner](https://i.ibb.co/FbKTN9hL/demo.webp)

## 🚀 Features

- **Server-Side Processing**: All image processing happens on the server, eliminating CORS issues and supporting any image URL.
- **Smart Splitting**: Split ultra-high-resolution images into manageable chunks based on pixel height.
- **Image Resizing**: Optional resize parameter to resize images before splitting while maintaining aspect ratio.
- **Backend API**: Includes a Node.js/Express backend with authenticated API for programmatic use (API key required).
- **Download Options**: Download individual chunks or bundle everything into a single ZIP file from the UI.
- **Rate Limiting**: Configurable rate limiting to protect the API from abuse.
- **Modern UI**: Built with Tailwind CSS and responsive design.
- **Theming**: Robust light/dark mode and 6 customizable color themes that persist across sessions.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Backend**: Node.js, Express, Jimp
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Utilities**: JSZip (for compression)

## 📦 Running the Application

This project includes a unified server that runs both the frontend UI and the backend API.

1. **Install Node.js**: Ensure you have Node.js (v16+) and npm installed.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Create a new file named `.env` in the root of the project.
   - Set a secure `API_KEY` (required for `/api/v1/process` endpoint).
   - Optionally set `RATE_LIMIT_PER_MINUTE` to control rate limiting (default: 10).
   ```env
   # .env file
   API_KEY="your-secret-api-key-here"
   RATE_LIMIT_PER_MINUTE=20  # Optional: Number of requests per minute per IP (default: 10)
   ```

4. **Start the server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3001`. The same server also hosts the API endpoints.

## 🌐 Image URL Support

Since all processing happens server-side, **any image URL is supported**, including:
- Images from MinIO/S3 buckets (even without CORS)
- Images from any public URL
- Images from private servers (as long as the server can access them)
- HTTP and HTTPS URLs

No CORS configuration is required on the image source server!

## 💡 Usage Example

### Using the Web UI

1. Enter your image URL (e.g., `https://your-minio-bucket.com/image.jpg`)
2. Set the chunk height (e.g., `800` pixels)
3. Optionally set a resize width (e.g., `1280` pixels) to resize before splitting
4. Click "Process Image"
5. Download individual chunks or bundle all chunks into a ZIP file

### Using the API

**Example with cURL:**
```bash
curl -X POST https://your-domain.com/api/v1/process \
  -H "Content-Type: application/json" \
  -H "API_KEY: your-api-key-here" \
  -d '{
    "url": "https://example.com/large-image.jpg",
    "chunkHeight": 800,
    "resizeWidth": 1280
  }'
```

**Note:** The API key must match the `API_KEY` value set in your server's environment variables.

## 📖 API Reference

The backend server exposes an authenticated API endpoint for image processing.

> **💡 Tip:** Click the "API Reference" button in the app to see working credentials for testing!

### Authenticated API Endpoint

**Endpoint:** `POST /api/v1/process`

**Authentication:** Requires an `API_KEY` header matching the `API_KEY` in your `.env` file.

**Request Body (JSON):**
```json
{
  "url": "https://example.com/large-image.jpg",
  "chunkHeight": 800,
  "resizeWidth": 1280
}
```

**Parameters:**
- `url` (string, required): Direct URL of the source image to split
- `chunkHeight` (integer, required): Target height for each image chunk in pixels
- `resizeWidth` (integer, optional): Resize image to this width before splitting (maintains aspect ratio)

**Successful Response (JSON):**
The API returns a JSON object containing metadata and an array of chunks, with each image encoded as a Base64 data URI:

```json
{
  "originalUrl": "https://example.com/large-image.jpg",
  "totalWidth": 1920,
  "totalHeight": 2400,
  "chunkHeight": 800,
  "resizeWidth": 1280,
  "chunkCount": 3,
  "processingTimeMs": 1234,
  "chunks": [
    {
      "id": 0,
      "base64": "data:image/png;base64,...",
      "height": 800,
      "yOffset": 0
    },
    // ... more chunks
  ]
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License.