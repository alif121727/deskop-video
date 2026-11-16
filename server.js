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
// Layanan video gratis (Wan 2.2 di Hugging Face Spaces) untuk akun tanpa akses Veo.
// Bisa diganti lewat env HF_VIDEO_SPACE kalau Space bawaan sedang sibuk/penuh.
const HF_SPACE_HOST = process.env.HF_VIDEO_SPACE || 'upsampler-wan-2-2-14b-text-to-video.hf.space';
const ALLOWED_VIDEO_HOSTS = new Set([
  GEMINI_HOST,
  'storage.googleapis.com',
  'generativelanguage.googleapis.com',
  HF_SPACE_HOST,
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
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/* ------------------------------------------------------------------ */
/* utilitas                                                            */
/* ------------------------------------------------------------------ */

function sendJson(res, status, payload) {
  if (res.headersSent) return res.destroy();
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** decodeURIComponent yang tidak melempar pada alamat rusak (mis. "/%"). */
function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
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

  // Petunjuk bahasa manusia untuk kasus yang paling sering membingungkan.
  const hints = {
    400: 'Periksa kembali prompt dan gambar acuan.',
    401: 'Kunci API tampaknya salah atau sudah kedaluwarsa. Buat kunci baru di Google AI Studio.',
    403: 'Kunci API tidak punya izin untuk model ini. Pastikan penagihan aktif dan akses model dibuka.',
    404:
      'Model tidak tersedia untuk kunci ini. Untuk video, kunci Google AI Studio Anda perlu akses Veo (aktifkan penagihan lalu buka akses Veo). Untuk teks, ganti model di tab Pengaturan.',
    429: 'Kuota kunci API habis. Tunggu sebentar atau periksa kuota di Google AI Studio.',
    500: 'Penyedia AI sedang bermasalah. Coba lagi sebentar lagi.',
    503: 'Model sedang sibuk. Coba lagi sebentar lagi atau pilih model lain di tab Pengaturan.',
  };
  const hint = hints[response.status];
  return `Penyedia AI menolak permintaan (HTTP ${response.status}).${hint ? ` ${hint}` : ''}${
    trimmed ? ` Detail: ${trimmed}` : ''
  }`;
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
/* video gratis lewat Hugging Face Space (Wan 2.2)                     */
/* ------------------------------------------------------------------ */

/** Peta rasio aplikasi -> label dropdown milik Space. */
const HF_ASPECT = {
  '16:9': '16:9 (832x480)',
  '9:16': '9:16 (480x832)',
  '1:1': '1:1 (640x640)',
};

/** Durasi yang didukung Space (detik). */
function hfDuration(seconds) {
  const n = Number(seconds) || 4;
  return Math.min(8, Math.max(2, Math.round(n)));
}

/**
 * Mulai pembuatan video di Space. Mengembalikan event_id untuk dipantau.
 * Tanpa kunci API: layanan ini publik dan gratis.
 */
async function hfVideoStart({ prompt, aspectRatio, durationSeconds, negativePrompt }) {
  const url = `https://${HF_SPACE_HOST}/gradio_api/call/generate_video`;
  const body = {
    data: [
      prompt,
      HF_ASPECT[aspectRatio] || HF_ASPECT['16:9'],
      4, // steps: cepat, cukup untuk pratinjau
      negativePrompt || '',
      hfDuration(durationSeconds),
      1,
      1,
      42,
      true, // randomize_seed
    ],
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(`Layanan video gratis tidak merespons (HTTP ${response.status}). Coba lagi sebentar lagi.`),
      { status: 502 }
    );
  }
  const data = await response.json();
  if (!data.event_id) {
    throw Object.assign(new Error('Layanan video gratis tidak mengembalikan ID tugas.'), { status: 502 });
  }
  return data.event_id;
}

/**
 * Pantau hasil Space. Mengembalikan { done, asset, failure } seperti Veo.
 * Space memakai Server-Sent Events; satu permintaan bisa menahan sampai selesai.
 */
async function hfVideoPoll({ operationName }) {
  const url = `https://${HF_SPACE_HOST}/gradio_api/call/generate_video/${operationName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  let text = '';
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw Object.assign(
        new Error(`Layanan video gratis tidak merespons (HTTP ${response.status}).`),
        { status: 502 }
      );
    }
    text = await response.text();
  } catch (error) {
    if (error.name === 'AbortError') return { done: false, asset: null, failure: null };
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (/event:\s*error/.test(text)) {
    const detail = text.match(/data:\s*(.+)/)?.[1]?.trim();
    const message =
      !detail || detail === 'null'
        ? 'Layanan video gratis sedang penuh (kuota GPU publik habis) atau sibuk. Tunggu beberapa menit lalu coba lagi, atau pilih sumber "Google Veo" di Pengaturan.'
        : detail.slice(0, 400);
    return { done: true, asset: null, failure: message };
  }
  if (!/event:\s*complete/.test(text)) return { done: false, asset: null, failure: null };

  const payloadLine = text
    .split(/\n/)
    .filter((line) => line.startsWith('data:'))
    .pop();
  let parsed = null;
  try {
    parsed = JSON.parse(String(payloadLine).replace(/^data:\s*/, ''));
  } catch {
    return { done: true, asset: null, failure: 'Hasil video gratis tidak bisa dibaca.' };
  }
  const first = Array.isArray(parsed) ? parsed[0] : parsed;
  const uri = typeof first === 'string' ? first : first?.url || first?.path;
  if (!uri) return { done: true, asset: null, failure: 'Layanan video gratis tidak mengembalikan berkas.' };
  return { done: true, asset: { uri, mimeType: 'video/mp4' }, failure: null };
}

/**
 * Unduh berkas video dari sumbernya. Sumber Veo butuh kunci API; sumber
 * layanan gratis (Hugging Face Space) tidak.
 */
async function fetchVideoUpstream({ apiKey, uri }) {
  const url = assertHttpsUrl(uri, ALLOWED_VIDEO_HOSTS);
  if (url.hostname === HF_SPACE_HOST) {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw Object.assign(
        new Error(`Layanan video gratis tidak bisa mengirim berkas (HTTP ${response.status}).`),
        { status: 502 }
      );
    }
    return response;
  }
  if (!apiKey) throw Object.assign(new Error('Kunci API wajib diisi untuk video Veo.'), { status: 400 });
  return geminiVideoFetch({ apiKey, uri });
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

    if (pathname === '/api/ai/models') {
      const { apiKey } = body;
      if (!apiKey) return sendJson(res, 400, { error: 'Kunci API belum diisi.' });
      const response = await fetch(
        `https://${GEMINI_HOST}/v1beta/models?pageSize=200`,
        { headers: { 'x-goog-api-key': apiKey } }
      );
      if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });
      const data = await response.json();
      const models = data.models || [];
      const names = (list) => list.map((m) => String(m.name).replace(/^models\//, ''));
      const has = (m, method) => (m.supportedGenerationMethods || []).includes(method);
      return sendJson(res, 200, {
        // Veo tidak selalu muncul di ListModels; sediakan juga nama yang dikenal.
        video: names(models.filter((m) => has(m, 'predictLongRunning') || /veo/i.test(m.name))),
        text: names(models.filter((m) => has(m, 'generateContent'))),
      });
    }

    if (pathname === '/api/ai/video/start') {
      const { provider = 'gemini', apiKey, model } = body;
      if (!body.prompt) return sendJson(res, 400, { error: 'Prompt kosong.' });

      // Layanan gratis (Wan 2.2) tidak butuh kunci API.
      if (provider === 'hf') {
        const operationName = await hfVideoStart(body);
        return sendJson(res, 200, { operationName, provider: 'hf' });
      }

      if (!apiKey) return sendJson(res, 400, { error: 'Kunci API belum diisi.' });
      if (provider !== 'gemini') {
        return sendJson(res, 400, {
          error:
            'Pembuatan video hanya didukung lewat Google Gemini/Veo. Untuk penyedia lain, salin prompt lalu tempel di tool video pilihan Anda.',
        });
      }
      const response = await geminiVideoStart({ apiKey, model, ...body });
      if (!response.ok) throw Object.assign(new Error(await providerError(response)), { status: 502 });
      const data = await response.json();
      return sendJson(res, 200, { operationName: data.name, raw: data });
    }

    if (pathname === '/api/ai/video/poll') {
      const { apiKey, operationName, provider = 'gemini' } = body;
      if (!operationName) return sendJson(res, 400, { error: 'Nama operasi wajib diisi.' });
      if (provider === 'hf') {
        const result = await hfVideoPoll({ operationName });
        return sendJson(res, 200, result);
      }
      if (!apiKey) return sendJson(res, 400, { error: 'Kunci API dan nama operasi wajib diisi.' });
      const result = await geminiVideoPoll({ apiKey, operationName });
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/ai/video/fetch') {
      const { apiKey, uri } = body;
      if (!uri) return sendJson(res, 400, { error: 'URI video wajib diisi.' });
      const upstream = await fetchVideoUpstream({ apiKey, uri });
      // Baca seluruh isi lebih dulu. Kalau unduhan gagal di tengah jalan, error
      // ditangani catch di bawah tanpa terlanjur mengirim header 200.
      const arrayBuffer = await upstream.arrayBuffer();
      res.writeHead(200, {
        'content-type': upstream.headers.get('content-type') || 'video/mp4',
        'cache-control': 'no-store',
        'content-length': arrayBuffer.byteLength,
      });
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
  const decoded = pathname === '/' ? 'index.html' : safeDecode(pathname);
  if (decoded === null) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Alamat berkas tidak valid.');
  }
  const relative = decoded.replace(/^\/+/, '');
  const target = path.join(PUBLIC_DIR, relative);
  const normalized = path.normalize(target);

  if (!normalized.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Akses ditolak.');
  }

  fs.stat(normalized, (error, stat) => {
    const filePath = !error && stat.isFile() ? normalized : path.join(PUBLIC_DIR, 'index.html');
    fs.stat(filePath, (statError, fileStat) => {
      if (statError || !fileStat.isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Berkas tidak ditemukan.');
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = MIME[extension] || 'application/octet-stream';
      const isCode = ['.js', '.mjs', '.css', '.html'].includes(extension);
      const isMedia = ['.mp4', '.webm'].includes(extension);
      const etag = `W/"${fileStat.size.toString(16)}-${fileStat.mtimeMs.toString(16)}"`;

      // Berkas kode selalu divalidasi ulang supaya perubahan langsung terlihat,
      // tanpa memaksa unduh ulang ketika isinya sebenarnya sama.
      if (isCode && req.headers['if-none-match'] === etag) {
        res.writeHead(304, { etag, 'cache-control': 'no-cache' });
        return res.end();
      }

      const headers = {
        'content-type': contentType,
        'cache-control': isCode ? 'no-cache' : 'public, max-age=600',
        etag,
        'last-modified': fileStat.mtime.toUTCString(),
      };

      // Media: dukung Range (HTTP 206) supaya pemutar bisa melompat/seek dan
      // tidak perlu memuat seluruh berkas ke memori. Kirim aliran langsung.
      if (isMedia) {
        headers['accept-ranges'] = 'bytes';
        const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || '').trim());
        if (range) {
          let start = range[1] === '' ? fileStat.size - Number(range[2]) : Number(range[1]);
          let end = range[2] === '' || range[1] === '' ? fileStat.size - 1 : Number(range[2]);
          if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileStat.size) {
            res.writeHead(416, { 'content-range': `bytes */${fileStat.size}` });
            return res.end();
          }
          end = Math.min(end, fileStat.size - 1);
          res.writeHead(206, {
            ...headers,
            'content-range': `bytes ${start}-${end}/${fileStat.size}`,
            'content-length': end - start + 1,
          });
          if (req.method === 'HEAD') return res.end();
          return fs.createReadStream(filePath, { start, end }).pipe(res);
        }
        res.writeHead(200, { ...headers, 'content-length': fileStat.size });
        if (req.method === 'HEAD') return res.end();
        return fs.createReadStream(filePath).pipe(res);
      }

      fs.readFile(filePath, (readError, buffer) => {
        if (readError) {
          res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
          return res.end('Berkas tidak ditemukan.');
        }
        res.writeHead(200, headers);
        res.end(buffer);
      });
    });
  });
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    pathname = url.pathname;
  } catch {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Alamat permintaan tidak valid.');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    });
    return res.end();
  }

  try {
    if (pathname.startsWith('/api/')) {
      // Tangani penolakan promise di sini supaya satu permintaan gagal tidak
      // mematikan seluruh server (yang membuat browser menampilkan
      // "Failed to fetch" pada permintaan berikutnya).
      return handleApi(req, res, pathname).catch((error) => {
        console.error('Permintaan API gagal:', error?.message || error);
        sendJson(res, error?.status || 500, { error: error?.message || 'Terjadi kesalahan tak terduga.' });
      });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Metode tidak diizinkan.');
    }
    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error('Permintaan gagal:', error?.message || error);
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Terjadi kesalahan pada server.');
    } else {
      res.destroy();
    }
  }
});

// Permintaan HTTP yang rusak (mis. baris permintaan cacat) tidak boleh
// menjatuhkan proses; balas lalu tutup koneksi.
server.on('clientError', (error, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  else socket.destroy();
});

// Galat saat bind (mis. port sudah dipakai) dilaporkan dengan jelas lalu keluar
// dengan kode bukan nol, supaya pengawas tahu ini gagal dan tidak berputar cepat.
server.on('error', (error) => {
  console.error(`Tidak bisa memulai server di ${HOST}:${PORT} — ${error.code || error.message}`);
  process.exit(1);
});

// Jaring pengaman terakhir untuk galat tak terduga pada permintaan: catat, jangan
// matikan proses, supaya aplikasi tetap melayani permintaan berikutnya. (Galat
// saat bind sudah ditangani di atas dengan keluar terkendali.)
process.on('uncaughtException', (error) => {
  console.error('uncaughtException:', error?.stack || error);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason?.stack || reason);
});

server.listen(PORT, HOST, () => {
  console.log(`Sinema AI Studio siap di http://localhost:${PORT}`);
  console.log('Kunci API tidak disimpan di server. Isi lewat tab Pengaturan di browser.');
});
