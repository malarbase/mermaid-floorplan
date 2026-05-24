import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;
const HOST = 'localhost';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  // Normalize URL path
  let filePath = req.url === '/' || req.url === '' 
    ? path.join(__dirname, 'index.html')
    : path.join(__dirname, req.url.split('?')[0]);

  // Prevent directory traversal attacks
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  
  console.log('\n\x1b[36m%s\x1b[0m', '╔══════════════════════════════════════════════════════════════╗');
  console.log('\x1b[36m%s\x1b[0m \x1b[1m\x1b[32m%s\x1b[0m', '║ ', 'Floorplan Scale Calibrator & Dimension Annotator Tool      ║');
  console.log('\x1b[36m%s\x1b[0m', '╠══════════════════════════════════════════════════════════════╣');
  console.log('\x1b[36m%s\x1b[0m %s \x1b[4m\x1b[33m%s\x1b[0m %s', '║ ', 'Running locally at:', url, '         ║');
  console.log('\x1b[36m%s\x1b[0m %s', '║ ', 'Open the URL in your browser to load, calibrate & annotate. ║');
  console.log('\x1b[36m%s\x1b[0m', '║                                                              ║');
  console.log('\x1b[36m%s\x1b[0m %s', '║ ', 'Press Ctrl+C to terminate the server.                       ║');
  console.log('\x1b[36m%s\x1b[0m\n', '╚══════════════════════════════════════════════════════════════╝');

  // Attempt to open standard browser dynamically
  const startCmd = process.platform === 'darwin' 
    ? `open "${url}"` 
    : process.platform === 'win32' 
      ? `start ${url}` 
      : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      console.log(`\x1b[33mNote:\x1b[0m Unable to auto-launch browser: ${err.message}`);
      console.log(`Please manually navigate your browser to: ${url}`);
    } else {
      console.log('\x1b[32m✓ Browser window launched successfully!\x1b[0m');
    }
  });
});
