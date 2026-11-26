// App shell: boot, hash router, chrome status, global error surface.
import { store } from './store.js';
import { html, icon, chunksLabel } from './utils.js';
import { toast, closeAllModals } from './ui.js';
import { homeScreen } from './screens/home.js';
import { levelScreen } from './screens/level.js';
import { practiceScreen } from './screens/practice.js';
import { reviewScreen } from './screens/review.js';
import { statsScreen } from './screens/stats.js';
import { settingsScreen } from './screens/settings.js';
import { methodScreen } from './screens/method.js';
import { trophiesScreen } from './screens/trophies.js';
import { chillScreen } from './screens/chill.js';
import { libraryScreen } from './screens/library.js';
import { audioEngine } from './audioEngine.js';
import { trophyManager } from './trophies.js';
import { reviewScheduler } from './scheduler.js';
import { initI18n, applyDOMLocalization } from './i18n.js';

const routes = [
  { name: 'home', pattern: /^\/?$/, screen: homeScreen },
  { name: 'home', pattern: /^\/home$/, screen: homeScreen },
  { name: 'library', pattern: /^\/library(?:\/([^/]+))?$/, screen: libraryScreen, keys: ['topicId'] },
  { name: 'level', pattern: /^\/level\/([A-Z]\d)$/, screen: levelScreen, keys: ['levelId'] },
  { name: 'practice', pattern: /^\/practice\/([A-Z]\d-\d{3})$/, screen: practiceScreen, keys: ['chunkId'] },
  { name: 'review', pattern: /^\/review$/, screen: reviewScreen },
  { name: 'stats', pattern: /^\/stats$/, screen: statsScreen },
  { name: 'trophies', pattern: /^\/trophies$/, screen: trophiesScreen },
  { name: 'settings', pattern: /^\/settings$/, screen: settingsScreen },
  { name: 'method', pattern: /^\/method$/, screen: methodScreen },
  { name: 'chill', pattern: /^\/chill$/, screen: chillScreen },
];

const view = document.getElementById('view');
let cleanup = null;
let current = null;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

export function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/home';
  const [path, search] = raw.split('?');
  return { path: path || '/home', query: new URLSearchParams(search || '') };
}

function resolve() {
  const { path, query } = parseHash();
  for (const entry of routes) {
    const match = entry.pattern.exec(path);
    if (!match) continue;
    const params = {};
    (entry.keys || []).forEach((key, index) => {
      params[key] = decodeURIComponent(match[index + 1] || '');
    });
    return { ...entry, params, query };
  }
  return { ...routes[0], params: {}, query };
}

function updateChrome(name) {
  document.querySelectorAll('.nav a').forEach((link) => {
    const navName = link.dataset.nav;
    const active = navName === name || (name === 'level' && navName === 'home');
    link.classList.toggle('is-active', active);
  });

  const badge = document.getElementById('nav-due');
  const due = store.overall().due;
  badge.hidden = due === 0;
  badge.textContent = due > 99 ? '99+' : String(due);

  const pill = document.getElementById('streak-pill');
  const streak = store.streak();
  pill.innerHTML = String(
    html`${icon('flame')}${streak > 0 ? html`<span>${streak} يوم متواصل</span>` : html`<span>ابدأ سلسلتك</span>`}`,
  );
  pill.title = streak > 0 ? `${streak} يوم متواصل` : 'لسه مفيش أيام متواصلة';

  const soundBtn = document.getElementById('sound-btn');
  if (soundBtn) {
    const isMuted = !audioEngine.soundEnabled;
    soundBtn.innerHTML = String(html`<svg class="i"><use href="#${isMuted ? 'i-speaker-off' : 'i-speaker'}" /></svg>`);
    soundBtn.title = isMuted ? 'الصوت مكتوم — اضغط للتشغيل' : 'المؤثرات الصوتية مفعلة — اضغط للكتم';
    soundBtn.setAttribute('aria-label', soundBtn.title);
    soundBtn.classList.toggle('is-muted', isMuted);
  }
}

function route() {
  try {
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (err) {
        console.warn('Error during screen cleanup:', err);
      }
      cleanup = null;
    }
    closeAllModals();
    const match = resolve();
    const context = {
      params: match.params,
      query: match.query,
      navigate,
      refresh: () => route(),
      name: match.name,
    };
    const markup = match.screen.render(context);
    view.innerHTML = String(markup);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => window.scrollTo(0, 0));
    cleanup = match.screen.mount?.(view, context) || null;
    current = match;
    updateChrome(match.name);
    applyDOMLocalization(document.body);
  } catch (error) {
    console.error(error);
    view.innerHTML = String(failScreen(error));
    updateChrome('home');
  }
}

function failScreen(error) {
  return html`
    <div class="page">
      <div class="empty">
        <div class="empty-icon">${icon('spark')}</div>
        <h3>حصلت مشكلة في تحميل الصفحة</h3>
        <p>${String(error?.message || error)}</p>
        <a class="btn btn-primary" href="#/home">رجوع للرئيسية</a>
      </div>
    </div>
  `;
}

async function boot() {
  try {
    await store.init();
    document.documentElement.dataset.theme = store.state.settings.theme === 'dark' ? 'dark' : 'light';
    reviewScheduler.init();
  } catch (error) {
    console.error(error);
    view.innerHTML = String(html`
      <div class="page">
        <div class="empty">
          <div class="empty-icon">${icon('spark')}</div>
          <h3>مش قادر أفتح ملفات الشانكس</h3>
          <p>${String(error?.message || error)} — اتأكد إن فولدر <b>data/chunks.json</b> موجود جوه التطبيق.</p>
        </div>
      </div>
    `);
    return;
  }

  document.getElementById('settings-btn')?.addEventListener('click', () => navigate('#/settings'));

  document.getElementById('sound-btn')?.addEventListener('click', () => {
    const enabled = audioEngine.toggleSound();
    updateChrome(current?.name || 'home');
    toast(enabled ? 'تم تفعيل المؤثرات الصوتية 🔊' : 'تم كتم الصوت 🔇', enabled ? 'speaker' : 'speaker-off');
  });

  // Global tactile feedback for buttons and switches
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a, .switch, .tab-btn');
    if (!target) return;
    if (target.id === 'sound-btn') return; // Handled separately
    if (target.dataset.noSound) return;
    // Skip elements that play their own dedicated action sounds, TTS, or drills
    if (target.closest('[data-no-sound], [data-grade], [data-produce], [data-voice], [data-act^="test-"], [data-act="speak"], [data-act="slow"], [data-act="natural"], [data-act="record"], [data-batch-log], [data-act="say"], [data-act="blind"], [data-act="batch:log"], [data-act="batch:extra"], [data-act="vary:save"], [data-act="vary:del"], [data-act="speak:pass"], [data-act="test-notification-chime"], [data-plus], [data-reveal], [data-answer]')) return;
    if (target.classList.contains('switch')) {
      const isNowOn = !target.classList.contains('is-on');
      audioEngine.playToggle(isNowOn);
    } else {
      audioEngine.playTap();
    }
  });

  audioEngine.onPreferenceChange(() => updateChrome(current?.name || 'home'));

  if (new URLSearchParams(location.search).get('debug') === '1') window.__store = store;

  window.addEventListener('hashchange', route);
  initI18n(() => route());
  window.addEventListener('beforeunload', () => {
    store.flushSync();
  });
  window.addEventListener('pagehide', () => {
    store.flushSync();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) store.flush();
  });

  route();

  store.onChange = () => updateChrome(current?.name || 'home');

  if (store.recoveredFromBackup) {
    setTimeout(() => {
      toast('تم استرجاع تقدمك تلقائيًا من آخر نسخة احتياطية سليمة 🛡️', 'spark');
      store.recoveredFromBackup = false;
    }, 800);
  }

  if (store.freshImport) {
    setTimeout(() => {
      toast(`لقيت تقدمك القديم في ملف A1 — استوردت ${chunksLabel(store.state.meta.importedCount)}`, 'spark');
      store.freshImport = false;
    }, 900);
  }
}

boot();
