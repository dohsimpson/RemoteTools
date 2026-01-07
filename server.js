const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch');

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
    // Enable CORS for all responses
    const setCORSHeaders = (response) => {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    };

    setCORSHeaders(res);

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Serve index.html for root
    if (req.url === '/' || req.url === '/index.html') {
        const html = fs.readFileSync('./index.html', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    // Serve Tailwind CSS and other CDNs (proxy them to avoid mixed content)
    if (req.url.startsWith('/cdn/')) {
        // Redirect to actual CDN
        const cdnPath = req.url.replace('/cdn/', 'https://cdn.');
        res.writeHead(302, { 'Location': cdnPath });
        res.end();
        return;
    }

    // Proxy requests to Roku
    if (req.url.startsWith('/proxy?')) {
        const url = new URL(req.url, `http://localhost:${PORT}`);
        const ip = url.searchParams.get('ip');
        const port = url.searchParams.get('port') || '8060';
        const path = url.searchParams.get('path');

        if (!ip || !path) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing ip or path parameter');
            return;
        }

        try {
            const rokuUrl = `http://${ip}:${port}${path}`;
            console.log(`[Proxy] ${req.method} ${rokuUrl}`);

            const rokuResponse = await fetch(rokuUrl, {
                method: 'POST',
                headers: { 'Content-Length': '0' },
                timeout: 5000
            });

            res.writeHead(rokuResponse.status, { 'Content-Type': 'text/html' });
            rokuResponse.body.pipe(res);
        } catch (err) {
            console.error(`[Proxy Error] ${err.message}`);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Proxy error: ' + err.message);
        }
        return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`Roku Remote Server running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
