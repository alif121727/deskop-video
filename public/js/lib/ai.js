/**
 * Klien AI.
 *
 * Semua panggilan lewat /api/ai/* di server ini supaya tidak kena CORS.
 * Kunci API ikut dikirim per permintaan dan tidak disimpan di server.
 */

import { resolveKey, settings } from './store.js';

async function post(path, payload) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
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

/** Mulai pembuatan video. Kembalikan nama operasi untuk dipantau. */
export async function startVideo(payload) {
  const s = settings.get();
  const key = resolveKey('gemini');
  if (!key) throw new Error('Pembuatan video butuh kunci Google AI Studio. Buka tab Pengaturan.');
  const data = await post('/api/ai/video/start', {
    provider: 'gemini',
    apiKey: key,
    model: payload.model || s.videoModel,
    prompt: payload.prompt,
    aspectRatio: payload.aspectRatio,
    durationSeconds: payload.durationSeconds,
    resolution: payload.resolution,
    negativePrompt: payload.negativePrompt,
    image: payload.image,
  });
  return data.operationName;
}

export async function pollVideo(operationName) {
  const key = resolveKey('gemini');
  return post('/api/ai/video/poll', { apiKey: key, operationName });
}

export async function fetchVideoBlob(uri) {
  const key = resolveKey('gemini');
  const response = await fetch('/api/ai/video/fetch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ apiKey: key, uri }),
  });
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
export async function generateVideo({ prompt, aspectRatio, durationSeconds, resolution, negativePrompt, image, onProgress, signal }) {
  const operationName = await startVideo({ prompt, aspectRatio, durationSeconds, resolution, negativePrompt, image });
  onProgress?.('Pembuatan dimulai. Model sedang menyiapkan klip pertama...');

  const started = Date.now();
  const timeoutMs = 8 * 60 * 1000;

  while (true) {
    if (signal?.aborted) throw new Error('Pembuatan dibatalkan.');
    if (Date.now() - started > timeoutMs) throw new Error('Waktu tunggu habis. Coba lagi dengan prompt yang lebih pendek.');

    await new Promise((resolve) => setTimeout(resolve, 6000));
    const result = await pollVideo(operationName);

    if (result.failure) throw new Error(result.failure);
    if (result.done) {
      if (!result.asset) throw new Error('Operasi selesai tetapi tidak ada video yang dikembalikan.');
      return result.asset;
    }
    const seconds = Math.round((Date.now() - started) / 1000);
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
