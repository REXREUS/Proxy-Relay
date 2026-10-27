// Relay passthrough mirip netlifyRelay.js 9Router: target per-request via header
// x-relay-target + x-relay-path (lihat src/lib/network/netlifyRelay.js di decolua/9router).
// Tanpa env key, tanpa auth — murni forwarder, SSE stream passthrough.
const http = require("http");

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization, x-api-key, anthropic-version, x-relay-target, x-relay-path",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");

    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      return res.end();
    }
    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", service: "relay" }));
    }

    const target = req.headers["x-relay-target"];
    const relayPath = req.headers["x-relay-path"] || url.pathname + url.search;
    if (!target) {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: "Missing x-relay-target header" }));
    }

    const headers = { ...req.headers };
    delete headers.host;
    delete headers["x-relay-target"];
    delete headers["x-relay-path"];
    delete headers["content-length"];

    // collect body (AI payloads = JSON kecil; response tetap stream)
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    if (body) headers["content-length"] = Buffer.byteLength(body);

    try {
      const targetUrl = target.replace(/\/$/, "") + relayPath;
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });
      res.writeHead(upstream.status, { ...Object.fromEntries(upstream.headers), ...CORS });
      for await (const c of upstream.body) res.write(c);
      res.end();
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(e) }));
    }
  })
  .listen(process.env.PORT || 3000, () => console.log("relay listening"));
