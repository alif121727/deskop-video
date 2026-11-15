#!/usr/bin/env node
'use strict';

/**
 * Sinema AI Studio - server.
 *
 * Dua tugas saja:
 *   1. Menyajikan berkas statis dari ./public
 *   2. Menjadi perantara (proxy) ke penyedia AI supaya tidak kena CORS
 *
 * Kunci API TIDAK PERNAH disimpan di server. Kunci dikirim dari browser
 * pada setiap permintaan, dipakai sekali, lalu dibuang. Tidak ada log
 * yang menuliskan isi permintaan.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 12000);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY_BYTES = 40 * 1024 * 1024; // cukup untuk gambar acuan base64

const GEMINI_HOST = 'generativelanguage.googleapis.com';
const OPENAI_HOST = 'api.openai.com';
const ALLOWED_VIDEO_HOSTS = new Set([
  GEMINI_HOST,
  'storage.googleapis.com',
  'generativelanguage.googleapis.com',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/* ------------------------------------------------------------------ */
/* utilitas                                                            */
/* ------------------------------------------------------------------ */

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Badan permintaan terlalu besar.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON tidak valid.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** Ambil pesan kesalahan yang berguna dari respons penyedia AI. */
async function providerError(response) {
  let detail = '';
  try {
    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      detail = parsed?.error?.message || parsed?.message || text;
    } catch {
      detail = text;
    }
  } catch {
    detail = '';
  }
  const trimmed = String(detail || '').slice(0, 800);
  return `Penyedia AI menolak permintaan (HTTP ${response.status}). ${trimmed}`;
}

function assertHttpsUrl(raw, allowedHosts) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw Object.assign(new Error('URL tidak valid.'), { status: 400 });
  }
  if (url.protocol !== 'https:') {
    throw Object.assign(new Error('Hanya URL https yang diizinkan.'), { status: 400 });
  }
  if (allowedHosts && !allowedHosts.has(url.hostname)) {
    throw Object.assign(new Error(`Host ${url.hostname} tidak ada dalam daftar izin.`), { status: 400 });
  }
  return url;
}

function resolveOpenAiBase(raw) {
  const fallback = `https://${OPENAI_HOST}/v1`;
  if (!raw) return fallback;
  const url = assertHttpsUrl(raw);
  const host = url.hostname.toLowerCase();
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '::1', 'metadata.google.internal'];
  if (blocked.includes(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw Object.assign(new Error('Base URL lokal/privat tidak diizinkan.'), { status: 400 });
  }
  return url.toString().replace(/\/+$/, '');
}

/* ------------------------------------------------------------------ */
/* adapter penyedia AI                                                 */
/* ------------------------------------------------------------------ */

const GEMINI_TEXT_DEFAULT = 'gemini-2.5-flash';
const GEMINI_VIDEO_DEFAULT = 'veo-3.1-fast-generate-preview';
const OPENAI_TEXT_DEFAULT = 'gpt-4o-mini';

async function geminiText({ apiKey, model, system, prompt, temperature }) {
  const url = `https://${GEMINI_HOST}/v1beta/models/${encodeURIComponent(
    model || GEMINI_TEXT_DEFAULT
  )}:generateContent`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: typeof temperature === 'number' ? temperature : 0.8,
    },
  };
  if (system) payload.systemInstruction = { parts: [{ text: system }] };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p?.text || '').join('').trim();
  if (!text) {
    const reason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    throw Object.assign(
      new Error(`Model tidak mengembalikan teks.${reason ? ` Alasan: ${reason}.` : ''}`),
      { status: 502 }
    );
  }
  return { text, raw: data };
}

async function openAiText({ apiKey, model, system, prompt, baseUrl, temperature }) {
  const root = resolveOpenAiBase(baseUrl);
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(`${root}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || OPENAI_TEXT_DEFAULT,
      messages,
      temperature: typeof temperature === 'number' ? temperature : 0.8,
    }),
  });
  if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });

  const data = await response.json();
  const text = (data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw Object.assign(new Error('Model tidak mengembalikan teks.'), { status: 502 });
  return { text, raw: data };
}

/** Cari URI video / data base64 di dalam respons apa pun bentuknya. */
function findVideoAsset(node, depth = 0) {
  if (!node || depth > 8) return null;
  if (typeof node === 'string') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findVideoAsset(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === 'object') {
    const uri = node.uri || node.videoUri || node.gcsUri;
    if (typeof uri === 'string' && /^https?:\/\//.test(uri)) {
      return { uri, mimeType: node.mimeType || 'video/mp4' };
    }
    if (typeof node.bytesBase64Encoded === 'string' && node.bytesBase64Encoded.length > 64) {
      return { base64: node.bytesBase64Encoded, mimeType: node.mimeType || 'video/mp4' };
    }
    for (const value of Object.values(node)) {
      const found = findVideoAsset(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function geminiVideoStart({ apiKey, model, prompt, aspectRatio, durationSeconds, resolution, negativePrompt, image }) {
  const instance = { prompt };
  if (image?.data) {
    instance.image = {
      bytesBase64Encoded: image.data,
      mimeType: image.mimeType || 'image/png',
    };
  }
  const parameters = {};
  if (aspectRatio) parameters.aspectRatio = aspectRatio;
  if (durationSeconds) parameters.durationSeconds = Number(durationSeconds);
  if (resolution) parameters.resolution = resolution;
  if (negativePrompt) parameters.negativePrompt = negativePrompt;

  const url = `https://${GEMINI_HOST}/v1beta/models/${encodeURIComponent(
    model || GEMINI_VIDEO_DEFAULT
  )}:predictLongRunning`;

  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ instances: [instance], parameters }),
  });
}

async function geminiVideoPoll({ apiKey, operationName }) {
  const url = `https://${GEMINI_HOST}/v1beta/${operationName.replace(/^\/+/, '')}`;
  const response = await fetch(url, { headers: { 'x-goog-api-key': apiKey } });
  if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });
  const data = await response.json();
  const done = Boolean(data.done);
  const asset = done ? findVideoAsset(data.response || data) : null;
  const failure = data?.error?.message;
  return { done, asset, failure: failure || null, raw: data };
}

async function geminiVideoFetch({ apiKey, uri }) {
  const url = assertHttpsUrl(uri, ALLOWED_VIDEO_HOSTS);
  if (!url.searchParams.has('key')) url.searchParams.set('key', apiKey);
  const response = await fetch(url.toString(), { headers: { 'x-goog-api-key': apiKey } });
  if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });
  return response;
}

/* ------------------------------------------------------------------ */
/* router API                                                          */
/* ------------------------------------------------------------------ */

async function handleApi(req, res, pathname) {
  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, port: PORT, now: new Date().toISOString() });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Gunakan POST untuk endpoint ini.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, error.status || 400, { error: error.message });
  }

  try {
    if (pathname === '/api/ai/text') {
      const { provider = 'gemini', apiKey, model, system, prompt, baseUrl, temperature } = body;
      if (!apiKey) return sendJson(res, 400, { error: 'Kunci API belum diisi.' });
      if (!prompt) return sendJson(res, 400, { error: 'Prompt kosong.' });
      const result =
        provider === 'openai'
          ? await openAiText({ apiKey, model, system, prompt, baseUrl, temperature })
          : await geminiText({ apiKey, model, system, prompt, temperature });
      return sendJson(res, 200, { text: result.text });
    }

    if (pathname === '/api/ai/video/start') {
      const { provider = 'gemini', apiKey, model } = body;
      if (!apiKey) return sendJson(res, 400, { error: 'Kunci API belum diisi.' });
      if (provider !== 'gemini') {
        return sendJson(res, 400, {
          error:
            'Pembuatan video hanya didukung lewat Google Gemini/Veo. Untuk penyedia lain, salin prompt lalu tempel di tool video pilihan Anda.',
        });
      }
      if (!body.prompt) return sendJson(res, 400, { error: 'Prompt kosong.' });
      const response = await geminiVideoStart({ apiKey, model, ...body });
      if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });
      const data = await response.json();
      return sendJson(res, 200, { operationName: data.name, raw: data });
    }

    if (pathname === '/api/ai/video/poll') {
      const { apiKey, operationName } = body;
      if (!apiKey || !operationName) {
        return sendJson(res, 400, { error: 'Kunci API dan nama operasi wajib diisi.' });
      }
      const result = await geminiVideoPoll({ apiKey, operationName });
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/ai/video/fetch') {
      const { apiKey, uri } = body;
      if (!apiKey || !uri) return sendJson(res, 400, { error: 'Kunci API dan URI video wajib diisi.' });
      const upstream = await geminiVideoFetch({ apiKey, uri });
      res.writeHead(200, {
        'content-type': upstream.headers.get('content-type') || 'video/mp4',
        'cache-control': 'no-store',
      });
      const arrayBuffer = await upstream.arrayBuffer();
      return res.end(Buffer.from(arrayBuffer));
    }

    return sendJson(res, 404, { error: `Endpoint ${pathname} tidak dikenal.` });
  } catch (error) {
    const status = error.status || 500;
    return sendJson(res, status, { error: error.message || 'Terjadi kesalahan tak terduga.' });
  }
}

/* ------------------------------------------------------------------ */
/* berkas statis                                                       */
/* ------------------------------------------------------------------ */

function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const target = path.join(PUBLIC_DIR, relative);
  const normalized = path.normalize(target);

  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Akses ditolak.');
  }

  fs.stat(normalized, (error, stat) => {
    const filePath = !error && stat.isFile() ? normalized : path.join(PUBLIC_DIR, 'index.html');
    fs.readFile(filePath, (readError, buffer) => {
      if (readError) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Berkas tidak ditemukan.');
      }

      const extension = path.extname(filePath).toLowerCase();
      const isCode = ['.js', '.mjs', '.css', '.html'].includes(extension);
      const etag = `W/"${buffer.length.toString(16)}-${(stat?.mtimeMs || 0).toString(16)}"`;

      // Berkas kode selalu divalidasi ulang supaya perubahan langsung terlihat,
      // tanpa memaksa unduh ulang ketika isinya sebenarnya sama.
      if (isCode && req.headers['if-none-match'] === etag) {
        res.writeHead(304, { etag, 'cache-control': 'no-cache' });
        return res.end();
      }

      const headers = {
        'content-type': MIME[extension] || 'application/octet-stream',
        'cache-control': isCode ? 'no-cache' : 'public, max-age=600',
        etag,
      };
      if (stat?.mtime) headers['last-modified'] = stat.mtime.toUTCString();

      res.writeHead(200, headers);
      res.end(buffer);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Metode tidak diizinkan.');
  }
  return serveStatic(req, res, pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Sinema AI Studio siap di http://localhost:${PORT}`);
  console.log('Kunci API tidak disimpan di server. Isi lewat tab Pengaturan di browser.');
});
