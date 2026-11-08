const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  getKuwaitTimeInfo,
  getArticlesWithDailyAutoUnlock,
  saveStoredArticles,
  generateNewDailyEdition
} = require('./lib/engine');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Autonomous 10:00 PM Kuwait Time Scheduler (when running as a persistent server)
let lastAutoPublishedDate = null;
setInterval(async () => {
  try {
    const kw = getKuwaitTimeInfo();
    if (kw.hour === 22 && kw.minute === 0 && lastAutoPublishedDate !== kw.isoDate) {
      lastAutoPublishedDate = kw.isoDate;
      console.log(`[Auto-Scheduler] 10:00 PM Kuwait Time reached (${kw.isoDate}). Generating daily column...`);
      await generateNewDailyEdition();
    }
  } catch (err) {
    console.error('[Auto-Scheduler] Error:', err.message);
  }
}, 30000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // API: Get all articles (starting from Today = Edition #1, auto-unlocking daily at 10 PM Kuwait time)
  if (pathname === '/api/articles' && req.method === 'GET') {
    const articles = getArticlesWithDailyAutoUnlock();
    const kuwaitTime = getKuwaitTimeInfo();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ kuwaitTime, articles }));
  }

  // API: React to a paragraph
  if (pathname === '/api/react' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { articleId, paragraphId, reactionType } = JSON.parse(body);
        const articles = getArticlesWithDailyAutoUnlock();
        const art = articles.find(a => a.id === articleId);
        if (art) {
          const para = art.paragraphs.find(p => p.id === paragraphId);
          if (para && para.reactions && typeof para.reactions[reactionType] === 'number') {
            para.reactions[reactionType] += 1;
            saveStoredArticles(articles);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            return res.end(JSON.stringify({ success: true, reactions: para.reactions }));
          }
        }
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Not found' }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: Cron endpoint
  if (pathname === '/api/cron') {
    try {
      const article = await generateNewDailyEdition();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, article }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  }

  // Static files
  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` ( بين قوسين ) - محرك الصحافة الساخرة يعمل الآن!`);
  console.log(` الرابط المحلي: http://localhost:${PORT}`);
  console.log(` الجدولة الآلية: يومياً 10:00 مساءً بتوقيت الكويت`);
  console.log(`====================================================`);
});
