// Chill Mode (تشيل مود) Screen
// Low-friction, relaxing single-card flow with German TTS autoplay, 2-way progress sync,
// and deliberate Spaced Repetition (التكرار المتباعد) enrollment & active recall.
import { store } from '../store.js';
import { html, icon, raw, clamp, chunksLabel } from '../utils.js';
import { speech } from '../utils.js';
import { audioEngine } from '../audioEngine.js';
import { toast } from '../ui.js';

// --- State Variables ---
let selectedLevels = new Set(['A1']);
let onlyUnfinished = true;
let onlyDueSr = false;
let inSession = false;
let sessionChunks = [];
let currentIndex = 0;
let isGermanBlurred = false;
let autoplay = true;
let audioNonce = 0;
let keyHandler = null;
let srTicker = null;

// Load persisted preferences
try {
  const savedAutoplay = localStorage.getItem('chill_autoplay');
  if (savedAutoplay !== null) autoplay = savedAutoplay !== 'false';
  const savedLevels = localStorage.getItem('chill_levels');
  if (savedLevels) {
    const parsed = JSON.parse(savedLevels);
    if (Array.isArray(parsed) && parsed.length > 0) selectedLevels = new Set(parsed);
  }
  const savedUnfinished = localStorage.getItem('chill_unfinished');
  if (savedUnfinished !== null) onlyUnfinished = savedUnfinished === 'true';
} catch {}

function savePreferences() {
  try {
    localStorage.setItem('chill_autoplay', String(autoplay));
    localStorage.setItem('chill_levels', JSON.stringify(Array.from(selectedLevels)));
    localStorage.setItem('chill_unfinished', String(onlyUnfinished));
  } catch {}
}

export function isChillDone(chunkId) {
  const rec = store.peek(chunkId);
  if (!rec) return false;
  const hasRead = Boolean(rec.understand?.checks?.read);
  const hasSlow = Boolean(rec.speak?.passes?.slow);
  const hasNatural = Boolean(rec.speak?.passes?.natural);
  const hasBlind = Boolean(rec.speak?.passes?.blind);
  const hasRecall = Boolean(rec.test?.recall?.passed);
  return hasRead && hasSlow && hasNatural && hasBlind && hasRecall;
}

function germanParts(chunk) {
  if (!chunk.template) return { prefix: '', rest: chunk.de };
  const prefix = chunk.template.replace(/\s*…$/, '').trim();
  if (prefix && chunk.de.startsWith(prefix)) {
    return { prefix, rest: chunk.de.slice(prefix.length) };
  }
  return { prefix: '', rest: chunk.de };
}

function showXPToast(amount, reason) {
  audioEngine.playStepComplete(amount >= 20 ? 4 : 2);
  const container = document.getElementById('toast-root') || document.body;
  const toastEl = document.createElement('div');
  toastEl.className = 'xp-floating-toast';
  toastEl.innerHTML = `
    <span class="xp-toast-spark">✨</span>
    <strong class="xp-toast-amount">+${amount} XP</strong>
    <span class="xp-toast-reason">${reason}</span>
  `;
  container.appendChild(toastEl);
  setTimeout(() => {
    toastEl.classList.add('is-leave');
    setTimeout(() => toastEl.remove(), 400);
  }, 2400);
}

function getDueSrCount() {
  let count = 0;
  for (const level of store.levels) {
    if (!selectedLevels.has(level.id)) continue;
    for (const chunk of level.chunks) {
      const sr = store.getSrCardInfo(chunk.id);
      if (sr.enrolled && sr.isDue) count++;
    }
  }
  return count;
}

function getFilteredChunks() {
  const list = [];
  for (const level of store.levels) {
    if (!selectedLevels.has(level.id)) continue;
    for (const chunk of level.chunks) {
      if (onlyDueSr) {
        const sr = store.getSrCardInfo(chunk.id);
        if (!sr.enrolled || !sr.isDue) continue;
      }
      if (onlyUnfinished && isChillDone(chunk.id) && !onlyDueSr) continue;
      list.push(chunk);
    }
  }
  return list;
}

async function playAudio(text, { rate = 1.0, chunkId = '' } = {}) {
  const nonce = ++audioNonce;
  speech.stop();
  try {
    await speech.speak(text, {
      rate,
      chunkId,
      onStart: () => {},
      onEnd: () => {},
    });
  } catch (err) {
    console.warn('Chill audio speak caught safely:', err);
  }
}

// --- Screen Interface ---
export const chillScreen = {
  render(context) {
    if (!inSession) {
      return renderSetupView();
    }
    return renderCardView();
  },

  mount(root, context) {
    const paint = () => {
      root.innerHTML = String(inSession ? renderCardView() : renderSetupView());
      bindEvents();
    };

    const triggerCardAutoplay = () => {
      if (!inSession) return;
      const chunk = sessionChunks[currentIndex];
      if (chunk) {
        const srInfo = store.getSrCardInfo(chunk.id);
        // TRIZ Active Recall: if chunk is due for review, auto-blur to force mental retrieval
        if (srInfo.enrolled && srInfo.isDue) {
          isGermanBlurred = true;
          paint();
        }
        if (autoplay) {
          setTimeout(() => {
            playAudio(chunk.de, { rate: 1.0, chunkId: chunk.id });
          }, 120);
        }
      }
    };

    const bindEvents = () => {
      if (!inSession) {
        // --- Setup View Handlers ---
        root.querySelectorAll('[data-chill-level]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const levelId = btn.dataset.chillLevel;
            if (selectedLevels.has(levelId)) {
              if (selectedLevels.size > 1) selectedLevels.delete(levelId);
              else toast('لازم تختار مستوى واحد على الأقل', 'clock');
            } else {
              selectedLevels.add(levelId);
            }
            savePreferences();
            audioEngine.playTap();
            paint();
          });
        });

        root.querySelector('#chill-filter-unfinished')?.addEventListener('click', () => {
          onlyUnfinished = !onlyUnfinished;
          savePreferences();
          audioEngine.playToggle(onlyUnfinished);
          paint();
        });

        root.querySelector('#chill-filter-due')?.addEventListener('click', () => {
          onlyDueSr = !onlyDueSr;
          audioEngine.playToggle(onlyDueSr);
          paint();
        });

        root.querySelector('#chill-select-all')?.addEventListener('click', () => {
          store.levels.forEach((l) => selectedLevels.add(l.id));
          savePreferences();
          audioEngine.playTap();
          paint();
        });

        root.querySelector('#chill-start-btn')?.addEventListener('click', () => {
          sessionChunks = getFilteredChunks();
          if (sessionChunks.length === 0) {
            toast('مفيش جمل مطابقة للفلاتر الحالية! جرّب تبديل المستويات أو الفلتر.', 'spark');
            return;
          }
          currentIndex = 0;
          inSession = true;
          isGermanBlurred = false;
          audioEngine.playWorkoutComplete();
          paint();
          triggerCardAutoplay();
        });
      } else {
        // --- Card View Handlers ---
        const chunk = sessionChunks[currentIndex];
        if (!chunk) return;
        const rec = store.record(chunk.id);

        // Exit / Change Level
        root.querySelector('#chill-back-setup')?.addEventListener('click', () => {
          speech.stop();
          inSession = false;
          audioEngine.playTap();
          paint();
        });

        // Autoplay toggle
        root.querySelector('#chill-autoplay-btn')?.addEventListener('click', () => {
          autoplay = !autoplay;
          savePreferences();
          audioEngine.playToggle(autoplay);
          toast(autoplay ? 'التشغيل التلقائي مفعل 🔊' : 'التشغيل التلقائي متوقف 🔇', autoplay ? 'speaker' : 'speaker-off');
          paint();
        });

        // Eye toggle (blur German text)
        root.querySelector('#chill-blur-toggle')?.addEventListener('click', () => {
          isGermanBlurred = !isGermanBlurred;
          audioEngine.playTap();
          paint();
        });

        // Click on blurred German text reveals it
        root.querySelector('#chill-de-box')?.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          if (isGermanBlurred) {
            isGermanBlurred = false;
            audioEngine.playTap();
            paint();
          }
        });

        // Audio controls
        root.querySelector('#chill-play-normal')?.addEventListener('click', () => {
          playAudio(chunk.de, { rate: 1.0, chunkId: chunk.id });
        });
        root.querySelector('#chill-play-slow')?.addEventListener('click', () => {
          playAudio(chunk.de, { rate: 0.75, chunkId: chunk.id });
        });

        // --- Spaced Repetition SRS Strip Handlers ---
        root.querySelector('#chill-sr-enroll')?.addEventListener('click', () => {
          store.enrollSrSchedule(chunk.id);
          showXPToast(5, 'أضيفت لجدول التكرار المتباعد 📅 — أول مراجعة بعد 4 ساعات');
          paint();
        });

        root.querySelector('#chill-sr-cancel')?.addEventListener('click', () => {
          store.cancelSrSchedule(chunk.id);
          audioEngine.playStepper('down');
          toast('تم إلغاء الجدولة وإزالة الجملة من المراجعات المتباعدة', 'trash');
          paint();
        });

        root.querySelector('#chill-sr-complete')?.addEventListener('click', () => {
          store.completeSrStage(chunk.id, 'good');
          showXPToast(15, 'أتممت مراجعة التكرار المتباعد بنجاح! (+15 XP)');
          audioEngine.playSetComplete();
          paint();
        });

        // 1. Step 1: Read check
        root.querySelector('#chill-check-read')?.addEventListener('click', () => {
          const wasChecked = Boolean(rec.understand?.checks?.read);
          store.toggleUnderstandCheck(chunk.id, 'read');
          if (!wasChecked) {
            showXPToast(10, 'قرأت الجملة بصوت واطي');
          } else {
            audioEngine.playTap();
          }
          paint();
        });

        // 2. Step 2: Speak Slow
        root.querySelector('#chill-pass-slow')?.addEventListener('click', () => {
          const wasDone = Boolean(rec.speak?.passes?.slow);
          store.setSpeakPass(chunk.id, 'slow', !wasDone);
          if (!wasDone) {
            showXPToast(5, 'نطقت الجملة ببطء');
          } else {
            audioEngine.playTap();
          }
          paint();
        });

        // 3. Step 2: Speak Natural
        root.querySelector('#chill-pass-natural')?.addEventListener('click', () => {
          const wasDone = Boolean(rec.speak?.passes?.natural);
          store.setSpeakPass(chunk.id, 'natural', !wasDone);
          if (!wasDone) {
            showXPToast(5, 'نطقت الجملة بسرعة طبيعية');
          } else {
            audioEngine.playTap();
          }
          paint();
        });

        // 4. Step 2: Speak Blind
        root.querySelector('#chill-pass-blind')?.addEventListener('click', () => {
          const wasDone = Boolean(rec.speak?.passes?.blind);
          store.setSpeakPass(chunk.id, 'blind', !wasDone);
          if (!wasDone) {
            showXPToast(10, 'نطقت الجملة من غير ما تبص');
          } else {
            audioEngine.playTap();
          }
          paint();
        });

        // Trigger Blur helper for "من غير ما تبص"
        root.querySelector('#chill-trigger-blind-blur')?.addEventListener('click', (e) => {
          e.stopPropagation();
          isGermanBlurred = true;
          audioEngine.playTap();
          paint();
          toast('تم طمس النص الألماني — قوله من دماغك واضغط على العين لما تخلص', 'eye-off');
        });

        // 5. Step 4: Quick Recall counter (+1)
        root.querySelector('#chill-recall-inc')?.addEventListener('click', () => {
          const currentScore = rec.test?.recall?.score || 0;
          const wasPassed = Boolean(rec.test?.recall?.passed);
          const nextScore = Math.min(5, currentScore + 1);
          const passed = store.setRecall(chunk.id, nextScore, 5);
          audioEngine.playStepper('up');
          if (passed && !wasPassed) {
            showXPToast(25, `اجتزت الاستدعاء السريع (${nextScore}/5)!`);
          }
          paint();
        });

        // Reset Recall counter
        root.querySelector('#chill-recall-reset')?.addEventListener('click', () => {
          store.setRecall(chunk.id, 0, 5);
          audioEngine.playStepper('down');
          paint();
        });

        // Reveal button inside Recall card
        root.querySelector('#chill-recall-reveal')?.addEventListener('click', () => {
          isGermanBlurred = false;
          audioEngine.playTap();
          paint();
        });

        // Next / Prev buttons
        root.querySelector('#chill-btn-prev')?.addEventListener('click', () => {
          if (currentIndex > 0) {
            speech.stop();
            currentIndex -= 1;
            isGermanBlurred = false;
            audioEngine.playTap();
            paint();
            triggerCardAutoplay();
          }
        });

        root.querySelectorAll('[data-chill="next"], #chill-btn-next').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (currentIndex < sessionChunks.length - 1) {
              speech.stop();
              currentIndex += 1;
              isGermanBlurred = false;
              audioEngine.playTap();
              paint();
              triggerCardAutoplay();
            } else {
              toast('🎉 ما شاء الله! أتممت كل جمل جلسة التشيل مود!', 'trophy');
              audioEngine.playWorkoutComplete();
              inSession = false;
              paint();
            }
          });
        });
      }
    };

    // Keyboard Shortcuts (RTL & LTR aware)
    keyHandler = (e) => {
      if (!inSession) return;
      if (e.target.matches('input, textarea')) return;
      const isRtl = document.documentElement.dir !== 'ltr';
      if (e.key === 'ArrowLeft') {
        const btn = root.querySelector(isRtl ? '#chill-btn-next' : '#chill-btn-prev');
        if (btn) btn.click();
      } else if (e.key === 'ArrowRight') {
        const btn = root.querySelector(isRtl ? '#chill-btn-prev' : '#chill-btn-next');
        if (btn) btn.click();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const normalBtn = root.querySelector('#chill-play-normal');
        if (normalBtn) normalBtn.click();
      }
    };
    window.addEventListener('keydown', keyHandler);

    // Dynamic 15-second timer ticker for due transition
    srTicker = setInterval(() => {
      if (!inSession) return;
      const chunk = sessionChunks[currentIndex];
      if (!chunk) return;
      const srInfo = store.getSrCardInfo(chunk.id);
      if (srInfo.enrolled) paint();
    }, 15000);

    bindEvents();
    if (inSession) {
      triggerCardAutoplay();
    }

    return () => {
      speech.stop();
      if (keyHandler) window.removeEventListener('keydown', keyHandler);
      if (srTicker) clearInterval(srTicker);
    };
  },
};

// --- Render Helpers ---

function renderSrStrip(chunk) {
  const srInfo = store.getSrCardInfo(chunk.id);

  if (!srInfo.enrolled) {
    return html`
      <div class="chill-srs-strip">
        <button class="btn btn-ghost btn-sm chill-srs-enroll-btn" id="chill-sr-enroll" title="إدراج الجملة في جدول التكرار المتباعد لتثبيتها في الذاكرة">
          <svg class="i" style="color:var(--yellow)"><use href="#i-calendar" /></svg>
          <span>+ إدراج في جدول التكرار المتباعد (أول مراجعة بعد 4 ساعات)</span>
        </button>
      </div>
    `;
  }

  if (srInfo.isCompleted) {
    return html`
      <div class="chill-srs-strip">
        <div class="chill-srs-status-box is-all-done">
          <div class="chill-srs-info">
            <span class="chip chip-green">${icon('check')} أتمت جميع مراحل التكرار المتباعد الأربع ✅</span>
          </div>
          <button class="btn btn-quiet btn-xs chill-srs-cancel-btn" id="chill-sr-cancel" title="إلغاء من جدول التكرار المتباعد">إلغاء</button>
        </div>
      </div>
    `;
  }

  if (srInfo.isDue) {
    return html`
      <div class="chill-srs-strip is-due-strip">
        <div class="chill-srs-due-box">
          <div class="chill-srs-due-info">
            <span class="chip chip-amber pulse">🔔 مستحقة للمراجعة الآن (${srInfo.stageInfo.shortLabel})</span>
            <span class="chill-srs-due-hint">حاول استدعاء الجملة من العربي قبل كشف الألماني!</span>
          </div>
          <button class="btn btn-primary btn-sm chill-srs-complete-btn" id="chill-sr-complete">
            ${icon('check')} <span>تمت المراجعة وافتكرتها (+15 XP)</span>
          </button>
        </div>
      </div>
    `;
  }

  return html`
    <div class="chill-srs-strip">
      <div class="chill-srs-status-box">
        <div class="chill-srs-info">
          <svg class="i" style="color:var(--ink)"><use href="#i-calendar" /></svg>
          <span class="chip chip-blue">${srInfo.stageInfo.shortLabel}</span>
          <span class="chill-srs-timer">${icon('clock')} المراجعة القادمة: <b>${srInfo.countdown}</b></span>
        </div>
        <button class="btn btn-quiet btn-xs chill-srs-cancel-btn" id="chill-sr-cancel" title="إلغاء من جدول التكرار المتباعد">إلغاء الجدولة</button>
      </div>
    </div>
  `;
}

function renderSetupView() {
  const filteredCount = getFilteredChunks().length;
  const totalInSelected = store.levels
    .filter((l) => selectedLevels.has(l.id))
    .reduce((sum, l) => sum + l.chunks.length, 0);
  const dueSrCount = getDueSrCount();

  return html`
    <div class="page chill-page">
      <div class="chill-hero-banner">
        <div class="chill-hero-badge">
          <svg class="i" style="font-size:22px"><use href="#i-chill" /></svg>
          <span>تشيل مود · جلسة تدريب خفيفة ومريحة</span>
        </div>
        <h1 class="chill-hero-title">تعلّم بروقان ومن غير ضغط</h1>
        <p class="chill-hero-sub">
          اختر المستويات اللي حابب تتدرب عليها. كروت فردية، تشغيل نطق تلقائي، وتمارين سريعة خفيفة مع إمكانية إدراج أي جملة في جدول التكرار المتباعد بنقرة واحدة.
        </p>
      </div>

      <div class="chill-setup-card">
        <div class="chill-setup-head">
          <div>
            <h3>المستويات المطلوبة للتدريب</h3>
            <span class="muted" style="font-size:13px">تقدر تختار مستوى واحد أو أكتر في نفس الجلسة:</span>
          </div>
          <button class="btn btn-ghost btn-sm" id="chill-select-all">اختيار الكل</button>
        </div>

        <div class="chill-level-grid">
          ${store.levels.map((level) => {
            const isSelected = selectedLevels.has(level.id);
            const doneCount = level.chunks.filter((c) => isChillDone(c.id)).length;
            const pct = Math.round((doneCount / level.count) * 100);
            return html`
              <div class="chill-level-box ${isSelected ? 'is-selected' : ''}" data-chill-level="${level.id}">
                <div class="chill-level-box-top">
                  <span class="chill-level-tag">${level.id}</span>
                  <span class="chill-level-check">${icon('check')}</span>
                </div>
                <strong class="chill-level-title">${level.title}</strong>
                <div class="chill-level-stats">
                  <span>${doneCount} / ${level.count} مكتملة</span>
                  <b>${pct}%</b>
                </div>
                <div class="chill-level-bar">
                  <div class="chill-level-bar-fill" style="width:${pct}%"></div>
                </div>
              </div>
            `;
          })}
        </div>

        <div class="chill-filter-row">
          <div class="chill-filter-info">
            <strong>التركيز على غير المكتمل فقط</strong>
            <p>تجاوز الجمل اللي أتممت فيها كل تمارين التشيل مود مسبقاً.</p>
          </div>
          <button class="switch ${onlyUnfinished ? 'is-on' : ''}" id="chill-filter-unfinished" role="switch" aria-checked="${onlyUnfinished}">
            <span class="switch-handle"></span>
          </button>
        </div>

        ${dueSrCount > 0
          ? html`
              <div class="chill-filter-row" style="margin-top:10px">
                <div class="chill-filter-info">
                  <strong>الجمل المستحقة للتكرار المتباعد الآن (${dueSrCount})</strong>
                  <p>حصر الجلسة في الجمل التي حان موعد مراجعتها المتباعدة حالياً.</p>
                </div>
                <button class="switch ${onlyDueSr ? 'is-on' : ''}" id="chill-filter-due" role="switch" aria-checked="${onlyDueSr}">
                  <span class="switch-handle"></span>
                </button>
              </div>
            `
          : ''}

        <div class="chill-setup-foot">
          <div class="chill-count-preview">
            <span class="chill-count-number">${filteredCount}</span>
            <span>جملة جاهزة في جلسة التشيل مود الحالية (من أصل ${totalInSelected})</span>
          </div>
          <button class="btn btn-primary chill-launch-btn" id="chill-start-btn" ${filteredCount === 0 ? 'disabled' : ''}>
            ${icon('play')} ابدأ جلسة التشيل مود
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderCardView() {
  const chunk = sessionChunks[currentIndex];
  if (!chunk) {
    return html`
      <div class="page">
        <div class="empty">
          <div class="empty-icon">${icon('spark')}</div>
          <h3>مفيش جمل متاحة في الجلسة</h3>
          <p>ارجع لاختيار المستويات والفلتر لتحديد الجمل.</p>
          <button class="btn btn-primary" id="chill-back-setup">رجوع للإعدادات</button>
        </div>
      </div>
    `;
  }

  const rec = store.record(chunk.id);
  const parts = germanParts(chunk);
  const chillDone = isChillDone(chunk.id);

  // Sub-exercise completion flags
  const readDone = Boolean(rec.understand?.checks?.read);
  const slowDone = Boolean(rec.speak?.passes?.slow);
  const naturalDone = Boolean(rec.speak?.passes?.natural);
  const blindDone = Boolean(rec.speak?.passes?.blind);
  const recallScore = rec.test?.recall?.score || 0;
  const recallPassed = Boolean(rec.test?.recall?.passed);

  const doneCount = [readDone, slowDone, naturalDone, blindDone, recallPassed].filter(Boolean).length;
  const totalExercises = 5;

  return html`
    <div class="page chill-session-page">
      <!-- Session Bar -->
      <div class="chill-bar">
        <div class="chill-bar-meta">
          <button class="btn btn-ghost btn-sm" id="chill-back-setup" title="العودة لاختيار المستويات">
            ${icon('back')} <span>تغيير المستويات</span>
          </button>
          <span class="chill-bar-sep">·</span>
          <span class="chip level-chip">${chunk.level}</span>
          <span class="chip">${chunk.id}</span>
          ${chunk.groupTitle ? html`<span class="chip chip-yellow">${chunk.groupTitle}</span>` : ''}
        </div>

        <div class="chill-bar-center">
          <span class="chill-progress-txt">كارت <b>${currentIndex + 1}</b> من <b>${sessionChunks.length}</b></span>
          <div class="chill-session-bar">
            <div class="chill-session-bar-fill" style="width:${Math.round(((currentIndex + 1) / sessionChunks.length) * 100)}%"></div>
          </div>
        </div>

        <div class="chill-bar-actions">
          <button class="btn btn-ghost btn-sm chill-btn-autoplay ${autoplay ? 'is-active' : ''}" id="chill-autoplay-btn" title="التشغيل الصوتي التلقائي عند فتح كل كارت">
            <svg class="i"><use href="#${autoplay ? 'i-speaker' : 'i-speaker-off'}" /></svg>
            <span>نطق تلقائي: ${autoplay ? 'مفعل' : 'مكتوم'}</span>
          </button>
        </div>
      </div>

      <!-- Main Single Card -->
      <div class="chill-card-shell">
        <!-- Card German & Arabic Hero -->
        <div class="chill-card-hero">
          <div class="chill-hero-topline">
            <span class="chill-card-counter-badge ${chillDone ? 'is-done' : ''}">
              ${chillDone ? 'مكتمل في تشيل مود ✓' : `${doneCount} من ${totalExercises} تمارين`}
            </span>
            <div class="chill-hero-audio-actions">
              <button class="btn btn-ghost btn-sm" id="chill-blur-toggle" title="${isGermanBlurred ? 'إظهار النص الألماني' : 'طمس النص الألماني للمحاولة دون النظر'}">
                <svg class="i"><use href="#${isGermanBlurred ? 'i-eye' : 'i-eye-off'}" /></svg>
                <span>${isGermanBlurred ? 'إظهار الألماني' : 'طمس للتسميع'}</span>
              </button>
              <button class="btn btn-ghost btn-sm" id="chill-play-slow" title="استمع ببطء">${icon('speaker')} ببطء</button>
              <button class="btn btn-primary btn-sm" id="chill-play-normal" title="استمع بالسرعة الطبيعية">${icon('speaker')} اسمع</button>
            </div>
          </div>

          <!-- German Text Box with Optional Blur -->
          <div class="chill-de-box ${isGermanBlurred ? 'is-blurred' : ''}" id="chill-de-box" title="${isGermanBlurred ? 'اضغط لكشف النص' : ''}">
            <div class="chill-de-content">
              ${parts.prefix ? html`<span class="tpl-mark">${parts.prefix}</span>` : ''}${parts.rest}
            </div>
            ${isGermanBlurred ? html`<div class="chill-blur-overlay">${icon('eye')} اضغط للكشف</div>` : ''}
          </div>

          <!-- Arabic Meaning -->
          <div class="chill-ar-box">
            <span class="chill-ar-label">المعنى بالعربي:</span>
            <strong class="chill-ar-text">${chunk.ar}</strong>
          </div>

          <!-- Spaced Repetition SRS Strip -->
          ${renderSrStrip(chunk)}
        </div>

        <!-- The 5 Chill Exercises -->
        <div class="chill-exercises-wrap">
          <div class="chill-section-title">
            <span>تمارين الجملة الخفيفة</span>
            <span class="muted" style="font-size:12px">أي تمرين تخلصه بيتحفظ فوراً في سجلك ونقاطك</span>
          </div>

          <div class="chill-exercises-grid">
            <!-- 1. اقرأ الجملة بصوت واطي -->
            <button class="chill-ex-card ${readDone ? 'is-done' : ''}" id="chill-check-read">
              <span class="chill-ex-status">${readDone ? icon('check') : ''}</span>
              <div class="chill-ex-info">
                <strong>1. اقرأ الجملة بصوت واطي</strong>
                <span>افهم المعنى والتركيب بروقان (+10 XP)</span>
              </div>
            </button>

            <!-- 2. انطق ببطء -->
            <button class="chill-ex-card ${slowDone ? 'is-done' : ''}" id="chill-pass-slow">
              <span class="chill-ex-status">${slowDone ? icon('check') : ''}</span>
              <div class="chill-ex-info">
                <strong>2. انطق ببطء</strong>
                <span>وضوح المقاطع ونطق الحروف (+5 XP)</span>
              </div>
            </button>

            <!-- 3. انطق بسرعة طبيعية -->
            <button class="chill-ex-card ${naturalDone ? 'is-done' : ''}" id="chill-pass-natural">
              <span class="chill-ex-status">${naturalDone ? icon('check') : ''}</span>
              <div class="chill-ex-info">
                <strong>3. انطق بسرعة طبيعية</strong>
                <span>سلاسة وسرعة الكلام اليومي (+5 XP)</span>
              </div>
            </button>

            <!-- 4. انطق من غير ما تبص -->
            <div class="chill-ex-card chill-ex-card-blind ${blindDone ? 'is-done' : ''}">
              <button class="chill-ex-btn-main" id="chill-pass-blind">
                <span class="chill-ex-status">${blindDone ? icon('check') : ''}</span>
                <div class="chill-ex-info">
                  <strong>4. انطق من غير ما تبص</strong>
                  <span>قول الجملة من ذاكرتك (+10 XP)</span>
                </div>
              </button>
              <button class="btn btn-ghost btn-sm chill-blind-blur-btn" id="chill-trigger-blind-blur" title="طمس النص الألماني للتسميع">
                <svg class="i"><use href="#i-eye-off" /></svg>
              </button>
            </div>

            <!-- 5. استدعاء سريع (0/5) -->
            <div class="chill-ex-card chill-ex-card-recall ${recallPassed ? 'is-done' : ''}">
              <div class="chill-recall-header">
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="chill-ex-status">${recallPassed ? icon('check') : ''}</span>
                  <div>
                    <strong>5. استدعاء سريع (من العربي للألماني)</strong>
                    <span style="display:block;font-size:12px;color:var(--muted)">اقرأ العربي وقول الألماني في ثواني (محتاج 4 من 5 للمرور · +25 XP)</span>
                  </div>
                </div>
                <div class="chill-recall-counter-box">
                  <span class="chill-recall-val">${recallScore} / 5</span>
                </div>
              </div>

              <!-- 5 Dots -->
              <div class="chill-dots-row">
                ${[1, 2, 3, 4, 5].map(
                  (dot) => html`<span class="chill-dot ${dot <= recallScore ? 'is-filled' : ''}"></span>`,
                )}
              </div>

              <div class="chill-recall-actions">
                <button class="btn btn-primary btn-sm" id="chill-recall-inc" ${recallScore >= 5 ? 'disabled' : ''}>
                  ${icon('check')} <span>+1 افتكرتها صح</span>
                </button>
                <button class="btn btn-ghost btn-sm" id="chill-recall-reveal">
                  ${icon('eye')} <span>اكشف الألماني</span>
                </button>
                ${recallScore > 0
                  ? html`<button class="btn btn-quiet btn-sm" id="chill-recall-reset" title="تصفير العداد">إعادة المحاولة</button>`
                  : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- Completion Celebration Banner -->
        ${chillDone
          ? html`
              <div class="chill-card-done-banner">
                <span class="chill-done-sparkle">✨</span>
                <div class="chill-done-text">
                  <strong>عاش! أتممت كل تمارين التشيل للجملة دي بنجاح 🎉</strong>
                  <span>اتسجلت في تقدمك العام. تقدر تستمر للجملة التالية أو تكرر براحتك.</span>
                </div>
                <button class="btn btn-primary btn-sm" data-chill="next">الجملة التالية ←</button>
              </div>
            `
          : ''}

        <!-- Card Navigation Footer -->
        <div class="chill-footer-nav">
          <button class="btn btn-ghost" id="chill-btn-prev" ${currentIndex === 0 ? 'disabled' : ''}>
            ${icon('forward')} <span>السابق</span>
          </button>

          <span class="chill-nav-page-label">${currentIndex + 1} / ${sessionChunks.length}</span>

          <button class="btn ${chillDone ? 'btn-primary' : 'btn-primary'}" id="chill-btn-next">
            <span>${currentIndex === sessionChunks.length - 1 ? 'إنهاء الجلسة' : 'التالي'}</span>
            ${icon('back')}
          </button>
        </div>
      </div>
    </div>
  `;
}
