/** Titik masuk: kerangka aplikasi, navigasi, dan pengarah tab. */

import { ROUTES, state, setRoute } from './state.js';
import { el, clear, qs, toast } from './lib/utils.js';
import { settings, resolveKey } from './lib/store.js';

import { renderStudio } from './views/studio.js';
import { renderLibrary } from './views/library.js';
import { renderStoryboard } from './views/storyboard.js';
import { renderPlan } from './views/plan.js';
import { renderGuide } from './views/guide.js';
import { renderProjects } from './views/projects.js';
import { renderSettings } from './views/settings.js';

const VIEWS = {
  studio: renderStudio,
  library: renderLibrary,
  storyboard: renderStoryboard,
  plan: renderPlan,
  guide: renderGuide,
  projects: renderProjects,
  settings: renderSettings,
};

const navHost = qs('#nav');
const viewHost = qs('#view');
const rail = qs('#rail');

function renderNav() {
  clear(navHost);
  for (const route of ROUTES) {
    const button = el(
      'button',
      {
        class: 'navbtn',
        type: 'button',
        'aria-current': state.route === route.id ? 'page' : null,
        onclick: () => navigate(route.id),
      },
      [
        el('span', { class: 'navbtn__glyph' }, [route.glyph]),
        el('span', {}, [route.label]),
      ]
    );
    navHost.append(button);
  }
}

export function navigate(route) {
  if (!VIEWS[route]) return;
  setRoute(route);
  if (location.hash !== `#${route}`) history.replaceState(null, '', `#${route}`);
  renderNav();
  rail.classList.remove('is-open');
  clear(viewHost);
  const node = VIEWS[route]();
  viewHost.append(node);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  refreshKeyStatus();
}

/** Panggil ulang tab yang sedang tampil, misalnya setelah template dipilih. */
export function rerender() {
  navigate(state.route);
}

export function refreshKeyStatus() {
  const dot = qs('#key-dot');
  const label = qs('#key-status');
  if (!dot || !label) return;
  const provider = settings.get().provider;
  const ok = Boolean(resolveKey(provider)) || Boolean(resolveKey('gemini'));
  dot.classList.toggle('dot--on', ok);
  const names = { gemini: 'Google Gemini', openai: 'OpenAI' };
  label.textContent = ok ? `Kunci ${names[provider] || provider} siap` : 'Kunci API belum diisi';
}

window.addEventListener('hashchange', () => {
  const route = location.hash.replace('#', '');
  if (route && route !== state.route) navigate(route);
});

qs('#menubtn').addEventListener('click', () => rail.classList.toggle('is-open'));

document.addEventListener('click', (event) => {
  if (window.innerWidth > 860) return;
  if (!rail.classList.contains('is-open')) return;
  if (rail.contains(event.target) || qs('#menubtn').contains(event.target)) return;
  rail.classList.remove('is-open');
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  toast(reason?.message || 'Terjadi kesalahan.', 'error');
  event.preventDefault();
});

const initial = location.hash.replace('#', '');
navigate(VIEWS[initial] ? initial : 'studio');
