#!/usr/bin/env node
/* Static file server for the Café Caye Mangé site.
   Binds 0.0.0.0 and uses the Freebuff-injected PORT. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function urlToPath(urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname);
  } catch (e) {
    return null;
  }
  // Strip query/hash, normalize, prevent path traversal
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  return path.join(ROOT, safe);
}

const server = http.createServer((req, res) => {
  let filePath = urlToPath(req.url);
  if (!filePath || !filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        // SPA-ish fallback: unknown paths get the home page
        return fs.readFile(path.join(ROOT, 'index.html'), (e2, home) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': MIME['.html'] });
          res.end(home);
        });
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Café Caye Mangé site running at http://0.0.0.0:${PORT}`);
});
