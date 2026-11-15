/**
 * Panduan Prompt: cara menulis prompt sendiri, bukan sekadar menyalin.
 *
 * Analogi yang dipakai: resep masakan yang persis sama bisa menghasilkan
 * dua piring berbeda karena dapurnya berbeda. Yang perlu diketahui bukan
 * resep tambahan, melainkan bagian mana yang harus disesuaikan.
 */

import { AUDIO_CUES, LANGUAGE_FIXES, VIDEO_LIMITS } from '../data/playbook.js';
import { SCENE_FIELDS } from '../data/templates.js';
import { el, clear, qs, toast, copyText } from '../lib/utils.js';

const TOOL_WRAPPERS = [
  {
    tool: 'ChatGPT',
    rule: 'Satu paragraf mengalir, asalkan nadanya disebut.',
    note:
      'OpenAI memberi nasihat paling sedikit: permintaan yang jelas dan spesifik, perbaiki bertahap setelah melihat jawabannya, dan pakai kata sifat untuk menentukan nada.',
    prompt:
      'Kelompokkan masukan pelanggan di bawah ini menjadi paling banyak lima tema. Beri nama tiap tema maksimal empat kata, sebutkan jumlah masukan di dalamnya, lalu tulis satu kalimat ringkasan bernada netral profesional.\n\nMasukannya:\n[tempel di sini]',
  },
  {
    tool: 'Claude',
    rule: 'Bagian yang berbeda jenis dibungkus tag XML masing-masing.',
    note:
      'Anthropic menyarankan struktur yang lebih tegas, dan menyertakan tiga sampai lima contoh yang dibungkus tag <example> dengan variasi yang cukup beragam.',
    prompt:
      '<instruksi>\nKelompokkan masukan pelanggan menjadi paling banyak lima tema. Beri nama tiap tema maksimal empat kata dan sebutkan jumlahnya.\n</instruksi>\n<contoh>\nMasukan: "Aplikasinya sering keluar sendiri."\nTema: Kestabilan aplikasi\n</contoh>\n<masukan>\n[tempel di sini]\n</masukan>',
  },
  {
    tool: 'Canva',
    rule: 'Sebut tujuan gambar di kalimat pertama, baru gaya dan warnanya.',
    note:
      'Panduan Canva meminta Anda menyebutkan lebih dulu untuk apa gambar itu dibuat, baru kemudian gaya, sudut, cahaya, dan warnanya. Bentuknya lebih menyerupai keterangan desain daripada perintah.',
    prompt:
      'Slide ringkasan hasil survei pelanggan untuk rapat bulanan tim produk. Lima kotak berjajar dalam dua baris, warna biru tua dan putih, huruf tebal tanpa serif, banyak ruang kosong.',
  },
];

const RATIO_TABLE = [
  { ratio: '4:5', place: 'Feed Instagram', why: 'Tinggi sedikit lebih banyak ruang di layar ponsel.' },
  { ratio: '9:16', place: 'Konten vertikal', why: 'Reels, Shorts, TikTok, dan status.' },
  { ratio: '16:9', place: 'Artikel dan YouTube', why: 'Layar lebar dan pemutar video horizontal.' },
  { ratio: '1:1', place: 'Ikon dan feed persegi', why: 'Aman dipotong ke bentuk lain.' },
  { ratio: '3:4', place: 'Poster cetak', why: 'Proporsi kertas yang paling umum.' },
];

export function renderGuide() {
  const view = el('div', { class: 'view' });

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Panduan prompt']),
        el('h1', {}, ['Resep yang sama, dapur yang berbeda']),
        el('p', {}, [
          'Contoh prompt di internet ditulis untuk kebutuhan orang yang menyusunnya. Menempelkannya apa adanya berarti meminta hasil untuk produk, pembaca, dan keperluan milik orang lain. Yang perlu Anda ketahui bukan prompt tambahan, melainkan bagian mana yang harus disesuaikan dengan dapur sendiri.',
        ]),
      ]),
    ])
  );

  view.append(buildThreeParts());
  view.append(buildSceneFramework());
  view.append(buildVagueChecker());
  view.append(buildLanguageFixes());
  view.append(buildAudioSection());
  view.append(buildToolSection());
  view.append(buildRatioSection());
  view.append(buildTestSection());

  return view;
}

/* ------------------------------------------------------------------ */

function buildThreeParts() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Tiga bagian yang wajib Anda ganti']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Berapa pun banyaknya contoh yang Anda kumpulkan, hanya ada tiga bagian yang benar-benar menentukan apakah sebuah prompt bekerja untuk Anda.',
    ])
  );

  const parts = [
    {
      n: '1',
      title: 'Subjek yang sebenarnya',
      body: 'Benda, orang, atau bahan yang Anda punya, bukan yang dipakai contohnya. Ini bagian yang paling sering lupa diganti.',
    },
    {
      n: '2',
      title: 'Konteks pemakaian',
      body: 'Untuk siapa hasilnya dan akan tayang di mana. Gambar untuk katalog cetak menuntut hal yang berbeda dari gambar untuk unggahan ponsel.',
    },
    {
      n: '3',
      title: 'Bentuk keluaran',
      body: 'Panjang, rasio, jumlah pilihan, dan susunannya. Bagian ini paling jarang ditulis orang, padahal paling murah diperbaiki.',
    },
  ];

  const grid = el('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(240px,1fr))' });
  for (const part of parts) {
    grid.append(
      el('div', { class: 'panel' }, [
        el('div', { class: 'stat__value' }, [part.n]),
        el('div', { class: 'panel__title', style: 'margin:6px 0 8px' }, [part.title]),
        el('p', { class: 'panel__note' }, [part.body]),
      ])
    );
  }
  section.append(grid);

  const compare = el('div', { class: 'grid grid--two', style: 'margin-top:18px' });
  compare.append(
    el('div', { class: 'panel' }, [
      el('div', { class: 'field__label' }, ['Bentuk pertama — yang biasa diketik orang']),
      el('div', { class: 'swap__box swap__box--bad', style: 'margin-top:10px' }, ['Buatkan foto produk keripik yang bagus.']),
      el('p', { class: 'panel__note', style: 'margin-top:10px' }, [
        'Kata "bagus" tidak menghapus satu pun tebakan model.',
      ]),
    ]),
    el('div', { class: 'panel' }, [
      el('div', { class: 'field__label' }, ['Bentuk kedua — ketiga bagian terisi']),
      el('div', { class: 'swap__box swap__box--good', style: 'margin-top:10px; white-space:pre-wrap' }, [
        'Foto produk satu bungkus keripik singkong kemasan plastik berdiri tegak di atas meja kayu terang. Kamera sejajar dengan kemasan, jarak setengah badan. Cahaya lembut dari kiri atas, bayangan tipis jatuh ke kanan. Latar dinding putih polos di luar fokus. Rasio 4:5 untuk unggahan Instagram.',
      ]),
      el('p', { class: 'panel__note', style: 'margin-top:10px' }, [
        'Setiap tambahan menghapus satu hal yang tadinya ditebak model: jenis keripiknya, sudut kamera, arah cahaya, isi latar, dan bentuk akhir gambarnya.',
      ]),
    ])
  );
  section.append(compare);

  section.append(
    el('div', { class: 'note note--amber', style: 'margin-top:16px' }, [
      'Kalau Anda hanya sempat menambahkan satu hal ke contoh yang disalin, tambahkan bentuk keluarannya. Menambahkan "maksimal 40 kata", "tiga pilihan", atau "rasio 4:5" hanya menambah beberapa kata, tetapi menghemat satu putaran perbaikan penuh.',
    ])
  );

  return section;
}

function buildSceneFramework() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Kerangka S.C.E.N.E.']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Struktur ini mencegah tiga kegagalan prompt yang paling umum: menghasilkan elemen berlebihan, penampilan produk yang tidak konsisten, dan footage yang butuh regenerasi penuh alih-alih perbaikan.',
    ])
  );

  const grid = el('div', { class: 'grid grid--two' });
  for (const field of SCENE_FIELDS) {
    grid.append(
      el('div', { class: 'panel' }, [
        el('div', { class: 'slot__label' }, [field.label]),
        el('p', { class: 'panel__note', style: 'margin-top:8px' }, [field.hint]),
        el('div', { class: 'mono muted', style: 'margin-top:10px; font-style:italic' }, [`contoh: ${field.placeholder}`]),
      ])
    );
  }
  section.append(grid);
  return section;
}

function buildVagueChecker() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Periksa prompt Anda sendiri']),
    el('p', { class: 'muted', style: 'margin:0 0 14px' }, [
      'Tempel prompt di sini. Kata penilaian tanpa ukuran akan ditandai, karena kata itulah yang paling sering membuat hasil meleset.',
    ])
  );

  const VAGUE = [
    'bagus',
    'keren',
    'menarik',
    'estetik',
    'aesthetic',
    'profesional',
    'indah',
    'cantik',
    'luar biasa',
    'modern',
    'beautiful',
    'stunning',
    'amazing',
    'high quality',
    'sinematik banget',
  ];

  const input = el('textarea', { rows: 5, placeholder: 'Tempel prompt Anda di sini…' });
  const result = el('div', { class: 'stack stack--tight', style: 'margin-top:14px' });

  const check = () => {
    clear(result);
    const text = input.value;
    if (!text.trim()) {
      result.append(el('p', { class: 'muted small' }, ['Belum ada teks untuk diperiksa.']));
      return;
    }

    const lower = text.toLowerCase();
    const found = VAGUE.filter((word) => lower.includes(word));
    const hasRatio = /\d+\s*:\s*\d+|rasio|ratio/i.test(text);
    const hasDuration = /\d+\s*(detik|second|s\b)|durasi|duration/i.test(text);
    const hasExclusion = /\b(tanpa|hindari|jangan|avoid|no )/i.test(text);
    const words = text.trim().split(/\s+/).length;

    const rows = [
      {
        ok: !found.length,
        title: found.length ? `Ada ${found.length} kata tanpa ukuran` : 'Tidak ada kata penilaian tanpa ukuran',
        detail: found.length
          ? `Kata: ${found.join(', ')}. Ganti dengan yang bisa diperiksa, misalnya "maksimal 40 kata" atau "warna biru tua dan putih".`
          : 'Setiap kata sudah bisa diperiksa, jadi tidak ada yang perlu ditebak model.',
      },
      {
        ok: hasExclusion,
        title: hasExclusion ? 'Bagian larangan sudah ada' : 'Belum ada bagian larangan',
        detail: hasExclusion
          ? 'Ini bagian yang paling sering dihilangkan dan paling sering menyelamatkan satu putaran regenerasi.'
          : 'Tambahkan apa yang tidak boleh muncul. Contoh: "tanpa tulisan pada kemasan, tanpa produk tambahan".',
      },
      {
        ok: hasRatio,
        title: hasRatio ? 'Rasio sudah disebut' : 'Rasio belum disebut',
        detail: hasRatio
          ? 'Rasio yang disebut sejak awal mencegah gambar dipotong oleh aplikasi tempat Anda mengunggahnya.'
          : 'Sebut rasio, misalnya 4:5 untuk feed Instagram atau 9:16 untuk konten vertikal.',
      },
      {
        ok: hasDuration,
        title: hasDuration ? 'Durasi sudah disebut' : 'Durasi belum disebut',
        detail: hasDuration
          ? 'Durasi yang disebut mencegah model memotong adegan sendiri.'
          : 'Satu klip hanya 4, 6, atau 8 detik. Sebut durasinya secara eksplisit.',
      },
    ];

    result.append(el('p', { class: 'mono muted' }, [`${words} kata diperiksa`]));
    for (const row of rows) {
      result.append(
        el('div', { class: `finding finding--${row.ok ? 'ok' : 'warn'}` }, [
          el('span', { class: 'finding__glyph' }, [row.ok ? '✓' : '▲']),
          el('div', {}, [
            el('div', { class: 'finding__title' }, [row.title]),
            el('div', { class: 'finding__detail' }, [row.detail]),
          ]),
        ])
      );
    }
  };

  input.addEventListener('input', check);

  section.append(input, result);
  return section;
}

function buildLanguageFixes() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Empat kebiasaan bahasa Indonesia yang menyesatkan']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Menulis prompt dalam bahasa Indonesia sepenuhnya wajar. Yang perlu diperhatikan bukan bahasanya, melainkan empat kebiasaan ini.',
    ])
  );

  for (const fix of LANGUAGE_FIXES) {
    section.append(
      el('div', { class: 'panel', style: 'margin-bottom:12px' }, [
        el('div', { class: 'panel__title', style: 'margin-bottom:6px' }, [fix.problem]),
        el('p', { class: 'panel__note', style: 'margin-bottom:12px' }, [fix.detail]),
        el('div', { class: 'swap' }, [
          el('div', { class: 'swap__box swap__box--bad' }, [el('div', { class: 'field__label' }, ['Hindari']), fix.wrong]),
          el('div', { class: 'swap__box swap__box--good' }, [el('div', { class: 'field__label' }, ['Pakai']), fix.right]),
        ]),
        el('p', { class: 'small muted', style: 'margin:10px 0 0' }, [fix.why]),
      ])
    );
  }

  return section;
}

function buildAudioSection() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Menulis suara di dalam prompt video']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Model video menghasilkan suaranya sendiri, dan isyarat untuk suara itu ditulis di dalam prompt yang sama dengan gambarnya. Ada tiga jenis, dan ketiganya ditulis dengan cara yang berbeda.',
    ])
  );

  const table = el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', {}, ['Jenis']),
          el('th', {}, ['Aturan penulisan']),
          el('th', {}, ['Contoh']),
          el('th', {}, ['']),
        ]),
      ]),
      el(
        'tbody',
        {},
        AUDIO_CUES.map((cue) =>
          el('tr', {}, [
            el('td', {}, [el('strong', {}, [cue.label])]),
            el('td', { class: 'small muted' }, [cue.rule]),
            el('td', {}, [el('div', { class: 'mono', style: 'white-space:pre-wrap' }, [cue.example])]),
            el('td', {}, [
              el('button', {
                class: 'btn btn--small btn--ghost',
                type: 'button',
                onclick: async () => {
                  await copyText(cue.example);
                  toast('Contoh disalin.', 'success');
                },
              }, ['Salin']),
            ]),
          ])
        )
      ),
    ]),
  ]);

  section.append(table);

  const before = el('div', { class: 'panel' }, [
    el('div', { class: 'field__label' }, ['Hanya mengatur gambar']),
    el('div', { class: 'mono', style: 'margin-top:10px; white-space:pre-wrap; line-height:1.7' }, [
      'Dua orang kurir berdiri di depan pintu ruko sambil memeriksa satu paket. Kamera diam setinggi dada, cahaya siang terang.',
    ]),
  ]);

  const after = el('div', { class: 'panel' }, [
    el('div', { class: 'field__label' }, ['Dengan ketiga isyarat suara']),
    el('div', { class: 'mono', style: 'margin-top:10px; white-space:pre-wrap; line-height:1.7' }, [
      'Dua orang kurir berdiri di depan pintu ruko sambil memeriksa satu paket. Kamera diam setinggi dada, cahaya siang terang.\n\nSalah satunya berkata, "Alamatnya benar, tapi namanya beda satu huruf." Terdengar suara plastik pembungkus yang diremas dan deru motor yang lewat di kejauhan.',
    ]),
    el('p', { class: 'panel__note', style: 'margin-top:10px' }, [
      'Panjang tambahannya hanya tiga baris, dan hasilnya berhenti menjadi rekaman bisu.',
    ]),
  ]);

  section.append(el('div', { class: 'grid grid--two', style: 'margin-top:16px' }, [before, after]));
  return section;
}

function buildToolSection() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Prompt yang sama, tool berbeda']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Contoh prompt tidak berpindah antar-tool begitu saja. Yang selalu ikut pindah adalah tugasnya, batasannya, dan bentuk keluarannya. Yang perlu ditulis ulang hanya pembungkusnya.',
    ])
  );

  const grid = el('div', { class: 'grid grid--two' });
  for (const wrapper of TOOL_WRAPPERS) {
    grid.append(
      el('div', { class: 'panel' }, [
        el('div', { class: 'panel__head' }, [
          el('div', { class: 'panel__title' }, [wrapper.tool]),
          el('button', {
            class: 'btn btn--small btn--ghost',
            type: 'button',
            onclick: async () => {
              await copyText(wrapper.prompt);
              toast(`Contoh ${wrapper.tool} disalin.`, 'success');
            },
          }, ['Salin']),
        ]),
        el('div', { class: 'chip chip--amber', style: 'margin-bottom:10px' }, [wrapper.rule]),
        el('div', { class: 'mono', style: 'white-space:pre-wrap; line-height:1.65; font-size:12px' }, [wrapper.prompt]),
        el('p', { class: 'panel__note', style: 'margin-top:12px' }, [wrapper.note]),
      ])
    );
  }
  section.append(grid);
  return section;
}

function buildRatioSection() {
  const section = el('section', { style: 'margin-bottom:44px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Rasio dan tempat tayangnya']),
    el('p', { class: 'muted', style: 'margin:0 0 18px' }, [
      'Memilih rasio jauh lebih mudah kalau Anda mulai dari tempat tayangnya, bukan dari selera. Meminta rasio yang salah berarti gambarnya akan dipotong oleh aplikasi tempat Anda mengunggahnya, dan yang dipotong biasanya justru bagian yang penting.',
    ])
  );

  const table = el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [
        el('tr', {}, [el('th', {}, ['Rasio']), el('th', {}, ['Tempat tayang']), el('th', {}, ['Catatan'])]),
      ]),
      el(
        'tbody',
        {},
        RATIO_TABLE.map((row) =>
          el('tr', {}, [
            el('td', {}, [el('code', {}, [row.ratio])]),
            el('td', {}, [row.place]),
            el('td', { class: 'small muted' }, [row.why]),
          ])
        )
      ),
    ]),
  ]);

  section.append(table);
  section.append(
    el('div', { class: 'note', style: 'margin-top:16px' }, [
      `Batas klip video: durasi ${VIDEO_LIMITS.durations.join(', ')} detik, rasio ${VIDEO_LIMITS.aspects.join(' dan ')}. ${VIDEO_LIMITS.retention}`,
    ])
  );

  return section;
}

function buildTestSection() {
  const section = el('section', { style: 'margin-bottom:20px' });
  section.append(
    el('h2', { style: 'font-size:26px; margin-bottom:6px' }, ['Satu uji yang bisa dipakai untuk semua tool']),
    el('p', { class: 'muted', style: 'margin:0 0 16px' }, [
      'Tunjukkan prompt Anda ke rekan kerja yang tidak tahu apa-apa soal pekerjaan itu, lalu minta ia mengerjakannya. Kalau ia kebingungan, model juga akan kebingungan.',
    ])
  );

  section.append(
    el('div', { class: 'note note--amber' }, [
      'Uji ini berlaku terbalik: contoh prompt yang benar adalah yang bisa dikerjakan orang lain tanpa bertanya apa pun kepada Anda. Cara menuliskan syarat lulusnya sebelum prompt dijalankan jauh lebih murah daripada memperbaiki hasil setelahnya.',
    ])
  );

  section.append(
    el('div', { class: 'grid grid--two', style: 'margin-top:16px' }, [
      el('div', { class: 'panel' }, [
        el('div', { class: 'panel__title', style: 'margin-bottom:8px' }, ['Sebelum menjalankan']),
        el('ul', { class: 'steps' }, [
          el('li', {}, ['Tuliskan apa yang membuat hasilnya dianggap berhasil.']),
          el('li', {}, ['Sebut jumlah, rasio, dan durasinya.']),
          el('li', {}, ['Tuliskan apa yang tidak boleh muncul.']),
          el('li', {}, ['Pastikan deskripsi subjek cukup lengkap untuk diulang di klip berikutnya.']),
        ]),
      ]),
      el('div', { class: 'panel' }, [
        el('div', { class: 'panel__title', style: 'margin-bottom:8px' }, ['Setelah menjalankan']),
        el('ul', { class: 'steps' }, [
          el('li', {}, ['Perbaiki satu elemen saja, jangan menulis ulang seluruh prompt.']),
          el('li', {}, ['Simpan versi yang berhasil sebagai template tetap.']),
          el('li', {}, ['Kalau butuh varian regional, ubah hanya daftar elemen yang berubah.']),
          el('li', {}, ['Catat biaya per video yang benar-benar dipakai.']),
        ]),
      ]),
    ])
  );

  return section;
}
