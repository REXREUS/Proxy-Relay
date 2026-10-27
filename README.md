# 9Router Relay Proxy — Render

Relay passthrough mirip fitur **Proxy Pools** 9Router (`src/lib/network/netlifyRelay.js` di [decolua/9router](https://github.com/decolua/9router)), tapi untuk Node/Render. Target dikirim per-request via header `x-relay-target` + `x-relay-path` — **tanpa env var, tanpa key, tanpa state**. Mendukung SSE streaming (chat completions, dst.).

Zero dependencies — Node.js 18+ stdlib only.

## Arsitektur

```
9Router (Anda) ──x-relay-target──▶ Relay (Render) ──▶ endpoint AI provider
```

Relay dipanggil oleh 9Router sebagai outbound proxy pool (bypass blokir IP/region), atau oleh tool lain untuk meneruskan request ke gateway mana pun. Relay tidak menyimpan key — semua auth tetap di header asli request (`Authorization: Bearer sk-...` diteruskan apa adanya).

## Deploy ke Render

1. Push folder ini ke GitHub.
2. [Render](https://dashboard.render.com) → **New → Web Service** → connect repo:
   - **Runtime**: Node
   - **Build Command**: (kosong)
   - **Start Command**: `npm start`
3. Environment variables: tidak perlu apa-apa (`PORT` diset otomatis Render).
4. Health check: `GET /health` → `{"status":"ok","service":"relay"}`

## Pakai

Semua path diteruskan ke `x-relay-target` + `x-relay-path`:

```bash
curl https://your-service.onrender.com/api/health \
  -H "x-relay-target: https://your-9router.example.com" \
  -H "x-relay-path: /api/health"
```

Chat completion (OpenAI format):

```bash
curl https://your-service.onrender.com/relay \
  -H "x-relay-target: https://your-9router.example.com" \
  -H "x-relay-path: /v1/chat/completions" \
  -H "Authorization: Bearer NINEROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"AntiGravity","messages":[{"role":"user","content":"Hi"}]}'
```

Tanpa `x-relay-path`: path request asli dipakai. Tanpa `x-relay-target`: error 400.

## Endpoint

- `GET /health` — health check, tidak diteruskan.
- Semua path lain — diteruskan sesuai header relay.
- `OPTIONS` — CORS preflight, tidak diteruskan.

## Catatan

- ⚠️ **Tanpa auth**: siapa pun yang tahu URL relay bisa memakainya. Aman kalau hanya 9Router Anda yang tahu URL-nya (relay dipakai sebagai outbound pool). Kalau untuk publik, tambahkan secret header sendiri.
- SSE stream diteruskan tanpa buffer.
- Free tier Render sleep setelah idle → cold start ~30-60 detik pada request pertama.

## Jalankan lokal / VPS (PM2)

Lokal:

```bash
npm start
```

VPS — biar selalu jalan + auto-restart saat crash/reboot (pola sama seperti deployment 9Router):

```bash
npm install -g pm2
pm2 start server.js --name relay
pm2 save
pm2 startup   # ikuti instruksi yang muncul
```

Kelola:

```bash
pm2 logs relay
pm2 restart relay
pm2 stop relay
```
