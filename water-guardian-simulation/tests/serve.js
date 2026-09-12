#!/usr/bin/env node
/* Tiny static server for the simulator (optional — index.html also opens directly via file://). */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'simulator');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let p = path.normalize(path.join(root, decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
}).listen(8765, () => console.log('Water Guardian simulator → http://localhost:8765'));
