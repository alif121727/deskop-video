/**
 * Pengaturan: kunci API, model, dan profil merek.
 *
 * Kunci disimpan di browser. Kalau opsi "ingat kunci" dimatikan, kunci
 * hanya bertahan sampai tab ditutup.
 */

import { settings, keys, resolveKey, rememberKey, session } from '../lib/store.js';
import { el, qs, toast } from '../lib/utils.js';
import { navigate, refreshKeyStatus } from '../app.js';
import { generateText } from '../lib/ai.js';

const PROVIDERS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    note: 'Untuk teks dan video. Video memerlukan akses Veo.',
    keyLabel: 'Kunci Google AI Studio',
    keyUrl: 'https://aistudio.google.com/apikey',
    textModels: [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
    ],
    videoModels: [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-generate-preview',
      'veo-3.1-lite-generate-preview',
      'veo-3.0-fast-generate-001',
      'veo-3.0-generate-001',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI atau penyedia kompatibel',
    note: 'Untuk teks saja. Video hanya lewat Gemini.',
    keyLabel: 'Kunci OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    textModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    videoModels: [],
  },
];

export function renderSettings() {
  const view = el('div', { class: 'view' });
  const current = settings.get();

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Pengaturan']),
        el('h1', {}, ['Kunci Anda, model pilihan Anda']),
        el('p', {}, [
          'Kunci API tidak disimpan di server ini. Kunci dikirim dari browser pada setiap permintaan, dipakai sekali, lalu dibuang.',
        ]),
      ]),
    ])
  );

  view.append(buildKeyPanel(current));
  view.append(buildBrandPanel(current));
  view.append(buildHowToPanel());

  return view;
}

/* ------------------------------------------------------------------ */

function buildKeyPanel(current) {
  const panel = el('section', { class: 'panel' });
  panel.append(el('div', { class: 'panel__title', style: 'margin-bottom:14px' }, ['Kunci & model']));

  const providerSelect = el('select', {
    onchange: (event) => {
      settings.set({ provider: event.target.value });
      navigate('settings');
      refreshKeyStatus();
    },
  });
  for (const provider of PROVIDERS) {
    providerSelect.append(
      el('option', { value: provider.id, selected: current.provider === provider.id }, [provider.name])
    );
  }

  const provider = PROVIDERS.find((p) => p.id === current.provider) || PROVIDERS[0];

  const keyInput = el('input', {
    type: 'password',
    placeholder: 'tempel kunci di sini',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const existing = resolveKey(provider.id);
  if (existing) keyInput.value = existing;

  keyInput.addEventListener('change', () => {
    rememberKey(provider.id, keyInput.value.trim());
    refreshKeyStatus();
    toast('Kunci disimpan sesuai pilihan penyimpanan di bawah.', 'success');
  });

  const rememberToggle = el('input', {
    type: 'checkbox',
    checked: current.rememberKeys,
    onchange: (event) => {
      settings.set({ rememberKeys: event.target.checked });
      toast(
        event.target.checked
          ? 'Kunci akan diingat di browser ini.'
          : 'Kunci hanya bertahan sampai tab ditutup.',
        'success'
      );
    },
  });

  const textModelSelect = el('select', {
    onchange: (event) => settings.set({ textModel: event.target.value }),
  });
  for (const model of provider.textModels) {
    textModelSelect.append(
      el('option', { value: model, selected: current.textModel === model }, [model])
    );
  }
  if (!provider.textModels.includes(current.textModel)) {
    textModelSelect.append(el('option', { value: current.textModel, selected: true }, [current.textModel]));
  }

  const rows = [
    el('div', { class: 'grid grid--two' }, [
      el('div', { class: 'field' }, [el('label', {}, ['Penyedia']), providerSelect]),
      el('div', { class: 'field' }, [el('label', {}, ['Model teks']), textModelSelect]),
    ]),
    el('div', { class: 'field', style: 'margin-top:14px' }, [
      el('label', {}, [provider.keyLabel]),
      keyInput,
      el('p', { class: 'field__hint' }, [
        'Ambil kunci di ',
        el('a', { href: provider.keyUrl, target: '_blank', rel: 'noopener' }, [provider.keyUrl.replace('https://', '')]),
        `. ${provider.note}`,
      ]),
    ]),
  ];

  if (provider.videoModels.length) {
    const videoModelSelect = el('select', {
      onchange: (event) => settings.set({ videoModel: event.target.value }),
    });
    for (const model of provider.videoModels) {
      videoModelSelect.append(
        el('option', { value: model, selected: current.videoModel === model }, [model])
      );
    }
    rows.push(
      el('div', { class: 'field', style: 'margin-top:14px' }, [
        el('label', {}, ['Model video']),
        videoModelSelect,
        el('p', { class: 'field__hint' }, [
          'Nama model berubah cukup sering. Kalau muncul galat "model tidak ditemukan", ganti ke nama lain di daftar.',
        ]),
      ])
    );
  } else {
    const baseInput = el('input', {
      type: 'text',
      placeholder: 'https://api.openai.com/v1',
      value: current.openaiBaseUrl || '',
      onchange: (event) => settings.set({ openaiBaseUrl: event.target.value.trim() }),
    });
    rows.push(
      el('div', { class: 'field', style: 'margin-top:14px' }, [
        el('label', {}, ['Base URL (opsional)']),
        baseInput,
        el('p', { class: 'field__hint' }, [
          'Kosongkan untuk OpenAI resmi. Isi kalau memakai penyedia yang kompatibel dengan API OpenAI.',
        ]),
      ])
    );
  }

  rows.push(
    el('label', { class: 'switch', style: 'margin-top:16px' }, [
      rememberToggle,
      'Ingat kunci di browser ini (kalau dimatikan, kunci hilang saat tab ditutup)',
    ])
  );

  rows.push(
    el('div', { class: 'hstack', style: 'margin-top:16px' }, [
      el('button', {
        class: 'btn btn--small',
        type: 'button',
        onclick: async () => {
          if (!resolveKey(provider.id)) return toast('Isi kunci dulu.', 'error');
          const button = qs('#test-key');
          button.disabled = true;
          button.textContent = 'Menguji…';
          try {
            const text = await generateText({
              provider: provider.id,
              prompt: 'Balas dengan satu kata: siap',
              temperature: 0,
            });
            toast(`Kunci bekerja. Jawaban model: ${text.slice(0, 40)}`, 'success');
          } catch (error) {
            toast(error.message, 'error', 6000);
          } finally {
            button.disabled = false;
            button.textContent = 'Uji kunci';
          }
        },
        id: 'test-key',
      }, ['Uji kunci']),
      el('button', {
        class: 'btn btn--small btn--ghost',
        type: 'button',
        onclick: () => {
          keys.set(provider.id, '');
          session.remove(`key:${provider.id}`);
          toast('Kunci dihapus dari browser ini.', 'success');
          navigate('settings');
          refreshKeyStatus();
        },
      }, ['Hapus kunci']),
    ])
  );

  panel.append(...rows);
  return panel;
}

/* ------------------------------------------------------------------ */

function buildBrandPanel(current) {
  const panel = el('section', { class: 'panel', style: 'margin-top:18px' });
  panel.append(
    el('div', { class: 'panel__head' }, [
      el('div', {}, [
        el('div', { class: 'panel__title' }, ['Profil merek']),
        el('p', { class: 'panel__note' }, [
          'Dipakai untuk mengisi otomatis slot yang tetap sama di setiap video, supaya tidak ditulis ulang tiap kali.',
        ]),
      ]),
    ])
  );

  const fields = [
    { key: 'name', label: 'Nama merek', placeholder: 'misalnya Warung Madu Asli' },
    { key: 'product', label: 'Produk utama', placeholder: 'misalnya botol madu 250 ml berlabel kuning' },
    { key: 'style', label: 'Gaya visual tetap', placeholder: 'misalnya sinematik, warna hangat, cahaya alami' },
    { key: 'palette', label: 'Warna merek', placeholder: 'misalnya kuning tua dan cokelat' },
    { key: 'audience', label: 'Pembaca utama', placeholder: 'misalnya mahasiswa yang mengerjakan tugas malam' },
  ];

  const grid = el('div', { class: 'grid grid--two' });
  for (const field of fields) {
    const input = el('input', {
      type: 'text',
      placeholder: field.placeholder,
      value: current.brand[field.key] || '',
      oninput: (event) => settings.setBrand({ [field.key]: event.target.value }),
    });
    grid.append(el('div', { class: 'field' }, [el('label', {}, [field.label]), input]));
  }

  panel.append(grid);

  panel.append(
    el('button', {
      class: 'btn btn--small',
      type: 'button',
      style: 'margin-top:14px',
      onclick: () => {
        const brand = settings.get().brand;
        const text = [
          brand.name ? `Merek: ${brand.name}.` : '',
          brand.product ? `Produk: ${brand.product}.` : '',
          brand.style ? `Gaya visual tetap: ${brand.style}.` : '',
          brand.palette ? `Warna merek: ${brand.palette}.` : '',
          brand.audience ? `Pembaca utama: ${brand.audience}.` : '',
        ]
          .filter(Boolean)
          .join(' ');
        if (!text) return toast('Isi minimal satu kolom dulu.', 'error');
        navigator.clipboard.writeText(text);
        toast('Kalimat merek disalin. Tempel di slot Context atau Nuance.', 'success');
      },
    }, ['Salin sebagai kalimat'])
  );

  return panel;
}

/* ------------------------------------------------------------------ */

function buildHowToPanel() {
  const panel = el('section', { class: 'panel', style: 'margin-top:18px' });
  panel.append(
    el('div', { class: 'panel__title', style: 'margin-bottom:12px' }, ['Cara menyiapkan, langkah demi langkah'])
  );

  panel.append(
    el('ol', { class: 'steps' }, [
      el('li', {}, [
        'Buka ',
        el('a', { href: 'https://aistudio.google.com/apikey', target: '_blank', rel: 'noopener' }, ['aistudio.google.com/apikey']),
        ' dan masuk dengan akun Google.',
      ]),
      el('li', {}, ['Tekan "Create API key", lalu salin kuncinya. Kunci diawali dengan huruf AIza.']),
      el('li', {}, ['Tempel kunci itu di kolom di atas, lalu tekan "Uji kunci".']),
      el('li', {}, ['Kalau muncul "model tidak ditemukan", ganti nama model di daftar model teks.']),
      el('li', {}, ['Untuk membuat video, pilih salah satu model Veo. Akses Veo tidak tersedia di semua akun.']),
      el('li', {}, ['Kalau akun Anda belum punya akses Veo, tetap pakai Studio: salin promptnya, lalu tempel di tool video lain.']),
    ])
  );

  panel.append(
    el('div', { class: 'note note--amber', style: 'margin-top:16px' }, [
      el('strong', {}, ['Penting soal biaya. ']),
      'Pembuatan video memakai kredit berbayar pada akun Anda. Coba dulu dengan prompt pendek dan durasi 4 detik sebelum membuat banyak varian.',
    ])
  );

  panel.append(
    el('div', { class: 'note', style: 'margin-top:10px' }, [
      el('strong', {}, ['Keamanan. ']),
      'Kunci disimpan di penyimpanan browser perangkat ini saja. Jangan pakai komputer bersama untuk menyimpan kunci secara permanen, dan matikan opsi "ingat kunci" kalau memakai perangkat umum.',
    ])
  );

  panel.append(
    el('div', { class: 'note', style: 'margin-top:10px' }, [
      el('strong', {}, ['Hak cipta dan label. ']),
      'Selalu centang opsi konten generatif AI saat mengunggah. Jangan memakai prompt yang memunculkan wajah selebritas, karakter berhak cipta, atau merek dagang terkenal.',
    ])
  );

  return panel;
}
