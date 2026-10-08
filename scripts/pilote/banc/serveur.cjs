// Sert la page d'essai du Pilote (audit-ui/pilote-banc/index.html, produite par `npm run pilote:page -- --banc`)
// sur http://127.0.0.1:4777. Chemins absolus : le lanceur de prévisualisation n'a pas de dossier courant lisible.
const http = require('http');
const fs = require('fs');
const path = require('path');
const DOSSIER = path.resolve(__dirname, '../../../audit-ui/pilote-banc');
http.createServer((req, res) => {
  const f = path.join(DOSSIER, req.url === '/' ? 'index.html' : path.normalize(req.url).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(DOSSIER) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript', 'cache-control': 'no-store' });
  res.end(fs.readFileSync(f));
}).listen(4777, '127.0.0.1');
