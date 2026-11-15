/** Rencana & Cuan: niche, jadwal 30 hari, jalur pendapatan, dan ukuran. */

import {
  NICHES,
  CONTENT_PLAN,
  MONETIZATION_PATHS,
  METRICS,
} from '../data/playbook.js';
import { TEMPLATES } from '../data/templates.js';
import { el, clear, qs, toast, copyText, downloadText } from '../lib/utils.js';
import { state, newDraft } from '../state.js';
import { navigate } from '../app.js';

let activeNiche = NICHES[0].id;

export function renderPlan() {
  const view = el('div', { class: 'view' });

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Rencana & cuan']),
        el('h1', {}, ['Video mana yang layak dibuat, dan dari mana uangnya']),
        el('p', {}, [
          'Template menghasilkan video. Bagian ini yang menentukan video mana yang dibuat lebih dulu, seberapa sering, dan bagaimana hasilnya berubah menjadi pendapatan.',
        ]),
      ]),
      el('div', { class: 'hstack' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          onclick: exportPlan,
        }, ['Unduh rencana .md']),
      ]),
    ])
  );

  view.append(buildStats());
  view.append(buildNichePicker());
  view.append(buildNicheDetail());
  view.append(buildCalendar());
  view.append(buildPaths());
  view.append(buildMetrics());

  return view;
}

function buildStats() {
  const wrap = el('div', { class: 'grid', style: 'grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); margin-bottom:26px' });
  const stats = [
    { value: String(TEMPLATES.length), label: 'Template video' },
    { value: '8s', label: 'Batas satu klip' },
    { value: '30', label: 'Hari rencana' },
    { value: String(MONETIZATION_PATHS.length), label: 'Jalur pendapatan' },
  ];
  for (const stat of stats) {
    wrap.append(
      el('div', { class: 'stat' }, [
        el('div', { class: 'stat__value' }, [stat.value]),
        el('div', { class: 'stat__label' }, [stat.label]),
      ])
    );
  }
  return wrap;
}

function buildNichePicker() {
  const section = el('section', { style: 'margin-bottom:24px' });
  section.append(el('h2', { style: 'font-size:24px; margin-bottom:6px' }, ['Pilih niche lebih dulu']));
  section.append(
    el('p', { class: 'muted small', style: 'margin:0 0 16px' }, [
      'Hindari video abstrak yang acak. Pembeli mencari klip kebutuhan komersial: latar presentasi teknologi, pemandangan sinematik, animasi loop, atau simulasi konsep bisnis.',
    ])
  );

  const pills = el('div', { class: 'filters' });
  for (const niche of NICHES) {
    pills.append(
      el('button', {
        class: 'pill',
        type: 'button',
        'aria-pressed': String(activeNiche === niche.id),
        onclick: (event) => {
          activeNiche = niche.id;
          [...pills.children].forEach((n) => n.setAttribute('aria-pressed', 'false'));
          event.currentTarget.setAttribute('aria-pressed', 'true');
          const host = qs('#niche-detail');
          clear(host);
          host.append(buildNicheDetailContent());
        },
      }, [niche.name])
    );
  }

  section.append(pills);
  return section;
}

function buildNicheDetail() {
  const host = el('div', { id: 'niche-detail' });
  queueMicrotask(() => host.append(buildNicheDetailContent()));
  return host;
}

function buildNicheDetailContent() {
  const niche = NICHES.find((n) => n.id === activeNiche) || NICHES[0];
  const panel = el('section', { class: 'panel' });
  const grid = el('div', { class: 'grid grid--two' });

  const left = el('div', { class: 'stack' }, [
    el('div', { class: 'panel__title' }, [niche.name]),
    el('p', { class: 'muted', style: 'margin:0' }, [niche.hook]),
    el('div', {}, [
      el('div', { class: 'field__label', style: 'margin-bottom:8px' }, ['Template yang dipakai']),
      el(
        'div',
        { class: 'hstack' },
        niche.templates.map((id) => {
          const template = TEMPLATES.find((t) => t.id === id);
          return el('button', {
            class: 'chip chip--amber',
            type: 'button',
            style: 'cursor:pointer',
            onclick: () => {
              state.draft = newDraft(id);
              navigate('studio');
            },
          }, [template ? template.name : id]);
        })
      ),
    ]),
    el('div', {}, [
      el('div', { class: 'field__label', style: 'margin-bottom:8px' }, ['Jalur pendapatan']),
      el('ul', { class: 'steps' }, niche.monetize.map((item) => el('li', {}, [item]))),
    ]),
  ]);

  const right = el('div', { class: 'stack' }, [
    el('div', { class: 'money' }, [niche.moneyMath]),
    el('div', { class: 'note' }, [el('strong', {}, ['Irama produksi: ']), niche.cadence]),
    el('div', { class: 'caution' }, [el('strong', {}, ['Yang harus dijaga: ']), niche.caution]),
  ]);

  grid.append(left, right);
  panel.append(grid);
  return panel;
}

function buildCalendar() {
  const section = el('section', { style: 'margin: 44px 0 0' });
  section.append(
    el('header', { class: 'page-head', style: 'border:none; padding-bottom:10px' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Jadwal 30 hari']),
        el('h2', { style: 'font-size:26px' }, ['Pola produksi yang bisa diulang setiap bulan']),
        el('p', {}, [
          'Setiap tujuh hari ada satu hari evaluasi. Tanpa hari evaluasi, produksi berjalan tetapi tidak ada yang dipelajari.',
        ]),
      ]),
      el('div', { class: 'hstack' }, [
        el('span', { class: 'chip chip--sky' }, ['Hook']),
        el('span', { class: 'chip chip--amber' }, ['Bukti']),
        el('span', { class: 'chip' }, ['Cerita']),
      ]),
    ])
  );

  const calendar = el('div', { class: 'calendar' });
  for (const day of CONTENT_PLAN) {
    const template = day.template ? TEMPLATES.find((t) => t.id === day.template) : null;
    const card = el('div', { class: `day${day.template ? '' : ' day--eval'}` }, [
      el('div', { class: 'day__num' }, [`Hari ${day.day}`]),
      el('div', { class: 'day__type' }, [day.type]),
      el('div', { class: 'day__goal' }, [day.goal]),
      template
        ? el('button', {
            class: 'chip',
            type: 'button',
            style: 'cursor:pointer; align-self:flex-start',
            onclick: () => {
              state.draft = newDraft(template.id);
              navigate('studio');
            },
          }, [template.name])
        : null,
    ]);
    calendar.append(card);
  }

  section.append(calendar);
  return section;
}

function buildPaths() {
  const section = el('section', { style: 'margin-top:44px' });
  section.append(
    el('header', { class: 'page-head', style: 'border:none; padding-bottom:10px' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Jalur pendapatan']),
        el('h2', { style: 'font-size:26px' }, ['Tujuh cara hasilnya berubah menjadi uang']),
        el('p', {}, [
          'Disusun dari yang paling cepat dimulai. Jalur paling atas biasanya memberi uang pertama dalam hitungan hari, bukan bulan.',
        ]),
      ]),
    ])
  );

  const grid = el('div', { class: 'grid grid--cards' });
  MONETIZATION_PATHS.forEach((path, index) => {
    grid.append(
      el('article', { class: 'path' }, [
        el('div', { class: 'path__head' }, [
          el('div', { class: 'path__name' }, [`${index + 1}. ${path.name}`]),
        ]),
        el('div', { class: 'path__meta' }, [
          el('span', { class: 'chip chip--jade' }, [`uang: ${path.timeToMoney}`]),
          el('span', { class: 'chip' }, [`usaha: ${path.effort}`]),
        ]),
        el('p', { class: 'path__body', style: 'margin:0' }, [path.detail]),
        el('div', { class: 'path__step' }, [`Langkah pertama: ${path.firstStep}`]),
      ])
    );
  });

  section.append(grid);
  return section;
}

function buildMetrics() {
  const section = el('section', { style: 'margin-top:44px' });
  section.append(
    el('header', { class: 'page-head', style: 'border:none; padding-bottom:10px' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Ukuran keberhasilan']),
        el('h2', { style: 'font-size:26px' }, ['Yang diperiksa, bukan yang dirasakan']),
      ]),
    ])
  );

  const table = el('div', { class: 'table-wrap' }, [
    el('table', {}, [
      el('thead', {}, [
        el('tr', {}, [
          el('th', {}, ['Ukuran']),
          el('th', {}, ['Sasaran']),
          el('th', {}, ['Kalau tidak tercapai']),
        ]),
      ]),
      el(
        'tbody',
        {},
        METRICS.map((metric) =>
          el('tr', {}, [
            el('td', {}, [el('strong', {}, [metric.label])]),
            el('td', {}, [el('code', {}, [metric.target])]),
            el('td', { class: 'small muted' }, [metric.why]),
          ])
        )
      ),
    ]),
  ]);

  section.append(table);
  return section;
}

function exportPlan() {
  const niche = NICHES.find((n) => n.id === activeNiche) || NICHES[0];
  const lines = [
    `# Rencana produksi video AI — niche ${niche.name}`,
    '',
    `> Dibuat dari Sinema AI Studio pada ${new Date().toLocaleString('id-ID')}.`,
    '',
    '## Niche',
    '',
    `- Pancingan: ${niche.hook}`,
    `- Template: ${niche.templates.join(', ')}`,
    `- Irama: ${niche.cadence}`,
    `- Perhitungan: ${niche.moneyMath}`,
    `- Yang harus dijaga: ${niche.caution}`,
    '',
    '## Jalur pendapatan',
    '',
    ...niche.monetize.map((item) => `- ${item}`),
    '',
    '## Jadwal 30 hari',
    '',
    '| Hari | Jenis | Template | Sasaran |',
    '| --- | --- | --- | --- |',
    ...CONTENT_PLAN.map((day) => `| ${day.day} | ${day.type} | ${day.template || '—'} | ${day.goal} |`),
    '',
    '## Ukuran keberhasilan',
    '',
    '| Ukuran | Sasaran | Catatan |',
    '| --- | --- | --- |',
    ...METRICS.map((m) => `| ${m.label} | ${m.target} | ${m.why} |`),
  ];

  downloadText(lines.join('\n'), `rencana-${niche.id}.md`, 'text/markdown;charset=utf-8');
  toast('Rencana diunduh.', 'success');
}
