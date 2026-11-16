/**
 * Klien AI.
 *
 * Semua panggilan lewat /api/ai/* di server ini supaya tidak kena CORS.
 * Kunci API ikut dikirim per permintaan dan tidak disimpan di server.
 */

import { resolveKey, settings } from './store.js';

async function post(path, payload) {
  let response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch hanya gagal seperti ini kalau permintaan tidak sampai ke server
    // (server mati atau koneksi putus), bukan karena jawaban penyedia AI.
    throw new Error('Tidak bisa menghubungi server. Pastikan server masih berjalan, lalu coba lagi.');
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Permintaan gagal (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
  return data;
}

export function hasKey(provider) {
  return Boolean(resolveKey(provider || settings.get().provider));
}

/** Minta teks dari model. */
export async function generateText({ system, prompt, provider, model, temperature, apiKey }) {
  const s = settings.get();
  const chosen = provider || s.provider;
  const key = apiKey || resolveKey(chosen);
  if (!key) throw new Error('Kunci API belum diisi. Buka tab Pengaturan.');
  const data = await post('/api/ai/text', {
    provider: chosen,
    apiKey: key,
    model: model || s.textModel,
    baseUrl: chosen === 'openai' ? s.openaiBaseUrl : undefined,
    system,
    prompt,
    temperature,
  });
  return data.text;
}

/** Mulai pembuatan video. Kembalikan { operationName, provider } untuk dipantau. */
export async function startVideo(payload) {
  const s = settings.get();
  const provider = payload.provider || s.videoProvider || 'gemini';
  const key = provider === 'gemini' ? resolveKey('gemini') : null;
  if (provider === 'gemini' && !key) {
    throw new Error('Pembuatan video butuh kunci Google AI Studio. Buka tab Pengaturan.');
  }
  const data = await post('/api/ai/video/start', {
    provider,
    apiKey: key,
    model: payload.model || s.videoModel,
    prompt: payload.prompt,
    aspectRatio: payload.aspectRatio,
    durationSeconds: payload.durationSeconds,
    resolution: payload.resolution,
    negativePrompt: payload.negativePrompt,
    image: payload.image,
  });
  return { operationName: data.operationName, provider: data.provider || provider };
}

/** Daftar model yang bisa dipanggil kunci ini, dipisah teks dan video. */
export async function listModels() {
  const key = resolveKey('gemini');
  if (!key) throw new Error('Kunci API belum diisi.');
  return post('/api/ai/models', { apiKey: key });
}

export async function pollVideo(operationName, provider = 'gemini') {
  const key = provider === 'gemini' ? resolveKey('gemini') : null;
  return post('/api/ai/video/poll', { apiKey: key, operationName, provider });
}

export async function fetchVideoBlob(uri) {
  const key = resolveKey('gemini');
  let response;
  try {
    response = await fetch('/api/ai/video/fetch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: key, uri }),
    });
  } catch {
    throw new Error('Tidak bisa menghubungi server untuk mengunduh video. Pastikan server masih berjalan, lalu coba lagi.');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Gagal mengunduh video.');
  }
  return response.blob();
}

/**
 * Jalankan pembuatan video sampai selesai.
 * onProgress dipanggil dengan status teks supaya antarmuka bisa menampilkan tahap.
 */
export async function generateVideo({ prompt, aspectRatio, durationSeconds, resolution, negativePrompt, image, provider, onProgress, signal }) {
  const started = await startVideo({ prompt, aspectRatio, durationSeconds, resolution, negativePrompt, image, provider });
  const operationName = started.operationName;
  const videoProvider = started.provider;
  onProgress?.('Pembuatan dimulai. Model sedang menyiapkan klip pertama...');

  const startTime = Date.now();
  const timeoutMs = 8 * 60 * 1000;

  while (true) {
    if (signal?.aborted) throw new Error('Pembuatan dibatalkan.');
    if (Date.now() - startTime > timeoutMs) throw new Error('Waktu tunggu habis. Coba lagi dengan prompt yang lebih pendek.');

    await new Promise((resolve) => setTimeout(resolve, 6000));
    const result = await pollVideo(operationName, videoProvider);

    if (result.failure) throw new Error(result.failure);
    if (result.done) {
      if (!result.asset) throw new Error('Operasi selesai tetapi tidak ada video yang dikembalikan.');
      return result.asset;
    }
    const seconds = Math.round((Date.now() - startTime) / 1000);
    onProgress?.(`Masih diproses... (${seconds} detik)`);
  }
}

/** Baca berkas gambar acuan menjadi base64 untuk image-to-video. */
export function fileToImagePayload(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Gambar acuan melebihi 12 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const data = result.includes(',') ? result.split(',')[1] : result;
      resolve({ data, mimeType: file.type || 'image/png', name: file.name });
    };
    reader.onerror = () => reject(new Error('Gagal membaca gambar acuan.'));
    reader.readAsDataURL(file);
  });
}
