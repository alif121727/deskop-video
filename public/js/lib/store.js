/**
 * Penyimpanan lokal.
 *
 * Kunci API disimpan terpisah dan hanya di browser pengguna. Tidak ada
 * yang dikirim ke server ini selain pada saat memanggil penyedia AI.
 */

import { uid } from './utils.js';

// Di-ekspor ulang supaya view lama yang mengimpor `uid` dari store tetap jalan.
export { uid };

const NS = 'sinema-ai-studio';
const KEY_SECRET = `${NS}:keys`;
const KEY_PROJECT = `${NS}:projects`;
const KEY_SETTINGS = `${NS}:settings`;

function read(store, key, fallback) {
  try {
    const raw = store.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(store, key, value) {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const session = {
  get(key, fallback = null) {
    return read(sessionStorage, `${NS}:${key}`, fallback);
  },
  set(key, value) {
    return write(sessionStorage, `${NS}:${key}`, value);
  },
  remove(key) {
    sessionStorage.removeItem(`${NS}:${key}`);
  },
};

export const local = {
  get(key, fallback = null) {
    return read(localStorage, `${NS}:${key}`, fallback);
  },
  set(key, value) {
    return write(localStorage, `${NS}:${key}`, value);
  },
  remove(key) {
    localStorage.removeItem(`${NS}:${key}`);
  },
};

export const keys = {
  all() {
    return local.get(KEY_SECRET.replace(`${NS}:`, ''), {}) || {};
  },
  get(provider) {
    return this.all()[provider] || '';
  },
  set(provider, value) {
    const current = this.all();
    if (value) current[provider] = value;
    else delete current[provider];
    local.set('keys', current);
  },
};

export const DEFAULT_SETTINGS = {
  provider: 'gemini',
  textModel: 'gemini-3.5-flash',
  videoModel: 'veo-3.1-fast-generate-preview',
  videoProvider: 'hf',
  openaiBaseUrl: '',
  language: 'en',
  rememberKeys: false,
  brand: {
    name: '',
    product: '',
    style: '',
    palette: '',
    audience: '',
  },
};

export const settings = {
  get() {
    return { ...DEFAULT_SETTINGS, ...(local.get(KEY_SETTINGS.replace(`${NS}:`, ''), {}) || {}) };
  },
  set(patch) {
    const next = { ...this.get(), ...patch };
    local.set('settings', next);
    return next;
  },
  setBrand(patch) {
    const current = this.get();
    return this.set({ brand: { ...current.brand, ...patch } });
  },
};

export const projects = {
  all() {
    return local.get(KEY_PROJECT.replace(`${NS}:`, ''), []) || [];
  },
  save(project) {
    const list = this.all();
    const index = list.findIndex((p) => p.id === project.id);
    const record = { ...project, updatedAt: new Date().toISOString() };
    if (index >= 0) list[index] = record;
    else list.unshift(record);
    local.set('projects', list.slice(0, 200));
    return record;
  },
  remove(id) {
    local.set(
      'projects',
      this.all().filter((p) => p.id !== id)
    );
  },
  get(id) {
    return this.all().find((p) => p.id === id) || null;
  },
};

/** Kunci sementara: dipakai kalau pengguna tidak mencentang "ingat kunci". */
export function resolveKey(provider) {
  const s = settings.get();
  if (s.rememberKeys) return keys.get(provider);
  return session.get(`key:${provider}`, '') || keys.get(provider);
}

export function rememberKey(provider, value) {
  const s = settings.get();
  if (s.rememberKeys) keys.set(provider, value);
  else session.set(`key:${provider}`, value);
}
