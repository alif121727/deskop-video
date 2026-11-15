/**
 * Penyusun prompt.
 *
 * Fungsi di sini mengubah isian lima slot S.C.E.N.E. menjadi teks prompt
 * yang siap tempel, dalam dua bahasa, lalu memeriksa kualitasnya.
 */

import { AUDIO_CUES } from '../data/playbook.js';
import { VAGUE_WORDS } from '../data/templates.js';

export const SCENE_KEYS = ['subject', 'context', 'event', 'nuance', 'exclusions'];

export const SCENE_META = {
  subject: {
    label: 'Subject',
    idLabel: 'Subjek',
    question: 'Apa yang tampil di layar?',
  },
  context: {
    label: 'Context',
    idLabel: 'Konteks',
    question: 'Di mana, kapan, dan dari arah mana cahayanya?',
  },
  event: {
    label: 'Event',
    idLabel: 'Kejadian',
    question: 'Apa yang terjadi selama klip berjalan?',
  },
  nuance: {
    label: 'Nuance',
    idLabel: 'Nuansa',
    question: 'Gaya, suasana, dan gerakan kameranya seperti apa?',
  },
  exclusions: {
    label: 'Exclusions',
    idLabel: 'Larangan',
    question: 'Apa yang tidak boleh muncul?',
  },
};

/** Ganti {placeholder} dan [placeholder] dengan nilai dari slot. */
export function fillPlaceholders(text, values = {}) {
  if (!text) return '';
  let output = text;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    const pattern = new RegExp(`[{\\[]\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[}\\]]`, 'gi');
    output = output.replace(pattern, String(value));
  }
  return output;
}

/** Sisa placeholder yang belum diisi, dipakai untuk peringatan. */
export function remainingPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(/[{\[]([^{}\[\]]{1,60})[}\]]/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1).trim()))];
}

/**
 * Susun prompt akhir dari template.
 * order: 'scene' (S.C.E.N.E. berurutan) atau 'base' (mengikuti template).
 */
export function composePrompt({ template, scene = {}, values = {}, aspect, duration, audio = {}, order = 'scene', language = 'en' }) {
  const filledScene = {};
  for (const key of SCENE_KEYS) {
    filledScene[key] = fillPlaceholders(scene[key] || '', values).trim();
  }

  const blocks = [];

  if (order === 'scene') {
    const englishLabels = {
      subject: 'Subject',
      context: 'Context',
      event: 'Event',
      nuance: 'Nuance',
      exclusions: 'Exclusions',
    };
    const indoLabels = {
      subject: 'Subjek',
      context: 'Konteks',
      event: 'Kejadian',
      nuance: 'Nuansa',
      exclusions: 'Larangan',
    };
    const labels = language === 'id' ? indoLabels : englishLabels;
    for (const key of SCENE_KEYS) {
      if (!filledScene[key]) continue;
      blocks.push(`${labels[key]}: ${filledScene[key]}`);
    }
  } else if (template?.base) {
    const base = fillPlaceholders(template.base, { ...values, duration: duration ?? template.duration });
    blocks.push(
      fillPlaceholders(base, {
        subject: filledScene.subject,
        context: filledScene.context,
        event: filledScene.event,
        nuance: filledScene.nuance,
        exclusions: filledScene.exclusions,
      }).replace(/\s{2,}/g, ' ').trim()
    );
  }

  const soundLines = buildAudioLines(audio, language);
  if (soundLines.length) {
    blocks.push(language === 'id' ? `Suara:\n${soundLines.join('\n')}` : `Audio:\n${soundLines.join('\n')}`);
  }

  const technical = [];
  if (duration) technical.push(language === 'id' ? `durasi ${duration} detik` : `${duration}-second duration`);
  if (aspect) technical.push(language === 'id' ? `rasio ${aspect}` : `aspect ratio ${aspect}`);
  if (technical.length) {
    blocks.push(
      language === 'id'
        ? `Format: ${technical.join(', ')}.`
        : `Format: ${technical.join(', ')}.`
    );
  }

  return blocks.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildAudioLines(audio, language) {
  const lines = [];
  if (audio.dialog?.trim()) {
    lines.push(language === 'id' ? `Dialog: "${audio.dialog.trim()}"` : `Dialogue: "${audio.dialog.trim()}"`);
  }
  if (audio.sfx?.trim()) {
    lines.push(language === 'id' ? `Efek suara: ${audio.sfx.trim()}` : `Sound effects: ${audio.sfx.trim()}`);
  }
  if (audio.ambience?.trim()) {
    lines.push(language === 'id' ? `Suara latar: ${audio.ambience.trim()}` : `Ambience: ${audio.ambience.trim()}`);
  }
  return lines;
}

/** Periksa prompt dan kembalikan daftar temuan beserta saran perbaikan. */
export function auditPrompt(text, { scene = {}, aspect, duration, language = 'id' } = {}) {
  const findings = [];
  const lower = (text || '').toLowerCase();

  const missing = SCENE_KEYS.filter((key) => !String(scene[key] || '').trim());
  if (missing.length) {
    findings.push({
      level: 'warn',
      title: `${missing.length} slot S.C.E.N.E. masih kosong`,
      detail: `Belum diisi: ${missing.map((k) => SCENE_META[k].label).join(', ')}. Setiap slot yang kosong menjadi satu hal yang ditebak model.`,
    });
  }

  const leftovers = remainingPlaceholders(text);
  if (leftovers.length) {
    findings.push({
      level: 'warn',
      title: `${leftovers.length} placeholder belum diganti`,
      detail: `Masih tertulis: ${leftovers.slice(0, 6).join(', ')}.`,
    });
  }

  const vague = VAGUE_WORDS.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(lower));
  if (vague.length) {
    findings.push({
      level: 'warn',
      title: 'Ada kata penilaian tanpa ukuran',
      detail: `Kata: ${vague.join(', ')}. Ganti dengan ukuran yang bisa diperiksa, misalnya "maksimal 40 kata" atau "warna biru tua dan putih".`,
    });
  }

  const hasExclusionText = /\b(avoid|tanpa|hindari|jangan|no )/i.test(text || '');
  const hasExclusionSlot = Boolean(String(scene.exclusions || '').trim());
  if (!hasExclusionText && !hasExclusionSlot) {
    findings.push({
      level: 'warn',
      title: 'Tidak ada bagian larangan',
      detail:
        'Tambahkan apa yang tidak boleh muncul. Ini bagian yang paling sering dihilangkan dan paling sering menyelamatkan satu putaran regenerasi.',
    });
  }

  if (!/\b(ratio|rasio|\d+:\d+)/i.test(text || '')) {
    findings.push({
      level: 'info',
      title: 'Rasio belum disebut',
      detail: 'Sebut rasio sejak awal. Rasio yang salah membuat gambar dipotong oleh aplikasi tempat Anda mengunggahnya.',
    });
  }

  if (!/\b(\d+\s*(second|detik|s\b)|duration|durasi)/i.test(text || '')) {
    findings.push({
      level: 'info',
      title: 'Durasi belum disebut',
      detail: 'Satu klip hanya 4, 6, atau 8 detik. Sebut durasinya supaya tidak dipotong model.',
    });
  }

  if (duration && duration > 8) {
    findings.push({
      level: 'info',
      title: `Durasi ${duration} detik melebihi batas satu klip`,
      detail: 'Pecah menjadi beberapa klip di tab Papan Cerita, lalu sambung hasilnya.',
    });
  }

  const sentences = (text || '').split(/[.!?\n]/).filter((s) => s.trim().length > 0).length;
  if (sentences > 12) {
    findings.push({
      level: 'info',
      title: 'Prompt cukup panjang',
      detail: 'Pertimbangkan memindahkan bagian yang tetap (gaya merek, larangan) ke profil merek supaya tidak ditulis ulang tiap kali.',
    });
  }

  const hasAudio = /\b(dialog|dialogue|sound|suara|ambience|sfx|"|")/i.test(text || '');
  if (!hasAudio) {
    findings.push({
      level: 'info',
      title: 'Belum ada isyarat suara',
      detail: 'Model video menghasilkan suaranya sendiri. Menambahkan satu baris dialog atau efek suara mengubah klip dari rekaman bisu menjadi terasa jadi.',
    });
  }

  const score = Math.max(0, 100 - findings.filter((f) => f.level === 'warn').length * 15 - findings.filter((f) => f.level === 'info').length * 5);

  return { findings, score };
}

/** Naskah pembuka untuk isian otomatis dari satu kalimat ide. */
export function briefToScene(brief, extra = {}) {
  const clean = String(brief || '').trim();
  return {
    subject: clean || '',
    context: extra.context || '',
    event: extra.event || '',
    nuance: extra.nuance || '',
    exclusions: extra.exclusions || 'tulisan yang meleset, produk tambahan, latar ramai',
  };
}

export { AUDIO_CUES };
