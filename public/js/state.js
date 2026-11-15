/** Keadaan bersama antar tab. */

import { TEMPLATES } from './data/templates.js';
import { SCENE_KEYS, fillPlaceholders } from './lib/prompt.js';
import { uid } from './lib/utils.js';

export const ROUTES = [
  { id: 'studio', label: 'Studio', glyph: '◎', kicker: 'Bangun prompt' },
  { id: 'library', label: 'Pustaka Template', glyph: '▤', kicker: '25 template' },
  { id: 'storyboard', label: 'Papan Cerita', glyph: '▦', kicker: 'Klip bersambung' },
  { id: 'plan', label: 'Rencana & Cuan', glyph: '◈', kicker: '30 hari' },
  { id: 'guide', label: 'Panduan Prompt', glyph: '✦', kicker: 'Cara menulis' },
  { id: 'projects', label: 'Proyek', glyph: '❏', kicker: 'Tersimpan' },
  { id: 'settings', label: 'Pengaturan', glyph: '⚙', kicker: 'Kunci & model' },
];

/** Nama yang diisi otomatis dan tidak perlu ditanyakan ke pengguna. */
const RESERVED_PLACEHOLDERS = new Set([
  'duration',
  'durasi',
  'ratio',
  'rasio',
  'aspect',
  ...SCENE_KEYS,
]);

/** Semua nama placeholder yang perlu diisi untuk sebuah template. */
export function collectPlaceholders(template) {
  const sources = [
    ...Object.values(template?.scene || {}),
    template?.base || '',
  ].join(' ');
  const found = sources.match(/[{\[]([^{}\[\]]{1,60})[}\]]/g) || [];
  const names = [];
  for (const raw of found) {
    const name = raw.slice(1, -1).trim();
    if (!name || /^\d/.test(name)) continue;
    if (RESERVED_PLACEHOLDERS.has(name.toLowerCase())) continue;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

export function newDraft(templateId = TEMPLATES[0].id) {
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  return {
    id: uid('draft'),
    name: template.name,
    templateId: template.id,
    scene: { ...template.scene },
    values: {},
    audio: { dialog: '', sfx: '', ambience: '' },
    aspect: template.aspects[0],
    duration: Math.min(8, template.duration),
    order: 'scene',
    language: 'en',
    negativePrompt: '',
    referenceImage: null,
    videoAsset: null,
    createdAt: new Date().toISOString(),
  };
}

export function newStoryboard(templateId = 'multi-scene') {
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  return {
    id: uid('board'),
    name: 'Papan Cerita Baru',
    templateId: template.id,
    lockDescription: '',
    aspect: template.aspects.includes('9:16') ? '9:16' : '16:9',
    shots: [
      { id: uid('shot'), beat: 'Beat 1 — Pembuka', description: '', duration: 8, audio: '', status: 'draft' },
      { id: uid('shot'), beat: 'Beat 2 — Produk', description: '', duration: 8, audio: '', status: 'draft' },
      { id: uid('shot'), beat: 'Beat 3 — Penutup', description: '', duration: 8, audio: '', status: 'draft' },
    ],
    createdAt: new Date().toISOString(),
  };
}

/**
 * Pindahkan pekerjaan Studio ke papan cerita.
 *
 * Yang dibawa hanya bagian yang memang sudah ditentukan pengguna: template,
 * rasio, deskripsi subjek sebagai kunci kontinuitas, dan isyarat suara.
 * Isi beat dibiarkan kosong karena satu klip Studio belum tentu satu cerita.
 */
export function seedStoryboardFromDraft() {
  const draft = state.draft;
  const board = newStoryboard(draft.templateId);
  board.aspect = draft.aspect;
  board.name = `${draft.name} — papan cerita`;
  board.lockDescription = fillPlaceholders(draft.scene.subject || '', draft.values).trim();
  board.shots[0].duration = draft.duration;
  const audio = [draft.audio.dialog, draft.audio.sfx, draft.audio.ambience].filter(Boolean);
  if (audio.length) board.shots[0].audio = audio.join(' · ');
  state.storyboard = board;
  return board;
}

export const state = {
  route: 'studio',
  draft: newDraft(),
  storyboard: newStoryboard(),
};

export function currentTemplate() {
  return TEMPLATES.find((t) => t.id === state.draft.templateId) || TEMPLATES[0];
}

export function setRoute(route) {
  state.route = route;
}
