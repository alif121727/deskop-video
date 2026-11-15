/** Pustaka template: telusuri, saring, lalu buka di Studio. */

import { TEMPLATES, IMAGE_TEMPLATES, TEXT_TEMPLATES, CATEGORIES } from '../data/templates.js';
import { el, qs, clear, toast, copyText } from '../lib/utils.js';
import { state, newDraft, setRoute } from '../state.js';
import { navigate } from '../app.js';
import { fillPlaceholders } from '../lib/prompt.js';

const filter = { category: 'semua', query: '' };

export function renderLibrary() {
  const view = el('div', { class: 'view' });

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Pustaka template']),
        el('h1', {}, ['Dua puluh lima brief yang sudah siap diisi']),
        el('p', {}, [
          'Setiap template memuat lima slot S.C.E.N.E. dan satu bagian larangan. Yang perlu Anda ganti hanyalah subjek, konteks, dan bentuk keluarannya — sisanya sudah disusun untuk kebutuhan video iklan pendek.',
        ]),
      ]),
      el('div', { class: 'hstack' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          onclick: () => {
            state.draft = newDraft(TEMPLATES[0].id);
            navigate('studio');
          },
        }, ['Mulai dari nol →']),
      ]),
    ])
  );

  view.append(buildFilters());
  view.append(el('div', { id: 'card-grid', class: 'grid grid--cards' }));
  view.append(buildImageSection());
  view.append(buildTextSection());

  queueMicrotask(paintCards);
  return view;
}

function buildFilters() {
  const host = el('div', { class: 'filters' });

  const search = el('input', {
    type: 'search',
    class: 'filters__search',
    placeholder: 'Cari template, misalnya "makanan" atau "UGC"…',
    oninput: (event) => {
      filter.query = event.target.value.toLowerCase().trim();
      paintCards();
    },
  });

  const pills = el('div', { class: 'hstack', style: 'gap:8px' });
  const options = [{ id: 'semua', label: 'Semua' }, ...CATEGORIES];
  for (const option of options) {
    pills.append(
      el('button', {
        class: 'pill',
        type: 'button',
        'aria-pressed': String(filter.category === option.id),
        onclick: (event) => {
          filter.category = option.id;
          [...pills.children].forEach((node) => node.setAttribute('aria-pressed', 'false'));
          event.currentTarget.setAttribute('aria-pressed', 'true');
          paintCards();
        },
      }, [option.label])
    );
  }

  host.append(search, pills);
  return host;
}

function matches(template) {
  if (filter.category !== 'semua' && template.category !== filter.category) return false;
  if (!filter.query) return true;
  const haystack = [
    template.name,
    template.tagline,
    template.category,
    template.base,
    ...Object.values(template.scene),
    ...(template.platforms || []),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(filter.query);
}

function paintCards() {
  const grid = qs('#card-grid');
  if (!grid) return;
  clear(grid);
  const list = TEMPLATES.filter(matches);

  if (!list.length) {
    grid.append(
      el('div', { class: 'empty', style: 'grid-column:1/-1' }, [
        el('h3', {}, ['Tidak ada template yang cocok']),
        el('p', {}, ['Coba kata kunci lain atau pilih kategori "Semua".']),
      ])
    );
    return;
  }

  for (const template of list) grid.append(buildCard(template));
}

function buildCard(template) {
  const category = CATEGORIES.find((c) => c.id === template.category);
  const card = el('article', { class: 'card' }, [
    el('div', { class: 'card__top' }, [
      el('span', {}, [category ? category.label : template.category]),
      el('span', { class: 'spacer' }),
      el('span', {}, [`${template.duration}s`]),
    ]),
    el('h3', { class: 'card__name' }, [template.name]),
    el('p', { class: 'card__tag' }, [template.tagline]),
    el('div', { class: 'card__foot' }, [
      ...template.aspects.slice(0, 3).map((aspect) => el('span', { class: 'chip' }, [aspect])),
      el('span', { class: 'chip chip--amber' }, [`${template.locked.length} terkunci`]),
    ]),
    el('div', { class: 'hstack', style: 'gap:8px; margin-top:2px' }, [
      el('button', {
        class: 'btn btn--small btn--primary',
        type: 'button',
        onclick: (event) => {
          event.stopPropagation();
          useTemplate(template);
        },
      }, ['Buka di Studio']),
      el('button', {
        class: 'btn btn--small btn--ghost',
        type: 'button',
        onclick: async (event) => {
          event.stopPropagation();
          await copyText(template.base);
          toast('Prompt dasar disalin. Ganti bagian bertanda kurung.', 'success');
        },
      }, ['Salin dasar']),
    ]),
  ]);

  card.addEventListener('click', () => useTemplate(template));
  return card;
}

function useTemplate(template) {
  state.draft = newDraft(template.id);
  setRoute('studio');
  navigate('studio');
}

/* ------------------------------------------------------------------ */
/* gambar & teks                                                       */
/* ------------------------------------------------------------------ */

function buildImageSection() {
  const section = el('section', { style: 'margin-top: 46px' });
  section.append(
    el('header', { class: 'page-head', style: 'border:none; padding-bottom:8px' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Gambar pendamping']),
        el('h2', { style: 'font-size:26px' }, ['Tiga permintaan yang paling sering gagal']),
        el('p', {}, [
          'Poster, logo, dan bahan iklan. Ketiganya menuntut huruf ikut tergambar, dan di situ model gambar paling sering meleset. Cara aman: minta ruangnya, bukan tulisannya.',
        ]),
      ]),
    ])
  );

  const grid = el('div', { class: 'grid grid--cards' });
  for (const template of IMAGE_TEMPLATES) {
    grid.append(
      el('article', { class: 'card' }, [
        el('div', { class: 'card__top' }, [
          el('span', {}, ['Gambar']),
          el('span', { class: 'spacer' }),
          el('span', {}, [`rasio ${template.ratio}`]),
        ]),
        el('h3', { class: 'card__name' }, [template.name]),
        el('p', { class: 'card__tag' }, [template.tagline]),
        el('div', { class: 'card__foot' }, [el('span', { class: 'chip chip--sky' }, [template.ratio])]),
        el('details', {}, [
          el('summary', {}, ['Prompt lengkap']),
          el('div', {}, [
            el('div', { class: 'mono', style: 'white-space:pre-wrap; line-height:1.6' }, [template.base]),
          ]),
        ]),
        el('div', { class: 'caution' }, [template.tips]),
        el('button', {
          class: 'btn btn--small',
          type: 'button',
          onclick: async () => {
            await copyText(fillPlaceholders(template.base, { ratio: template.ratio }));
            toast('Prompt gambar disalin.', 'success');
          },
        }, ['Salin prompt']),
      ])
    );
  }

  section.append(grid);
  return section;
}

function buildTextSection() {
  const section = el('section', { style: 'margin-top: 46px' });
  section.append(
    el('header', { class: 'page-head', style: 'border:none; padding-bottom:8px' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Prompt teks']),
        el('h2', { style: 'font-size:26px' }, ['Naskah, sudut penawaran, dan tugas kuliah']),
        el('p', {}, [
          'Yang selalu ikut pindah antar-tool adalah tugasnya, batasannya, dan bentuk keluarannya. Yang perlu ditulis ulang hanya pembungkusnya.',
        ]),
      ]),
    ])
  );

  const table = el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', {}, ['Template']),
          el('th', {}, ['Prompt siap isi']),
          el('th', {}, ['Catatan']),
          el('th', {}, ['']),
        ]),
      ]),
      el(
        'tbody',
        {},
        TEXT_TEMPLATES.map((template) =>
          el('tr', {}, [
            el('td', {}, [
              el('strong', {}, [template.name]),
              template.provider
                ? el('div', { class: 'small muted' }, [`pembungkus ${template.provider}`])
                : null,
            ]),
            el('td', {}, [
              el('div', { class: 'mono', style: 'white-space:pre-wrap; line-height:1.6' }, [template.base]),
            ]),
            el('td', { class: 'small muted' }, [template.tips]),
            el('td', {}, [
              el('button', {
                class: 'btn btn--small',
                type: 'button',
                onclick: async () => {
                  await copyText(template.base);
                  toast('Prompt teks disalin.', 'success');
                },
              }, ['Salin']),
            ]),
          ])
        )
      ),
    ]),
  ]);

  section.append(table);
  return section;
}
