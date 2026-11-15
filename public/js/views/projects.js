/** Proyek: semua prompt dan papan cerita yang tersimpan di browser ini. */

import { projects } from '../lib/store.js';
import { state } from '../state.js';
import { el, clear, qs, toast, copyText, downloadText } from '../lib/utils.js';
import { navigate } from '../app.js';

export function renderProjects() {
  const view = el('div', { class: 'view' });
  const list = projects.all();

  view.append(
    el('header', { class: 'page-head' }, [
      el('div', {}, [
        el('div', { class: 'page-head__kicker' }, ['Proyek tersimpan']),
        el('h1', {}, ['Semua yang Anda simpan, di browser ini']),
        el('p', {}, [
          'Tidak ada yang dikirim ke server. Simpan cadangan sebagai berkas JSON kalau Anda ingin memindahkannya ke perangkat lain.',
        ]),
      ]),
      el('div', { class: 'hstack' }, [
        el('button', {
          class: 'btn',
          type: 'button',
          onclick: () => {
            if (!list.length) return toast('Belum ada proyek untuk diekspor.', 'error');
            downloadText(JSON.stringify(list, null, 2), `sinema-cadangan-${Date.now()}.json`, 'application/json');
            toast('Cadangan diunduh.', 'success');
          },
        }, ['Unduh cadangan']),
        el('label', { class: 'btn', style: 'cursor:pointer' }, [
          'Muat cadangan',
          el('input', {
            type: 'file',
            accept: 'application/json',
            class: 'offscreen',
            onchange: async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const data = JSON.parse(await file.text());
                if (!Array.isArray(data)) throw new Error('Isi berkas bukan daftar proyek.');
                for (const record of data) projects.save(record);
                toast(`${data.length} proyek dimuat.`, 'success');
                navigate('projects');
              } catch (error) {
                toast(`Gagal memuat: ${error.message}`, 'error');
              }
            },
          }),
        ]),
      ]),
    ])
  );

  if (!list.length) {
    view.append(
      el('div', { class: 'empty' }, [
        el('h3', {}, ['Belum ada proyek']),
        el('p', {}, ['Buka Studio, isi slot S.C.E.N.E., lalu tekan Simpan proyek.']),
        el('button', { class: 'btn btn--primary', type: 'button', style: 'margin-top:14px', onclick: () => navigate('studio') }, [
          'Buka Studio',
        ]),
      ])
    );
    return view;
  }

  const grid = el('div', { class: 'grid grid--cards' });
  for (const record of list) {
    const date = new Date(record.updatedAt || record.createdAt || Date.now());
    grid.append(
      el('article', { class: 'card', style: 'cursor:default' }, [
        el('div', { class: 'card__top' }, [
          el('span', {}, [record.kind === 'storyboard' ? 'Papan cerita' : 'Prompt']),
          el('span', { class: 'spacer' }),
          el('span', {}, [date.toLocaleDateString('id-ID')]),
        ]),
        el('h3', { class: 'card__name' }, [record.name || 'Tanpa nama']),
        el('p', { class: 'card__tag' }, [record.templateId || '']),
        el('details', {}, [
          el('summary', {}, ['Lihat prompt']),
          el('div', {}, [
            el('div', { class: 'mono', style: 'white-space:pre-wrap; line-height:1.6; max-height:220px; overflow:auto' }, [
              record.prompt || '—',
            ]),
          ]),
        ]),
        el('div', { class: 'hstack' }, [
          el('button', {
            class: 'btn btn--small btn--primary',
            type: 'button',
            onclick: () => {
              if (record.kind === 'storyboard' && record.board) {
                state.storyboard = record.board;
                navigate('storyboard');
              } else if (record.draft) {
                state.draft = record.draft;
                navigate('studio');
              } else {
                toast('Proyek ini tidak memuat data yang bisa dibuka.', 'error');
              }
            },
          }, ['Buka']),
          el('button', {
            class: 'btn btn--small',
            type: 'button',
            onclick: async () => {
              await copyText(record.prompt || '');
              toast('Prompt disalin.', 'success');
            },
          }, ['Salin']),
          el('span', { class: 'spacer' }),
          el('button', {
            class: 'btn btn--small btn--ghost',
            type: 'button',
            onclick: () => {
              projects.remove(record.id);
              toast('Proyek dihapus.', 'success');
              navigate('projects');
            },
          }, ['Hapus']),
        ]),
      ])
    );
  }

  view.append(grid);
  return view;
}
