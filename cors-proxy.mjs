import http from 'http';
import https from 'https';

const PORT = 3001;

const server = http.createServer((req, res) => {
  const targetUrl = decodeURIComponent(req.url.slice(1));
  if (!targetUrl) {
    res.writeHead(400);
    res.end('Missing target URL');
    return;
  }

  const parsedUrl = new URL(targetUrl);
  const client = parsedUrl.protocol === 'https:' ? https : http;

  const proxyReq = client.request(targetUrl, {
    method: req.method,
    headers: { ...req.headers, host: parsedUrl.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => console.log(`CORS proxy running on port ${PORT}`));
