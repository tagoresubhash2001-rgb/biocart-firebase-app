import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=UTF-8',
  '.txt': 'text/plain; charset=UTF-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Normalize and parse URL
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = parsedUrl.pathname;

  // Security: prevent directory traversal
  let safePath = path.normalize(path.join(DIST_DIR, pathname));
  if (!safePath.startsWith(DIST_DIR)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(safePath, (err, stats) => {
    let filePathToServe = safePath;

    if (err || stats.isDirectory()) {
      if (stats && stats.isDirectory()) {
        const indexPath = path.join(safePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          filePathToServe = indexPath;
        } else {
          filePathToServe = path.join(DIST_DIR, 'index.html');
        }
      } else {
        // SPA Fallback: Serve dist/index.html for client-side routing
        filePathToServe = path.join(DIST_DIR, 'index.html');
      }
    }

    const ext = path.extname(filePathToServe).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Set standard caching headers
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff2'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    const stream = fs.createReadStream(filePathToServe);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[BioCart App Hosting Server] Listening on port ${PORT}`);
});
