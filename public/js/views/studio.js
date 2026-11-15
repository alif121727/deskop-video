/** Studio: bangun prompt dari slot S.C.E.N.E., periksa mutunya, lalu buat video. */

import { TEMPLATES, SCENE_FIELDS, CATEGORIES } from '../data/templates.js';
import { AUDIO_CUES, VIDEO_LIMITS } from '../data/playbook.js';
import {
  composePrompt,
  auditPrompt,
  SCENE_KEYS,
  SCENE_META,
} from '../lib/prompt.js';
import { state, currentTemplate, collectPlaceholders, newDraft, seedStoryboardFromDraft } from '../state.js';
import { el, clear, qs, toast, copyText, downloadText, aspectToNumber } from '../lib/utils.js';
import { projects, settings, uid, resolveKey } from '../lib/store.js';
import { generateText, generateVideo, fileToImagePayload } from '../lib/ai.js';
import { navigate } from '../app.js';

const LOCK_REASON = {
  subject: 'Subjek dikunci: menggantinya membuat footage tidak lagi satu kampanye.',
  context: 'Konteks dikunci supaya cahaya dan latar tetap sama di semua varian.',
  event: 'Kejadian dikunci: satu klip hanya boleh memuat satu gerakan.',
  nuance: 'Nuansa dikunci supaya semua varian punya gaya yang sama.',
  exclusions: 'Larangan dikunci karena bagian ini yang mencegah satu putaran regenerasi.',
};

let refs = {};

export function renderStudio() {
  const view = el('div', { class: 'view' });
  const template = currentTemplate();
  refs = {};

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Studio · bangun prompt']),
        el('h1', {}, [template.name]),
        el('p', {}, [template.tagline]),
      ]),
      el('div', { class: 'hstack' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          onclick: () => navigate('library'),
        }, ['Ganti template']),
        el('button', {
          class: 'btn',
          type: 'button',
          onclick: saveProject,
        }, ['Simpan proyek']),
      ]),
    ])
  );

  const studio = el('div', { class: 'studio' });
  const left = el('div', { class: 'studio__col' });
  const right = el('div', { class: 'studio__col sticky' });

  left.append(buildTemplatePicker(template));
  left.append(buildSceneEditor(template));
  left.append(buildPlaceholderFiller(template));
  left.append(buildFormatPanel(template));
  left.append(buildAudioPanel());

  right.append(buildOutputPanel(template));
  right.append(buildAuditPanel());
  right.append(buildVideoPanel(template));

  studio.append(left, right);
  view.append(studio);

  queueMicrotask(refresh);
  return view;
}

/* ------------------------------------------------------------------ */
/* pemilih template                                                    */
/* ------------------------------------------------------------------ */

function buildTemplatePicker(template) {
  const panel = el('section', { class: 'panel' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', { class: 'panel__title' }, ['Template aktif']),
      el('span', { class: 'chip chip--amber' }, [`${template.locked.length} slot terkunci`]),
    ])
  );

  const select = el('select', {
    onchange: (event) => {
      state.draft = newDraft(event.target.value);
      navigate('studio');
    },
  });

  const byCategory = new Map();
  for (const item of TEMPLATES) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category).push(item);
  }

  for (const [categoryId, items] of byCategory) {
    const group = el('optgroup', {
      label: CATEGORIES.find((c) => c.id === categoryId)?.label || categoryId,
    });
    for (const item of items) {
      group.append(
        el('option', { value: item.id, selected: item.id === template.id }, [
          `${item.name} — ${item.duration}s`,
        ])
      );
    }
    select.append(group);
  }

  panel.append(select);

  if (template.tips) {
    panel.append(el('div', { class: 'note note--amber', style: 'margin-top:12px' }, [template.tips]));
  }

  const meta = el('div', { class: 'hstack', style: 'margin-top:12px' }, [
    ...template.aspects.map((aspect) => el('span', { class: 'chip' }, [aspect])),
    el('span', { class: 'chip chip--sky' }, [`${template.duration}s`]),
    ...(template.platforms || []).slice(0, 3).map((p) => el('span', { class: 'chip' }, [p])),
  ]);
  panel.append(meta);

  return panel;
}

/* ------------------------------------------------------------------ */
/* penyunting slot S.C.E.N.E.                                          */
/* ------------------------------------------------------------------ */

function buildSceneEditor(template) {
  const panel = el('section', { class: 'panel' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Lima slot S.C.E.N.E.']),
        el('p', { class: 'panel__note' }, [
          'Prompt yang kuat bekerja seperti brief: menetapkan tugas adegannya sebelum menggambarkan elemen visualnya.',
        ]),
      ]),
      el('button', {
        class: 'btn btn--small',
        type: 'button',
        onclick: runAssistant,
      }, ['✦ Rapikan dengan AI']),
    ])
  );

  const letters = ['S', 'C', 'E', 'N', 'E'];
  refs.slots = {};

  SCENE_KEYS.forEach((key, index) => {
    const meta = SCENE_META[key];
    const locked = template.locked.includes(key);

    const area = el('textarea', {
      rows: 2,
      placeholder: meta.question,
      oninput: (event) => {
        state.draft.scene[key] = event.target.value;
        refresh();
      },
    });
    area.value = state.draft.scene[key] || '';
    refs.slots[key] = area;

    const slot = el('div', { class: `slot${locked ? ' slot--locked' : ''}` }, [
      el('div', { class: 'slot__head' }, [
        el('span', { class: 'slot__letter' }, [letters[index]]),
        el('span', { class: 'slot__label' }, [meta.label]),
        locked ? el('span', { class: 'slot__lock', title: LOCK_REASON[key] }, ['⚿ terkunci']) : null,
      ]),
      el('p', { class: 'slot__hint' }, [`${meta.question} ${meta.idLabel ? '' : ''}`]),
      area,
    ]);

    panel.append(slot);
  });

  return panel;
}

/* ------------------------------------------------------------------ */
/* isian placeholder                                                   */
/* ------------------------------------------------------------------ */

function buildPlaceholderFiller(template) {
  const names = collectPlaceholders(template);
  const panel = el('section', { class: 'panel' });
  refs.valueInputs = {};

  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Isian cepat']),
        el('p', { class: 'panel__note' }, [
          'Bagian bertanda kurung adalah yang wajib Anda ganti. Isi di sini supaya semua slot dan prompt akhir ikut terisi.',
        ]),
      ]),
    ])
  );

  if (!names.length) {
    panel.append(el('p', { class: 'panel__note' }, ['Template ini tidak memakai placeholder. Isi kelima slot langsung.']));
    return panel;
  }

  const grid = el('div', { class: 'grid grid--two' });
  for (const name of names) {
    const input = el('input', {
      type: 'text',
      placeholder: `nilai untuk ${name}`,
      oninput: (event) => {
        state.draft.values[name] = event.target.value;
        refresh();
      },
    });
    input.value = state.draft.values[name] || '';
    refs.valueInputs[name] = input;
    grid.append(el('div', { class: 'field' }, [el('label', {}, [name]), input]));
  }

  panel.append(grid);
  return panel;
}

/* ------------------------------------------------------------------ */
/* format keluaran                                                     */
/* ------------------------------------------------------------------ */

function buildFormatPanel(template) {
  const panel = el('section', { class: 'panel' });
  panel.append(el('div', { class: 'panel__title', style: 'margin-bottom:14px' }, ['Bentuk keluaran']));

  const aspectSelect = el('select', {
    onchange: (event) => {
      state.draft.aspect = event.target.value;
      refresh();
    },
  });
  const aspectOptions = [...new Set([...template.aspects, ...VIDEO_LIMITS.aspects])];
  for (const aspect of aspectOptions) {
    aspectSelect.append(
      el('option', { value: aspect, selected: state.draft.aspect === aspect }, [aspect])
    );
  }

  const durationSelect = el('select', {
    onchange: (event) => {
      state.draft.duration = Number(event.target.value);
      refresh();
    },
  });
  for (const duration of VIDEO_LIMITS.durations) {
    durationSelect.append(
      el('option', { value: String(duration), selected: state.draft.duration === duration }, [
        `${duration} detik`,
      ])
    );
  }

  panel.append(
    el('div', { class: 'grid grid--two' }, [
      el('div', { class: 'field' }, [el('label', {}, ['Rasio']), aspectSelect]),
      el('div', { class: 'field' }, [el('label', {}, ['Durasi klip']), durationSelect]),
    ])
  );

  panel.append(el('div', { class: 'note', style: 'margin-top:14px' }, [VIDEO_LIMITS.note]));
  panel.append(el('div', { class: 'caution', style: 'margin-top:10px' }, [VIDEO_LIMITS.retention]));

  return panel;
}

/* ------------------------------------------------------------------ */
/* isyarat suara                                                       */
/* ------------------------------------------------------------------ */

function buildAudioPanel() {
  const panel = el('section', { class: 'panel' });
  refs.audioInputs = {};

  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Isyarat suara']),
        el('p', { class: 'panel__note' }, [
          'Bagian ini yang paling sering dibiarkan kosong, padahal justru yang membedakan klip yang terasa jadi dari rekaman bisu.',
        ]),
      ]),
    ])
  );

  for (const cue of AUDIO_CUES) {
    const input = el('input', {
      type: 'text',
      placeholder: cue.example,
      oninput: (event) => {
        state.draft.audio[cue.key] = event.target.value;
        refresh();
      },
    });
    input.value = state.draft.audio[cue.key] || '';
    refs.audioInputs[cue.key] = input;

    panel.append(
      el('div', { class: 'slot' }, [
        el('div', { class: 'slot__head' }, [
          el('span', { class: 'slot__label' }, [cue.label]),
        ]),
        el('p', { class: 'slot__hint', style: 'margin-left:0' }, [cue.rule]),
        input,
      ])
    );
  }

  return panel;
}

/* ------------------------------------------------------------------ */
/* keluaran prompt                                                     */
/* ------------------------------------------------------------------ */

function buildOutputPanel(template) {
  const panel = el('section', { class: 'output' });

  const langTabs = el('div', { class: 'output__tabs' });
  for (const [code, label] of [['en', 'English'], ['id', 'Indonesia']]) {
    langTabs.append(
      el('button', {
        class: 'tab',
        type: 'button',
        'aria-selected': String(state.draft.language === code),
        onclick: (event) => {
          state.draft.language = code;
          [...langTabs.children].forEach((n) => n.setAttribute('aria-selected', 'false'));
          event.currentTarget.setAttribute('aria-selected', 'true');
          refresh();
        },
      }, [label])
    );
  }

  const orderTabs = el('div', { class: 'output__tabs' });
  for (const [mode, label] of [['scene', 'Urut S.C.E.N.E.'], ['base', 'Gaya template']]) {
    orderTabs.append(
      el('button', {
        class: 'tab',
        type: 'button',
        'aria-selected': String(state.draft.order === mode),
        onclick: (event) => {
          state.draft.order = mode;
          [...orderTabs.children].forEach((n) => n.setAttribute('aria-selected', 'false'));
          event.currentTarget.setAttribute('aria-selected', 'true');
          refresh();
        },
      }, [label])
    );
  }

  const scoreWrap = el('div', { class: 'score' }, [
    el('span', { id: 'score-text' }, ['—']),
    el('div', { class: 'score__bar' }, [el('div', { class: 'score__fill', id: 'score-fill' })]),
  ]);

  const bar = el('div', { class: 'output__bar' }, [
    langTabs,
    orderTabs,
    scoreWrap,
  ]);

  const pre = el('pre', { id: 'prompt-out' });
  refs.promptOut = pre;

  const actions = el('div', { class: 'hstack', style: 'padding:12px 16px; border-top:1px solid var(--line)' }, [
    el('button', {
      class: 'btn btn--small btn--primary',
      type: 'button',
      onclick: async () => {
        await copyText(currentPrompt());
        toast('Prompt disalin. Tempel di tool video pilihan Anda.', 'success');
      },
    }, ['Salin prompt']),
    el('button', {
      class: 'btn btn--small',
      type: 'button',
      onclick: () => {
        const name = `prompt-${template.id}-${state.draft.aspect.replace(':', 'x')}.txt`;
        downloadText(currentPrompt(), name);
      },
    }, ['Unduh .txt']),
    el('button', {
      class: 'btn btn--small btn--ghost',
      type: 'button',
      onclick: () => {
        const negative = state.draft.negativePrompt || state.draft.scene.exclusions || '';
        copyText(negative);
        toast('Daftar larangan disalin untuk kolom negative prompt.', 'success');
      },
    }, ['Salin larangan']),
    el('span', { class: 'spacer' }),
    el('button', {
      class: 'btn btn--small btn--ghost',
      type: 'button',
      onclick: () => {
        seedStoryboardFromDraft();
        navigate('storyboard');
        toast('Subjek dan pengaturan dibawa ke papan cerita.', 'success');
      },
    }, ['Pecah jadi klip →']),
  ]);

  panel.append(bar, el('div', { class: 'output__body' }, [pre]), actions);
  return panel;
}

function currentPrompt() {
  const template = currentTemplate();
  return composePrompt({
    template,
    scene: state.draft.scene,
    values: state.draft.values,
    aspect: state.draft.aspect,
    duration: state.draft.duration,
    audio: state.draft.audio,
    order: state.draft.order,
    language: state.draft.language,
  });
}

/* ------------------------------------------------------------------ */
/* pemeriksaan mutu                                                    */
/* ------------------------------------------------------------------ */

function buildAuditPanel() {
  const panel = el('section', { class: 'panel' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Pemeriksaan mutu']),
        el('p', { class: 'panel__note' }, [
          'Setiap temuan menghapus satu tebakan model. Perbaiki yang bertanda merah lebih dulu.',
        ]),
      ]),
    ])
  );
  const host = el('div', { class: 'findings', id: 'findings' });
  refs.findings = host;
  panel.append(host);
  return panel;
}

/* ------------------------------------------------------------------ */
/* pembuatan video                                                     */
/* ------------------------------------------------------------------ */

function buildVideoPanel(template) {
  const panel = el('section', { class: 'panel' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Buat video']),
        el('p', { class: 'panel__note' }, [
          'Butuh kunci Google AI Studio dengan akses Veo. Hasil disimpan di server penyedia selama dua hari.',
        ]),
      ]),
    ])
  );

  const hasKey = Boolean(resolveKey('gemini'));
  if (!hasKey) {
    panel.append(
      el('div', { class: 'note note--amber' }, [
        'Kunci Google AI Studio belum diisi. Anda tetap bisa menyusun prompt dan menyalinnya ke tool video mana pun. Untuk membuat video dari sini, buka tab Pengaturan.',
      ])
    );
    panel.append(
      el('button', {
        class: 'btn btn--block',
        type: 'button',
        style: 'margin-top:12px',
        onclick: () => navigate('settings'),
      }, ['Buka Pengaturan'])
    );
    return panel;
  }

  const dropzone = el('div', { class: 'dropzone', id: 'dropzone' }, [
    state.draft.referenceImage
      ? el('img', { src: state.draft.referenceImage.preview })
      : null,
    state.draft.referenceImage
      ? `${state.draft.referenceImage.name} · klik untuk ganti`
      : 'Letakkan gambar acuan di sini (opsional, untuk image-to-video)',
  ]);

  const fileInput = el('input', { type: 'file', accept: 'image/*', class: 'offscreen' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const payload = await fileToImagePayload(file);
      state.draft.referenceImage = {
        ...payload,
        preview: URL.createObjectURL(file),
      };
      navigate('studio');
      toast('Gambar acuan siap dipakai.', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-over');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-over'));
  dropzone.addEventListener('drop', async (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-over');
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    try {
      const payload = await fileToImagePayload(file);
      state.draft.referenceImage = { ...payload, preview: URL.createObjectURL(file) };
      navigate('studio');
    } catch (error) {
      toast(error.message, 'error');
    }
  });

  panel.append(dropzone, fileInput);

  const negative = el('textarea', {
    rows: 2,
    placeholder: 'Contoh: distorted faces, warped text, extra limbs, flickering, morphing objects',
    oninput: (event) => {
      state.draft.negativePrompt = event.target.value;
    },
  });
  negative.value = state.draft.negativePrompt || '';
  panel.append(el('div', { class: 'field', style: 'margin-top:14px' }, [
    el('label', {}, ['Negative prompt (opsional)']),
    negative,
    el('p', { class: 'field__hint' }, ['Kalau kosong, daftar larangan dari slot Exclusions yang dipakai.']),
  ]));

  const status = el('div', { id: 'gen-status', class: 'small muted', style: 'min-height:20px; margin-top:10px' });
  const videoHost = el('div', { class: 'video-wrap', id: 'video-host', style: 'margin-top:12px' });

  const button = el('button', {
    class: 'btn btn--primary btn--block',
    type: 'button',
    style: 'margin-top:14px',
    onclick: (event) => runGeneration(event.currentTarget, status, videoHost),
  }, ['▶ Buat video sekarang']);

  panel.append(button, status, videoHost);
  return panel;
}

async function runGeneration(button, status, videoHost) {
  const prompt = currentPrompt();
  if (!prompt || prompt.length < 20) {
    toast('Isi slot S.C.E.N.E. dulu sebelum membuat video.', 'error');
    return;
  }

  button.disabled = true;
  const original = button.textContent;
  button.textContent = 'Membuat…';
  clear(status).append(el('span', { class: 'loader' }), ' Menyiapkan permintaan ke model video…');

  try {
    const asset = await generateVideo({
      prompt,
      aspectRatio: state.draft.aspect,
      durationSeconds: state.draft.duration,
      negativePrompt: state.draft.negativePrompt || state.draft.scene.exclusions || undefined,
      image: state.draft.referenceImage
        ? { data: state.draft.referenceImage.data, mimeType: state.draft.referenceImage.mimeType }
        : undefined,
      onProgress: (message) => {
        clear(status).append(el('span', { class: 'loader' }), ` ${message}`);
      },
    });

    state.draft.videoAsset = asset;
    clear(status).textContent = 'Selesai. Pratinjau di bawah, unduh sebelum dua hari.';
    clear(videoHost);
    videoHost.append(buildVideoPreview(asset));
    toast('Video selesai dibuat.', 'success');
  } catch (error) {
    clear(status).textContent = '';
    status.append(el('div', { class: 'caution' }, [error.message]));
    toast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function buildVideoPreview(asset) {
  const host = el('div', { class: 'stack stack--tight' });
  if (asset.base64) {
    host.append(
      el('video', {
        controls: true,
        playsinline: true,
        src: `data:${asset.mimeType || 'video/mp4'};base64,${asset.base64}`,
      })
    );
    return host;
  }

  host.append(el('p', { class: 'small muted' }, ['Video tersedia di server penyedia. Unduh sekarang sebelum dihapus.']));
  host.append(
    el('button', {
      class: 'btn btn--block',
      type: 'button',
      onclick: async (event) => {
        const { fetchVideoBlob } = await import('../lib/ai.js');
        const { downloadBlob } = await import('../lib/utils.js');
        event.currentTarget.disabled = true;
        event.currentTarget.textContent = 'Mengunduh…';
        try {
          const blob = await fetchVideoBlob(asset.uri);
          downloadBlob(blob, `sinema-${state.draft.templateId}-${Date.now()}.mp4`);
          clear(host).append(el('video', { controls: true, playsinline: true, src: URL.createObjectURL(blob) }));
        } catch (error) {
          toast(error.message, 'error');
          event.currentTarget.disabled = false;
          event.currentTarget.textContent = 'Unduh video';
        }
      },
    }, ['Unduh video'])
  );
  return host;
}

/* ------------------------------------------------------------------ */
/* asisten AI                                                          */
/* ------------------------------------------------------------------ */

async function runAssistant() {
  const key = resolveKey(settings.get().provider);
  if (!key) {
    toast('Isi kunci API dulu di tab Pengaturan.', 'error');
    return;
  }

  const template = currentTemplate();
  const brief = state.draft.scene.subject || '';
  if (brief.trim().length < 4) {
    toast('Tulis dulu idenya di slot Subject, lalu tekan tombol ini.', 'error');
    return;
  }

  const button = qs('button.btn--small');
  const system =
    'Anda editor brief video iklan. Jawab HANYA dengan JSON valid tanpa penjelasan, tanpa pagar kode. Struktur: {"subject":"","context":"","event":"","nuance":"","exclusions":""}. Semua nilai dalam bahasa Indonesia, maksimal 40 kata per nilai. Jangan menambahkan klaim, angka spesifikasi, atau nama merek yang tidak disebut pengguna.';

  const prompt = [
    `Jenis video: ${template.name} (${template.tagline}).`,
    `Durasi satu klip: ${state.draft.duration} detik. Rasio: ${state.draft.aspect}.`,
    `Catatan template: ${template.tips || '-'}`,
    `Slot yang sudah terkunci dan harus dipertahankan maknanya: ${template.locked.join(', ') || 'tidak ada'}.`,
    `Ide dari pengguna: ${brief}`,
    state.draft.scene.exclusions ? `Larangan yang sudah ada: ${state.draft.scene.exclusions}` : '',
    'Perluas ide itu menjadi lima slot S.C.E.N.E. yang spesifik dan bisa diperiksa. Sebut arah cahaya, sudut kamera, dan satu gerakan saja pada slot event.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const raw = await generateText({ system, prompt, temperature: 0.7 });
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    for (const key of SCENE_KEYS) {
      if (typeof parsed[key] === 'string' && parsed[key].trim()) {
        state.draft.scene[key] = parsed[key].trim();
      }
    }
    navigate('studio');
    toast('Kelima slot terisi. Periksa dan sesuaikan sebelum dipakai.', 'success');
  } catch (error) {
    toast(`Gagal merapikan: ${error.message}`, 'error');
  }
}

/* ------------------------------------------------------------------ */
/* simpan & perbarui                                                   */
/* ------------------------------------------------------------------ */

function saveProject() {
  const template = currentTemplate();
  const record = {
    id: state.draft.projectId || uid('proj'),
    kind: 'prompt',
    name: `${template.name} — ${state.draft.values[Object.keys(state.draft.values)[0]] || template.name}`,
    templateId: template.id,
    draft: state.draft,
    prompt: currentPrompt(),
  };
  state.draft.projectId = record.id;
  projects.save(record);
  toast('Proyek disimpan di browser ini.', 'success');
}

function refresh() {
  if (!refs.promptOut) return;
  const prompt = currentPrompt();
  const template = currentTemplate();

  refs.promptOut.textContent = prompt;

  const { findings, score } = auditPrompt(prompt, {
    scene: state.draft.scene,
    aspect: state.draft.aspect,
    duration: state.draft.duration,
  });

  const scoreText = qs('#score-text');
  const scoreFill = qs('#score-fill');
  if (scoreText) scoreText.textContent = `mutu ${score}`;
  if (scoreFill) {
    scoreFill.style.width = `${score}%`;
    scoreFill.style.background =
      score > 75
        ? 'linear-gradient(90deg, var(--jade), var(--amber))'
        : score > 45
          ? 'linear-gradient(90deg, var(--ember), var(--amber))'
          : 'var(--ember)';
  }

  if (refs.findings) {
    clear(refs.findings);
    if (!findings.length) {
      refs.findings.append(
        el('div', { class: 'finding finding--ok' }, [
          el('span', { class: 'finding__glyph' }, ['✓']),
          el('div', {}, [
            el('div', { class: 'finding__title' }, ['Tidak ada temuan']),
            el('div', { class: 'finding__detail' }, [
              'Kelima slot terisi, larangan ada, dan bentuk keluaran disebut. Prompt ini siap dipakai.',
            ]),
          ]),
        ])
      );
    } else {
      for (const finding of findings) {
        refs.findings.append(
          el('div', { class: `finding finding--${finding.level}` }, [
            el('span', { class: 'finding__glyph' }, [finding.level === 'warn' ? '▲' : 'ⓘ']),
            el('div', {}, [
              el('div', { class: 'finding__title' }, [finding.title]),
              el('div', { class: 'finding__detail' }, [finding.detail]),
            ]),
          ])
        );
      }
    }
  }

  // sorot slot yang masih kosong
  for (const key of SCENE_KEYS) {
    const area = refs.slots?.[key];
    if (!area) continue;
    const empty = !String(state.draft.scene[key] || '').trim();
    area.closest('.slot')?.classList.toggle('slot--locked', empty && template.locked.includes(key));
    area.style.borderColor = empty ? 'rgba(226,86,74,0.35)' : '';
  }
}

export { currentPrompt };
