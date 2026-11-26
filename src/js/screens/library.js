import { html, icon, clamp } from '../utils.js';
import { toast } from '../ui.js';
import { store } from '../store.js';

const STORAGE_KEY = 'chunk-trainer-library-v1';
const PAGE_SIZE = 36;

let cachedManifest = null;
let loadPromise = null;

export function loadUserLibState() {
  if (store?.loaded && store.state?.library) {
    return {
      read: new Set(Array.isArray(store.state.library.read) ? store.state.library.read : []),
      fav: new Set(Array.isArray(store.state.library.fav) ? store.state.library.fav : []),
    };
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      read: new Set(Array.isArray(parsed?.read) ? parsed.read : []),
      fav: new Set(Array.isArray(parsed?.fav) ? parsed.fav : []),
    };
  } catch {
    return { read: new Set(), fav: new Set() };
  }
}

export function saveUserLibState(st) {
  if (store?.loaded) {
    store.setLibraryState(st.read, st.fav);
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        read: [...st.read],
        fav: [...st.fav],
      }),
    );
  } catch {}
}

export async function ensureLibraryManifest() {
  if (cachedManifest) return cachedManifest;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const url = new URL('../../../data/library.json', import.meta.url);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cachedManifest = await res.json();
      return cachedManifest;
    } catch (err) {
      loadPromise = null;
      throw err;
    }
  })();
  return loadPromise;
}

/**
 * Returns curated visual guides for a specific CEFR level ('A1' | 'A2' | 'B1' | 'B2' | 'C1'),
 * sorted so core grammar & sentence structure (Satzbau) cards appear first.
 */
export function getVisualGuidesForLevel(manifest, levelId) {
  if (!manifest || !Array.isArray(manifest.items)) return [];
  const lv = String(levelId || 'A1').toUpperCase();
  const priorityTopics = ['a1-a2', 'b1-b2', 'c1', 'grammatik', 'umgangssprache', 'redemittel-idiome', 'neue-woerter', 'kundenservice'];
  return manifest.items
    .filter((item) => Array.isArray(item.levels) && item.levels.includes(lv))
    .sort((a, b) => {
      // Exact level-specific topic comes first (e.g. a1-a2 for A1/A2, b1-b2 for B1/B2, c1 for C1)
      const aDirect =
        ((lv === 'A1' || lv === 'A2') && a.topicId === 'a1-a2') ||
        ((lv === 'B1' || lv === 'B2') && a.topicId === 'b1-b2') ||
        (lv === 'C1' && a.topicId === 'c1');
      const bDirect =
        ((lv === 'A1' || lv === 'A2') && b.topicId === 'a1-a2') ||
        ((lv === 'B1' || lv === 'B2') && b.topicId === 'b1-b2') ||
        (lv === 'C1' && b.topicId === 'c1');
      if (aDirect !== bDirect) return aDirect ? -1 : 1;

      const aIdx = priorityTopics.indexOf(a.topicId);
      const bIdx = priorityTopics.indexOf(b.topicId);
      const aRank = aIdx === -1 ? 99 : aIdx;
      const bRank = bIdx === -1 ? 99 : bIdx;
      if (aRank !== bRank) return aRank - bRank;
      return a.order - b.order;
    });
}

export function renderLibraryCard(item, idx, topicMap, userState) {
  const isRead = userState.read.has(item.id);
  const isFav = userState.fav.has(item.id);
  const topic = topicMap.get(item.topicId);
  const isLandscape = (item.width || 0) > (item.height || 0) * 1.05;
  return html`
    <article
      class="lib-card ${isRead ? 'is-read' : ''} ${isFav ? 'is-fav' : ''} ${isLandscape ? 'is-landscape' : ''}"
      data-card-idx="${idx}"
      data-id="${item.id}"
    >
      <div class="lib-card-media" data-open-idx="${idx}" role="button" tabindex="0" aria-label="عرض ${item.title}">
        <img
          src="${item.src}"
          alt="${item.title}"
          width="${item.width || 900}"
          height="${item.height || 1350}"
          loading="lazy"
          decoding="async"
        />
        <div class="lib-card-overlay">
          <span class="lib-zoom-pill">${icon('eye')} تكبير وقراءة</span>
        </div>
        <div class="lib-card-badges">
          <span class="chip chip-navy">${item.badge}</span>
          ${Array.isArray(item.levels) && item.levels.length <= 2
            ? html`<span class="chip chip-yellow" style="font-size:11px">${item.levels.join(' · ')}</span>`
            : ''}
          ${isRead ? html`<span class="chip chip-green" data-read-badge>${icon('check')} مقروء</span>` : ''}
        </div>
      </div>

      <div class="lib-card-body">
        <div class="lib-card-topic">${topic?.title || item.badge}</div>
        <h3 class="lib-card-title" data-open-idx="${idx}">${item.title}</h3>
        <div class="lib-card-actions">
          <button
            class="lib-action-btn ${isRead ? 'is-on' : ''}"
            data-toggle-read="${item.id}"
            aria-pressed="${isRead ? 'true' : 'false'}"
            title="${isRead ? 'إلغاء علامة المقروء' : 'علّم كمقروء'}"
          >
            ${icon('check')}
            <span>${isRead ? 'تمت قراءته' : 'علّم كمقروء'}</span>
          </button>
          <button
            class="lib-action-btn is-fav-btn ${isFav ? 'is-on' : ''}"
            data-toggle-fav="${item.id}"
            aria-pressed="${isFav ? 'true' : 'false'}"
            title="${isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}"
            aria-label="المفضلة"
          >
            ${icon('spark')}
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Shared standalone Lightbox Controller usable from #/library, #/level/:id, and #/practice/:id
 */
let activeLightboxCleanup = null;

export function closeLibraryLightbox() {
  if (typeof activeLightboxCleanup === 'function') {
    activeLightboxCleanup();
    activeLightboxCleanup = null;
  }
}

export function openLibraryLightbox({ items, startIndex = 0, manifest, userState = loadUserLibState(), onStateChange = null }) {
  closeLibraryLightbox();
  if (!items || !items.length) return;

  let currentIndex = clamp(startIndex, 0, items.length - 1);
  let zoomLevel = 1;

  let portal = document.getElementById('lib-lightbox-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'lib-lightbox-portal';
    document.body.appendChild(portal);
  }
  document.body.style.overflow = 'hidden';

  function updateZoomDOM() {
    const img = document.getElementById('lib-lb-img');
    const lbl = document.getElementById('lib-lb-zoom-label');
    if (img) {
      const basePx = Math.round(920 * zoomLevel);
      img.style.width = zoomLevel === 1 ? '' : `${basePx}px`;
      img.style.maxWidth = zoomLevel === 1 ? 'min(940px, 100%)' : 'none';
    }
    if (lbl) lbl.textContent = `${Math.round(zoomLevel * 100)}%`;
  }

  function paint() {
    const item = items[currentIndex];
    const topic = manifest?.topics?.find((t) => t.id === item.topicId);
    const isRead = userState.read.has(item.id);
    const isFav = userState.fav.has(item.id);

    portal.innerHTML = String(html`
      <div class="lib-lightbox" role="dialog" aria-modal="true" aria-label="${item.title}">
        <header class="lib-lb-header">
          <div class="lib-lb-meta">
            <span class="chip chip-yellow">${item.badge}</span>
            ${Array.isArray(item.levels) ? html`<span class="chip chip-navy">${item.levels.join(' · ')}</span>` : ''}
            <div class="lib-lb-titles">
              <strong>${item.title}</strong>
              <span>${topic?.title || ''} · بطاقة ${currentIndex + 1} من ${items.length}</span>
            </div>
          </div>

          <div class="lib-lb-controls">
            <button class="btn btn-sm btn-ghost" data-lb-zoom="out" title="تصغير (-)">−</button>
            <button class="btn btn-sm btn-ghost" data-lb-zoom="reset" title="إعادة الضبط">
              <span id="lib-lb-zoom-label">${Math.round(zoomLevel * 100)}%</span>
            </button>
            <button class="btn btn-sm btn-ghost" data-lb-zoom="in" title="تكبير (+)">+</button>

            <button
              class="btn btn-sm ${isRead ? 'btn-primary' : 'btn-ghost'}"
              data-lb-read="${item.id}"
              aria-pressed="${isRead ? 'true' : 'false'}"
            >
              ${icon('check')} ${isRead ? 'تمت قراءته' : 'علّم كمقروء'}
            </button>

            <button
              class="btn btn-sm ${isFav ? 'btn-primary' : 'btn-ghost'}"
              data-lb-fav="${item.id}"
              aria-pressed="${isFav ? 'true' : 'false'}"
              title="حفظ في المفضلة"
            >
              ${icon('spark')} ${isFav ? 'في المفضلة' : 'مفضلة'}
            </button>

            <button class="icon-btn lib-lb-close" data-lb-close aria-label="إغلاق (Esc)" title="إغلاق (Esc)">
              ${icon('close')}
            </button>
          </div>
        </header>

        <div class="lib-lb-stage" data-lb-backdrop>
          <button
            class="lib-lb-nav is-prev"
            data-lb-nav="-1"
            ${currentIndex === 0 ? 'disabled' : ''}
            aria-label="البطاقة السابقة"
            title="السابق (سهم يمين)"
          >
            ${icon('back')}
          </button>

          <div class="lib-lb-canvas" id="lib-lb-canvas">
            <img
              id="lib-lb-img"
              src="${item.src}"
              alt="${item.title}"
            />
          </div>

          <button
            class="lib-lb-nav is-next"
            data-lb-nav="1"
            ${currentIndex >= items.length - 1 ? 'disabled' : ''}
            aria-label="البطاقة التالية"
            title="التالي (سهم يسار)"
          >
            ${icon('forward')}
          </button>
        </div>
      </div>
    `);
    updateZoomDOM();
  }

  const onPortalClick = (event) => {
    if (event.target.closest('[data-lb-close]') || event.target.matches('[data-lb-backdrop]')) {
      closeLibraryLightbox();
      return;
    }

    const navBtn = event.target.closest('[data-lb-nav]');
    if (navBtn) {
      const nextIdx = currentIndex + Number(navBtn.dataset.lbNav);
      if (nextIdx >= 0 && nextIdx < items.length) {
        currentIndex = nextIdx;
        zoomLevel = 1;
        paint();
      }
      return;
    }

    const zoomBtn = event.target.closest('[data-lb-zoom]');
    if (zoomBtn) {
      const mode = zoomBtn.dataset.lbZoom;
      if (mode === 'in') zoomLevel = clamp(Number((zoomLevel + 0.25).toFixed(2)), 0.5, 3);
      else if (mode === 'out') zoomLevel = clamp(Number((zoomLevel - 0.25).toFixed(2)), 0.5, 3);
      else zoomLevel = 1;
      updateZoomDOM();
      return;
    }

    const readBtn = event.target.closest('[data-lb-read]');
    if (readBtn) {
      const id = readBtn.dataset.lbRead;
      if (userState.read.has(id)) userState.read.delete(id);
      else userState.read.add(id);
      saveUserLibState(userState);
      paint();
      onStateChange?.(id, 'read');
      return;
    }

    const favBtn = event.target.closest('[data-lb-fav]');
    if (favBtn) {
      const id = favBtn.dataset.lbFav;
      if (userState.fav.has(id)) {
        userState.fav.delete(id);
        toast('تمت الإزالة من المفضلة', 'close');
      } else {
        userState.fav.add(id);
        toast('تم الحفظ في المفضلة ✨', 'spark');
      }
      saveUserLibState(userState);
      paint();
      onStateChange?.(id, 'fav');
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLibraryLightbox();
    } else if (event.key === 'ArrowLeft') {
      const isRtl = document.documentElement.dir !== 'ltr';
      const delta = isRtl ? 1 : -1;
      const nextIdx = currentIndex + delta;
      if (nextIdx >= 0 && nextIdx < items.length) {
        event.preventDefault();
        currentIndex = nextIdx;
        zoomLevel = 1;
        paint();
      }
    } else if (event.key === 'ArrowRight') {
      const isRtl = document.documentElement.dir !== 'ltr';
      const delta = isRtl ? -1 : 1;
      const nextIdx = currentIndex + delta;
      if (nextIdx >= 0 && nextIdx < items.length) {
        event.preventDefault();
        currentIndex = nextIdx;
        zoomLevel = 1;
        paint();
      }
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomLevel = clamp(Number((zoomLevel + 0.25).toFixed(2)), 0.5, 3);
      updateZoomDOM();
    } else if (event.key === '-') {
      event.preventDefault();
      zoomLevel = clamp(Number((zoomLevel - 0.25).toFixed(2)), 0.5, 3);
      updateZoomDOM();
    }
  };

  portal.addEventListener('click', onPortalClick);
  window.addEventListener('keydown', onKeyDown);

  activeLightboxCleanup = () => {
    portal.removeEventListener('click', onPortalClick);
    window.removeEventListener('keydown', onKeyDown);
    portal.remove();
    document.body.style.overflow = '';
  };

  paint();
}

export const libraryScreen = {
  render() {
    return html`
      <div class="page library-page" id="library-root">
        <div class="library-loading panel panel-pad">
          <div class="row">
            ${icon('spark')}
            <span>جارٍ تحميل المكتبة المصورة...</span>
          </div>
        </div>
      </div>
    `;
  },

  mount(root, context) {
    const container = root.querySelector('#library-root');
    if (!container) return null;

    const userState = loadUserLibState();
    let activePillar = context?.query?.get('pillar') || 'all';
    let activeTopic = context?.params?.topicId || context?.query?.get('topic') || 'all';
    let activeLevel = context?.query?.get('level') || 'all'; // 'all' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
    let statusFilter = context?.query?.get('filter') || 'all'; // 'all' | 'fav' | 'unread' | 'read'
    let searchQuery = '';
    let visibleCount = PAGE_SIZE;
    let currentFiltered = [];
    let isUnmounted = false;

    const cleanups = [];

    function getFilteredItems(manifest) {
      const q = searchQuery.trim().toLowerCase();
      return manifest.items.filter((item) => {
        if (activePillar !== 'all' && item.pillarId !== activePillar) return false;
        if (activeTopic !== 'all' && item.topicId !== activeTopic) return false;
        if (activeLevel !== 'all' && (!Array.isArray(item.levels) || !item.levels.includes(activeLevel))) return false;
        if (statusFilter === 'fav' && !userState.fav.has(item.id)) return false;
        if (statusFilter === 'read' && !userState.read.has(item.id)) return false;
        if (statusFilter === 'unread' && userState.read.has(item.id)) return false;
        if (q) {
          const topicObj = manifest.topics.find((t) => t.id === item.topicId);
          const hay = `${item.title} ${item.badge} ${(item.levels || []).join(' ')} ${item.origName || ''} ${topicObj?.title || ''} ${topicObj?.desc || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    }

    function updateStatsOnly(manifest) {
      const readCount = manifest.items.filter((i) => userState.read.has(i.id)).length;
      const favCount = manifest.items.filter((i) => userState.fav.has(i.id)).length;
      const readPct = manifest.totalItems ? Math.round((readCount / manifest.totalItems) * 100) : 0;

      const elRead = container.querySelector('#lib-stat-read');
      const elFav = container.querySelector('#lib-stat-fav');
      const elPct = container.querySelector('#lib-stat-pct');
      const elBar = container.querySelector('#lib-stat-bar');
      if (elRead) elRead.innerHTML = String(html`${readCount}<small>من ${manifest.totalItems}</small>`);
      if (elFav) elFav.innerHTML = String(html`${favCount}<small>محفوظة</small>`);
      if (elPct) elPct.textContent = `${readPct}%`;
      if (elBar) elBar.style.width = `${readPct}%`;

      const btnUnread = container.querySelector('[data-status-filter="unread"]');
      const btnRead = container.querySelector('[data-status-filter="read"]');
      const btnFav = container.querySelector('[data-status-filter="fav"]');
      if (btnUnread) btnUnread.textContent = `غير مقروء (${manifest.totalItems - readCount})`;
      if (btnRead) btnRead.innerHTML = String(html`${icon('check')} مقروء (${readCount})`);
      if (btnFav) btnFav.innerHTML = String(html`${icon('spark')} المفضلة (${favCount})`);
    }

    function updateCardDOMInPlace(id) {
      const card = container.querySelector(`.lib-card[data-id="${id}"]`);
      if (!card) return;
      const isRead = userState.read.has(id);
      const isFav = userState.fav.has(id);
      card.classList.toggle('is-read', isRead);
      card.classList.toggle('is-fav', isFav);

      const readBtn = card.querySelector('[data-toggle-read]');
      if (readBtn) {
        readBtn.classList.toggle('is-on', isRead);
        readBtn.setAttribute('aria-pressed', isRead ? 'true' : 'false');
        const span = readBtn.querySelector('span');
        if (span) span.textContent = isRead ? 'تمت قراءته' : 'علّم كمقروء';
      }

      const favBtn = card.querySelector('[data-toggle-fav]');
      if (favBtn) {
        favBtn.classList.toggle('is-on', isFav);
        favBtn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      }
    }

    function renderGridOnly(manifest) {
      const gridEl = container.querySelector('#lib-grid');
      const countEl = container.querySelector('#lib-results-count');
      const moreWrap = container.querySelector('#lib-more-wrap');
      if (!gridEl) return;

      const topicMap = new Map(manifest.topics.map((t) => [t.id, t]));
      currentFiltered = getFilteredItems(manifest);
      const slice = currentFiltered.slice(0, visibleCount);

      if (countEl) {
        countEl.textContent = `${currentFiltered.length} لوحة مصورة`;
      }

      if (currentFiltered.length === 0) {
        gridEl.innerHTML = String(html`
          <div class="lib-empty panel panel-pad">
            <div class="empty-icon">${icon('search')}</div>
            <h3>مفيش نتائج مطابقة للفلتر الحالي</h3>
            <p class="muted">جرّب تغيّر القسم أو المستوى أو تمسح كلمة البحث علشان تشوف كل البطاقات المصورة.</p>
            <button class="btn btn-primary" data-reset-filters style="margin-top:12px">عرض كل المكتبة</button>
          </div>
        `);
      } else {
        gridEl.innerHTML = slice.map((item, idx) => String(renderLibraryCard(item, idx, topicMap, userState))).join('');
      }

      if (moreWrap) {
        const remaining = currentFiltered.length - slice.length;
        if (remaining > 0) {
          moreWrap.hidden = false;
          moreWrap.innerHTML = String(html`
            <button class="btn btn-ghost" data-load-more>
              عرض المزيد (${remaining} بطاقة متبقية)
            </button>
          `);
        } else {
          moreWrap.hidden = true;
          moreWrap.innerHTML = '';
        }
      }
    }

    function renderFull(manifest) {
      const readCount = manifest.items.filter((i) => userState.read.has(i.id)).length;
      const favCount = manifest.items.filter((i) => userState.fav.has(i.id)).length;
      const readPct = manifest.totalItems ? Math.round((readCount / manifest.totalItems) * 100) : 0;

      const visibleTopics =
        activePillar === 'all'
          ? manifest.topics
          : manifest.topics.filter((t) => t.pillarId === activePillar);

      const activeTopicObj = manifest.topics.find((t) => t.id === activeTopic);
      const levelCounts = manifest.levelCounts || {};

      container.innerHTML = String(html`
        <section class="hero lib-hero">
          <div class="hero-main">
            <span class="eyebrow">مركز المحتوى المصور · Abdo &amp; Friends Hub</span>
            <h1 class="hero-title">
              المكتبة <span class="hl">المصورة الشاملة</span>
            </h1>
            <p class="hero-sub">
              ${manifest.totalItems} لوحة تعليمية مصورة مقسمة إلى ${manifest.totalTopics} قسماً ومرتبطة بالمستويات (A1 إلى C1): قواعد وتراكيب الجمل، الكلمات المتشابهة، الأساطير اليونانية والمصرية، قصص الأنبياء، الفلسفة، وعلم النفس بالألمانية والعربية.
            </p>
            <div class="lib-pillar-tabs" role="tablist" aria-label="الأقسام الرئيسية">
              <button
                class="lib-pillar-tab ${activePillar === 'all' ? 'is-active' : ''}"
                data-pillar="all"
                role="tab"
                aria-selected="${activePillar === 'all' ? 'true' : 'false'}"
              >
                <span>🌟 كل الأقسام</span>
                <b>${manifest.totalItems}</b>
              </button>
              ${manifest.pillars.map(
                (p) => html`
                  <button
                    class="lib-pillar-tab ${activePillar === p.id ? 'is-active' : ''}"
                    data-pillar="${p.id}"
                    role="tab"
                    aria-selected="${activePillar === p.id ? 'true' : 'false'}"
                  >
                    <span>${p.icon} ${p.title}</span>
                    <b>${p.count}</b>
                  </button>
                `,
              )}
            </div>
          </div>

          <aside class="hero-side">
            <div class="hero-side-title">تقدمك في المكتبة</div>
            <div class="hstat">
              <span>إجمالي اللوحات</span>
              <b>${manifest.totalItems}<small>لوحة</small></b>
            </div>
            <div class="hstat">
              <span>تمت قراءتها</span>
              <b id="lib-stat-read">${readCount}<small>من ${manifest.totalItems}</small></b>
            </div>
            <div class="hstat">
              <span>في المفضلة</span>
              <b id="lib-stat-fav">${favCount}<small>محفوظة</small></b>
            </div>
            <div class="goal-block">
              <div class="between">
                <span>نسبة القراءة</span>
                <span id="lib-stat-pct">${readPct}%</span>
              </div>
              <div class="meter"><span id="lib-stat-bar" style="width:${readPct}%"></span></div>
            </div>
          </aside>
        </section>

        <section class="lib-controls panel panel-pad">
          <div class="lib-toolbar">
            <div class="lib-search-box">
              ${icon('search')}
              <input
                type="search"
                id="lib-search-input"
                placeholder="ابحث عن موضوع، مستوى (A1, A2, B1, B2, C1)، أساطير، قواعد، أو اسم سلسلة..."
                value="${searchQuery}"
                aria-label="بحث في المكتبة المصورة"
              />
            </div>

            <div class="lib-status-filters" role="group" aria-label="فلترة حسب المستوى والحالة">
              ${['all', 'A1', 'A2', 'B1', 'B2', 'C1'].map(
                (lv) => html`
                  <button
                    class="chip ${activeLevel === lv ? 'chip-yellow' : ''}"
                    data-level-filter="${lv}"
                    aria-pressed="${activeLevel === lv ? 'true' : 'false'}"
                  >
                    ${lv === 'all' ? 'كل المستويات' : `${lv} (${levelCounts[lv] || 0})`}
                  </button>
                `,
              )}
              <span class="dot-sep"></span>
              <button class="chip ${statusFilter === 'all' ? 'chip-navy' : ''}" data-status-filter="all" aria-pressed="${statusFilter === 'all' ? 'true' : 'false'}">
                الكل
              </button>
              <button class="chip ${statusFilter === 'unread' ? 'chip-navy' : ''}" data-status-filter="unread" aria-pressed="${statusFilter === 'unread' ? 'true' : 'false'}">
                غير مقروء (${manifest.totalItems - readCount})
              </button>
              <button class="chip ${statusFilter === 'read' ? 'chip-navy' : ''}" data-status-filter="read" aria-pressed="${statusFilter === 'read' ? 'true' : 'false'}">
                ${icon('check')} مقروء (${readCount})
              </button>
              <button class="chip ${statusFilter === 'fav' ? 'chip-yellow' : ''}" data-status-filter="fav" aria-pressed="${statusFilter === 'fav' ? 'true' : 'false'}">
                ${icon('spark')} المفضلة (${favCount})
              </button>
            </div>
          </div>

          <div class="lib-topics-rail" role="navigation" aria-label="الموضوعات الفرعية">
            <button
              class="lib-topic-pill ${activeTopic === 'all' ? 'is-active' : ''}"
              data-topic="all"
              aria-pressed="${activeTopic === 'all' ? 'true' : 'false'}"
            >
              <span>كل الموضوعات</span>
              <small>${activePillar === 'all' ? manifest.totalItems : visibleTopics.reduce((acc, t) => acc + t.count, 0)}</small>
            </button>
            ${visibleTopics.map(
              (t) => html`
                <button
                  class="lib-topic-pill ${activeTopic === t.id ? 'is-active' : ''}"
                  data-topic="${t.id}"
                  aria-pressed="${activeTopic === t.id ? 'true' : 'false'}"
                  title="${t.desc}"
                >
                  <span>${t.title}</span>
                  <small>${t.count}</small>
                </button>
              `,
            )}
          </div>

          ${activeTopicObj
            ? html`
                <div class="lib-topic-banner">
                  <div>
                    <span class="chip chip-yellow">${activeTopicObj.badge}</span>
                    <strong>${activeTopicObj.title}</strong>
                    <span class="muted"> — ${activeTopicObj.desc}</span>
                  </div>
                  <span class="lib-results-badge" id="lib-results-count"></span>
                </div>
              `
            : html`
                <div class="lib-topic-banner">
                  <div>
                    <strong>عرض البطاقات التعليمية ${activeLevel !== 'all' ? `(مستوى ${activeLevel})` : ''}</strong>
                    <span class="muted"> — اضغط على أي بطاقة لتكبيرها وقراءتها بوضوح كامل مع التنقل بالأسهم</span>
                  </div>
                  <span class="lib-results-badge" id="lib-results-count"></span>
                </div>
              `}
        </section>

        <section class="lib-grid" id="lib-grid" aria-live="polite"></section>
        <div class="lib-more-wrap" id="lib-more-wrap" hidden></div>
      `);

      renderGridOnly(manifest);
    }

    ensureLibraryManifest()
      .then((manifest) => {
        if (isUnmounted) return;
        renderFull(manifest);

        const onInput = (event) => {
          if (event.target.id === 'lib-search-input') {
            searchQuery = event.target.value || '';
            visibleCount = PAGE_SIZE;
            renderGridOnly(manifest);
          }
        };

        const onClick = (event) => {
          const pillarBtn = event.target.closest('[data-pillar]');
          if (pillarBtn) {
            activePillar = pillarBtn.dataset.pillar;
            activeTopic = 'all';
            visibleCount = PAGE_SIZE;
            renderFull(manifest);
            return;
          }

          const topicBtn = event.target.closest('[data-topic]');
          if (topicBtn) {
            activeTopic = topicBtn.dataset.topic;
            visibleCount = PAGE_SIZE;
            renderFull(manifest);
            return;
          }

          const levelBtn = event.target.closest('[data-level-filter]');
          if (levelBtn) {
            activeLevel = levelBtn.dataset.levelFilter;
            visibleCount = PAGE_SIZE;
            renderFull(manifest);
            return;
          }

          const statusBtn = event.target.closest('[data-status-filter]');
          if (statusBtn) {
            statusFilter = statusBtn.dataset.statusFilter;
            visibleCount = PAGE_SIZE;
            renderFull(manifest);
            return;
          }

          const resetBtn = event.target.closest('[data-reset-filters]');
          if (resetBtn) {
            activePillar = 'all';
            activeTopic = 'all';
            activeLevel = 'all';
            statusFilter = 'all';
            searchQuery = '';
            visibleCount = PAGE_SIZE;
            renderFull(manifest);
            return;
          }

          const moreBtn = event.target.closest('[data-load-more]');
          if (moreBtn) {
            visibleCount += PAGE_SIZE;
            renderGridOnly(manifest);
            return;
          }

          const readBtn = event.target.closest('[data-toggle-read]');
          if (readBtn) {
            event.stopPropagation();
            const id = readBtn.dataset.toggleRead;
            if (userState.read.has(id)) userState.read.delete(id);
            else userState.read.add(id);
            saveUserLibState(userState);
            updateStatsOnly(manifest);
            if (statusFilter === 'all') updateCardDOMInPlace(id);
            else renderGridOnly(manifest);
            return;
          }

          const favBtn = event.target.closest('[data-toggle-fav]');
          if (favBtn) {
            event.stopPropagation();
            const id = favBtn.dataset.toggleFav;
            if (userState.fav.has(id)) {
              userState.fav.delete(id);
              toast('تمت الإزالة من المفضلة', 'close');
            } else {
              userState.fav.add(id);
              toast('تم الحفظ في المفضلة ✨', 'spark');
            }
            saveUserLibState(userState);
            updateStatsOnly(manifest);
            if (statusFilter === 'all') updateCardDOMInPlace(id);
            else renderGridOnly(manifest);
            return;
          }

          const openTarget = event.target.closest('[data-open-idx]');
          if (openTarget) {
            const idx = Number(openTarget.dataset.openIdx);
            openLibraryLightbox({
              items: currentFiltered,
              startIndex: idx,
              manifest,
              userState,
              onStateChange(changedId) {
                updateStatsOnly(manifest);
                if (statusFilter === 'all') updateCardDOMInPlace(changedId);
                else renderGridOnly(manifest);
              },
            });
          }
        };

        const onKeyDown = (event) => {
          const openEl = event.target?.closest?.('[data-open-idx]');
          if (openEl && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openEl.click();
          }
        };

        container.addEventListener('input', onInput);
        container.addEventListener('click', onClick);
        container.addEventListener('keydown', onKeyDown);

        cleanups.push(() => {
          container.removeEventListener('input', onInput);
          container.removeEventListener('click', onClick);
          container.removeEventListener('keydown', onKeyDown);
          closeLibraryLightbox();
        });
      })
      .catch((error) => {
        if (isUnmounted) return;
        container.innerHTML = String(html`
          <div class="empty panel panel-pad">
            <div class="empty-icon">${icon('spark')}</div>
            <h3>تعذر تحميل المكتبة المصورة</h3>
            <p class="muted">${String(error?.message || error)}</p>
          </div>
        `);
      });

    return () => {
      isUnmounted = true;
      cleanups.forEach((fn) => fn());
    };
  },
};
