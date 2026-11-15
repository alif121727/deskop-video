/**
 * Papan cerita: memecah cerita menjadi klip 4/6/8 detik.
 *
 * Bagian terpenting di layar ini adalah kunci kontinuitas. Model tidak
 * mengingat klip sebelumnya, jadi deskripsi subjek harus diulang dengan
 * kata yang sama persis di setiap klip.
 */

import { VIDEO_LIMITS } from '../data/playbook.js';
import { TEMPLATES } from '../data/templates.js';
import { state } from '../state.js';
import { el, clear, qs, toast, copyText, downloadText, aspectToNumber } from '../lib/utils.js';
import { projects, resolveKey, uid } from '../lib/store.js';
import { generateVideo } from '../lib/ai.js';

let boardRefs = {};

export function renderStoryboard() {
  const view = el('div', { class: 'view' });
  const board = state.storyboard;
  boardRefs = {};

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Papan cerita · klip bersambung']),
        el('h1', {}, ['Cerita utuh disusun dengan menyambung klip']),
        el('p', {}, [
          'Satu klip hanya memuat satu gerakan. Cerita yang panjang dipecah menjadi beberapa klip, lalu disambung saat penyuntingan.',
        ]),
      ]),
      el('div', { class: 'hstack' }, [
        el('button', { class: 'btn', type: 'button', onclick: addShot }, ['+ Tambah klip']),
        el('button', { class: 'btn', type: 'button', onclick: saveBoard }, ['Simpan']),
        el('button', { class: 'btn btn--primary', type: 'button', onclick: exportBoard }, ['Ekspor']),
      ]),
    ])
  );

  view.append(buildLimitsPanel());
  view.append(buildBoardHeader());
  view.append(buildLockPanel());

  const list = el('div', { id: 'shot-list', style: 'margin-top:18px' });
  boardRefs.list = list;
  view.append(list);
  paintShots();

  return view;
}

function buildLimitsPanel() {
  const panel = el('section', { class: 'panel' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Batas yang menentukan cara menulis']),
        el('p', { class: 'panel__note' }, ['Mengabaikan batas ini membuat hasilnya terasa terpotong.']),
      ]),
    ])
  );

  panel.append(
    el('div', { class: 'grid grid--two' }, [
      el('div', { class: 'note' }, [VIDEO_LIMITS.note]),
      el('div', { class: 'note note--amber' }, [VIDEO_LIMITS.continuity]),
    ])
  );

  return panel;
}

function buildBoardHeader() {
  const board = state.storyboard;
  const panel = el('section', { class: 'panel', style: 'margin-top:18px' });
  panel.append(el('div', { class: 'panel__title', style: 'margin-bottom:14px' }, ['Pengaturan papan']));

  const nameInput = el('input', {
    type: 'text',
    value: board.name,
    oninput: (event) => {
      board.name = event.target.value;
    },
  });

  const templateSelect = el('select', {
    onchange: (event) => {
      board.templateId = event.target.value;
    },
  });
  for (const template of TEMPLATES) {
    templateSelect.append(
      el('option', { value: template.id, selected: template.id === board.templateId }, [template.name])
    );
  }

  const aspectSelect = el('select', {
    onchange: (event) => {
      board.aspect = event.target.value;
      paintShots();
    },
  });
  for (const aspect of VIDEO_LIMITS.aspects) {
    aspectSelect.append(el('option', { value: aspect, selected: board.aspect === aspect }, [aspect]));
  }

  panel.append(
    el('div', { class: 'grid grid--two' }, [
      el('div', { class: 'field' }, [el('label', {}, ['Nama papan cerita']), nameInput]),
      el('div', { class: 'field' }, [el('label', {}, ['Template acuan']), templateSelect]),
      el('div', { class: 'field' }, [el('label', {}, ['Rasio papan']), aspectSelect]),
    ])
  );

  return panel;
}

function buildLockPanel() {
  const board = state.storyboard;
  const panel = el('section', { class: 'panel', style: 'margin-top:18px' });

  const input = el('textarea', {
    rows: 2,
    placeholder:
      'Contoh: perempuan berkemeja biru dengan rambut diikat, botol madu 250 ml berlabel kuning',
    oninput: (event) => {
      board.lockDescription = event.target.value;
      updateLockLine();
      for (const shot of board.shots) updateShotPreview(shot);
    },
  });
  input.value = board.lockDescription || '';

  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Kunci kontinuitas']),
        el('p', { class: 'panel__note' }, [
          'Tulis deskripsi subjek dengan kata yang sama persis seperti yang akan muncul di setiap klip. Jangan menulis "perempuan tadi" di klip kedua.',
        ]),
      ]),
    ]),
    input
  );

  const lockLine = el('div', { class: 'lockline', id: 'lock-line', style: 'margin-top:12px; display:none' }, [
    el('span', {}, ['Kalimat yang diulang:']),
    el('code', { id: 'lock-code' }, [board.lockDescription || '']),
    el('button', {
      class: 'btn btn--small btn--ghost',
      type: 'button',
      onclick: async () => {
        await copyText(state.storyboard.lockDescription || '');
        toast('Kalimat kunci disalin.', 'success');
      },
    }, ['Salin']),
  ]);
  panel.append(lockLine);

  const updateLockLine = () => {
    const value = state.storyboard.lockDescription || '';
    lockLine.style.display = value ? '' : 'none';
    const code = qs('#lock-code');
    if (code) code.textContent = value;
  };
  updateLockLine();

  return panel;
}

function addShot() {
  const board = state.storyboard;
  board.shots.push({
    id: uid('shot'),
    beat: `Beat ${board.shots.length + 1}`,
    description: '',
    duration: 8,
    audio: '',
    status: 'draft',
  });
  paintShots();
}

function paintShots() {
  const list = boardRefs.list;
  if (!list) return;
  clear(list);
  const board = state.storyboard;

  const total = board.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  const frame = el('div', { class: 'frame' }, [
    el('div', { class: 'frame__safe' }),
    el('div', { class: 'frame__inner' }, [
      `${board.aspect} · ${board.shots.length} klip · total ${total} detik`,
      el('div', {}, ['Area aman di dalam garis putus-putus. Teks penting jangan diletakkan di luar garis.']),
    ]),
  ]);
  frame.style.aspectRatio = String(aspectToNumber(board.aspect));

  list.append(frame);

  board.shots.forEach((shot, index) => list.append(buildShotCard(shot, index)));
}

function buildShotCard(shot, index) {
  const board = state.storyboard;

  const beatInput = el('input', {
    type: 'text',
    value: shot.beat,
    oninput: (event) => {
      shot.beat = event.target.value;
    },
  });

  const durationSelect = el('select', {
    onchange: (event) => {
      shot.duration = Number(event.target.value);
      paintShots();
    },
  });
  for (const duration of VIDEO_LIMITS.durations) {
    durationSelect.append(
      el('option', { value: String(duration), selected: Number(shot.duration) === duration }, [
        `${duration} detik`,
      ])
    );
  }

  const desc = el('textarea', {
    rows: 3,
    placeholder:
      'Satu gerakan saja. Contoh: kamera menyorot mendekat perlahan ke botol madu di atas talenan, sinar pagi menembus cairan.',
    oninput: (event) => {
      shot.description = event.target.value;
      updateShotPreview(shot);
    },
  });
  desc.value = shot.description || '';

  const audio = el('input', {
    type: 'text',
    placeholder: 'Contoh: Dialog "Madunya masih asli." · suara sendok menyentuh gelas',
    oninput: (event) => {
      shot.audio = event.target.value;
      updateShotPreview(shot);
    },
  });
  audio.value = shot.audio || '';

  const statusChip = el(
    'span',
    { class: `chip ${shot.status === 'done' ? 'chip--jade' : shot.status === 'error' ? 'chip--ember' : ''}` },
    [shot.status === 'done' ? 'video jadi' : shot.status === 'error' ? 'gagal' : 'belum dibuat']
  );

  const card = el('article', { class: 'shot' }, [
    el('div', { class: 'shot__num' }, [String(index + 1).padStart(2, '0')]),
    el('div', {}, [
      el('div', { class: 'shot__grid' }, [
        el('div', { class: 'field' }, [el('label', {}, ['Beat']), beatInput]),
        el('div', { class: 'field' }, [el('label', {}, ['Durasi']), durationSelect]),
        el('div', { class: 'field shot__desc' }, [
          el('label', {}, ['Deskripsi gambar — satu gerakan']),
          desc,
        ]),
        el('div', { class: 'field shot__desc' }, [el('label', {}, ['Isyarat suara']), audio]),
        el('div', { class: 'shot__foot' }, [
          statusChip,
          el('button', {
            class: 'btn btn--small',
            type: 'button',
            onclick: async () => {
              await copyText(shotPrompt(shot));
              toast(`Prompt klip ${index + 1} disalin.`, 'success');
            },
          }, ['Salin prompt klip']),
          el('button', {
            class: 'btn btn--small btn--primary',
            type: 'button',
            onclick: (event) => runShot(event.currentTarget, shot, index),
          }, ['▶ Buat klip ini']),
          el('span', { class: 'spacer' }),
          el('button', {
            class: 'btn btn--small btn--ghost',
            type: 'button',
            onclick: () => {
              board.shots.splice(index, 1);
              paintShots();
            },
          }, ['Hapus']),
        ]),
        el('div', { class: 'shot__desc' }, [
          el('div', { class: 'field__label' }, ['Prompt klip ini']),
          el('div', {
            class: 'mono',
            'data-shot-preview': shot.id,
            style:
              'white-space:pre-wrap; line-height:1.6; margin-top:6px; padding:10px 12px; border:1px solid var(--line); border-radius:6px; background:rgba(11,10,9,.5); color:#e8dccb; max-height:200px; overflow:auto',
          }, [shotPrompt(shot)]),
        ]),
      ]),
      el('div', { class: 'video-wrap', id: `shot-video-${shot.id}`, style: 'margin-top:12px' }),
    ]),
  ]);

  if (shot.videoAsset) {
    const host = card.querySelector(`#shot-video-${shot.id}`);
    host.append(buildPreview(shot.videoAsset));
  }

  return card;
}

/** Perbarui pratinjau prompt satu klip tanpa membangun ulang seluruh daftar. */
function updateShotPreview(shot) {
  const node = qs(`[data-shot-preview="${shot.id}"]`);
  if (node) node.textContent = shotPrompt(shot);
}

/** Prompt satu klip: kunci kontinuitas diulang di depan, lalu gerakannya. */
function shotPrompt(shot) {
  const board = state.storyboard;
  const parts = [];
  if (board.lockDescription) parts.push(`Subjek (sama persis di setiap klip): ${board.lockDescription}.`);
  if (shot.beat) parts.push(`${shot.beat}.`);
  if (shot.description) parts.push(shot.description.trim());
  if (shot.audio) parts.push(`Suara: ${shot.audio.trim()}`);
  parts.push(`Format: durasi ${shot.duration} detik, rasio ${board.aspect}.`);
  parts.push('Pertahankan warna, arah cahaya, dan posisi subjek sama seperti klip sebelumnya.');
  return parts.join('\n\n');
}

async function runShot(button, shot, index) {
  if (!resolveKey('gemini')) {
    toast('Isi kunci Google AI Studio di tab Pengaturan.', 'error');
    return;
  }
  const prompt = shotPrompt(shot);
  if (prompt.length < 40) {
    toast('Isi deskripsi klip dulu.', 'error');
    return;
  }

  const host = qs(`#shot-video-${shot.id}`);
  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Membuat…';
  clear(host).append(el('div', { class: 'hstack' }, [el('span', { class: 'loader' }), 'Menghubungi model video…']));

  try {
    const asset = await generateVideo({
      prompt,
      aspectRatio: state.storyboard.aspect,
      durationSeconds: Number(shot.duration),
      onProgress: (message) => {
        clear(host).append(el('div', { class: 'hstack' }, [el('span', { class: 'loader' }), message]));
      },
    });
    shot.videoAsset = asset;
    shot.status = 'done';
    clear(host).append(buildPreview(asset));
    paintShots();
    toast(`Klip ${index + 1} selesai.`, 'success');
  } catch (error) {
    shot.status = 'error';
    clear(host).append(el('div', { class: 'caution' }, [error.message]));
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function buildPreview(asset) {
  const host = el('div', { class: 'stack stack--tight' });
  if (asset.base64) {
    host.append(
      el('video', { controls: true, playsinline: true, src: `data:${asset.mimeType || 'video/mp4'};base64,${asset.base64}` })
    );
    return host;
  }
  host.append(el('p', { class: 'small muted' }, ['Video ada di server penyedia. Unduh sebelum dua hari.']));
  host.append(
    el('button', {
      class: 'btn btn--small',
      type: 'button',
      onclick: async (event) => {
        const { fetchVideoBlob } = await import('../lib/ai.js');
        const { downloadBlob } = await import('../lib/utils.js');
        try {
          const blob = await fetchVideoBlob(asset.uri);
          downloadBlob(blob, `sinema-klip-${Date.now()}.mp4`);
        } catch (error) {
          toast(error.message, 'error');
        }
      },
    }, ['Unduh klip'])
  );
  return host;
}

function saveBoard() {
  const board = state.storyboard;
  projects.save({
    id: board.id,
    kind: 'storyboard',
    name: board.name,
    templateId: board.templateId,
    board,
    prompt: board.shots.map((shot, index) => `# Klip ${index + 1}\n${shotPrompt(shot)}`).join('\n\n'),
  });
  toast('Papan cerita disimpan.', 'success');
}

function exportBoard() {
  const board = state.storyboard;
  const total = board.shots.reduce((sum, shot) => sum + Number(shot.duration || 0), 0);
  const lines = [
    `# ${board.name}`,
    '',
    `- Template: ${board.templateId}`,
    `- Rasio: ${board.aspect}`,
    `- Jumlah klip: ${board.shots.length}`,
    `- Total durasi: ${total} detik`,
    board.lockDescription ? `- Kunci kontinuitas: ${board.lockDescription}` : '',
    '',
    '## Rencana klip',
    '',
    '| # | Beat | Durasi | Deskripsi | Suara | Prompt |',
    '| --- | --- | --- | --- | --- | --- |',
    ...board.shots.map((shot, index) => {
      const clean = (value) => String(value || '').replace(/\|/g, '/').replace(/\n/g, ' ');
      return `| ${index + 1} | ${clean(shot.beat)} | ${shot.duration}s | ${clean(shot.description)} | ${clean(shot.audio)} | ${clean(shotPrompt(shot))} |`;
    }),
    '',
    '## Catatan produksi',
    '',
    '- Deskripsi subjek diulang dengan kata yang sama persis di setiap klip.',
    '- Satu klip hanya memuat satu gerakan.',
    '- Unduh hasil sebelum dua hari.',
  ];

  downloadText(lines.filter((line) => line !== undefined).join('\n'), `papan-cerita-${Date.now()}.md`, 'text/markdown;charset=utf-8');
  toast('Papan cerita diekspor sebagai berkas markdown.', 'success');
}
