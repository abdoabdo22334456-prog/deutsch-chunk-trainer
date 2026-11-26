import { store } from '../store.js';
import { audioEngine } from '../audioEngine.js';
import { reviewScheduler } from '../scheduler.js';
import { html, icon, speech, chunksLabel } from '../utils.js';
import { toast, confirmDialog } from '../ui.js';

function switchRow(key, title, desc, on) {
  return html`
    <div class="set-row">
      <div>
        <div class="set-label">${title}</div>
        <div class="set-desc">${desc}</div>
      </div>
      <button class="switch ${on ? 'is-on' : ''}" role="switch" aria-checked="${on ? 'true' : 'false'}" data-toggle="${key}" aria-label="${title}"></button>
    </div>
  `;
}

function rangeRow(key, title, desc, value, min, max, step, format) {
  return html`
    <div class="set-row">
      <div>
        <div class="set-label">${title}</div>
        <div class="set-desc">${desc}</div>
      </div>
      <div class="slider-wrap">
        <b class="slider-value" id="val-${key}" dir="ltr">${format(value)}</b>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-range="${key}" />
        <span class="slider-range" dir="ltr">${format(min)}–${format(max)}</span>
      </div>
    </div>
  `;
}

export const settingsScreen = {
  render() {
    const settings = store.state.settings;
    const voices = speech.germanVoices();
    const path = store.paths?.path || '';
    const stats = { imported: store.state.meta.importedObsidian, importedCount: store.state.meta.importedCount || 0 };

    return html`
      <div class="page settings-page">
        <div class="section-head">
          <div>
            <span class="eyebrow">الإعدادات</span>
            <h1 style="font-size:clamp(26px,3.2vw,34px);margin-top:2px">خلي البرنامج على مزاجك</h1>
            <p class="sub muted">كل حاجة هنا بتتحفظ فورًا على جهازك.</p>
          </div>
          <a class="btn btn-ghost btn-sm" href="#/method">${icon('calendar')} الطريقة</a>
        </div>

        <div class="settings-wrap">
          <div class="stack" style="--gap:18px">
            <section class="set-group">
              <div class="set-group-head"><h2>التفضيلات</h2><p>اليومي والواجهة</p></div>
              <div class="set-row">
                <div>
                  <div class="set-label">لغة الواجهة · Interface Language · Sprache</div>
                  <div class="set-desc">تبديل فوري ودقيق للواجهة بالكامل بين العربية والإنجليزية والألمانية</div>
                </div>
                <div class="lang-switcher is-large" role="group" aria-label="Interface Language">
                  <button type="button" class="lang-btn" data-lang-switch="ar">🇪🇬 العربية</button>
                  <button type="button" class="lang-btn" data-lang-switch="en">🇬🇧 English</button>
                  <button type="button" class="lang-btn" data-lang-switch="de">🇩🇪 Deutsch</button>
                </div>
              </div>
              ${switchRow('theme', 'الوضع الليلي', 'ألوان هادية للعين في المذاكرة بالليل', settings.theme === 'dark')}
              ${rangeRow(
                'dailyGoal',
                'هدفك اليومي',
                'عدد الإنتاجات اللي عايز تخلصها في اليوم. الافتراضي 25.',
                settings.dailyGoal,
                5,
                80,
                5,
                (value) => `${value}`,
              )}
            </section>

            <section class="set-group">
              <div class="set-group-head"><h2>تجربة الصوتيات الاستوديو</h2><p>مؤثرات تفاعلية وماريمبا موسيقية (Tone.js & snd-lib)</p></div>
              <div class="set-row">
                <div>
                  <div class="set-label">المؤثرات الصوتية العامة</div>
                  <div class="set-desc">أصوات التفاعل، الإنجازات، التمرير، والمؤقتات.</div>
                </div>
                <button class="switch ${audioEngine.soundEnabled ? 'is-on' : ''}" role="switch" aria-checked="${audioEngine.soundEnabled ? 'true' : 'false'}" data-toggle-sound aria-label="المؤثرات الصوتية العامة"></button>
              </div>
              <div class="set-row">
                <div>
                  <div class="set-label">مستوى صوت المؤثرات</div>
                  <div class="set-desc">محمي بواسطة Limiter (-2dB) وReverb هادئ لمنع أي إزعاج لسماعات الرأس.</div>
                </div>
                <div class="slider-wrap">
                  <b class="slider-value" id="val-sound-vol" dir="ltr">${Math.round(audioEngine.masterVolume * 100)}%</b>
                  <input type="range" min="0" max="1" step="0.05" value="${audioEngine.masterVolume}" data-range-sound />
                  <span class="slider-range" dir="ltr">0%–100%</span>
                </div>
              </div>
              <div class="set-row" style="display:block">
                <div class="set-label" style="margin-bottom:8px">معاينة واختبار أصوات الإنجازات والمؤقتات</div>
                <div class="sound-test-grid">
                  <button class="btn btn-ghost btn-sm" data-act="test-step">${icon('check')} رنة الخطوة (Set/Step)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-rest">${icon('clock')} انتهاء المؤقت (Rest Chime)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-session">${icon('trophy')} اكتمال الجلسة (Session Complete)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-pr" style="border-color:var(--yellow);color:var(--yellow)">${icon('spark')} إنجاز قياسي جديد (New PR Fanfare)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-step-up">⬆️ تدرج صاعد (580Hz)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-step-down">⬇️ تدرج هابط (420Hz)</button>
                  <button class="btn btn-ghost btn-sm" data-act="test-soft-error">🪵 نقرة تحذير هادئة (Soft Thud)</button>
                </div>
              </div>
            </section>

            <section class="set-group">
              <div class="set-group-head">
                <h2>تنبيهات ومواعيد المراجعة</h2>
                <p>إشعارات نظام ويندوز والمنبه الصوتي اللطيف في مواعيد التكرار المتباعد</p>
              </div>
              ${switchRow(
                'notificationsEnabled',
                'إشعارات ويندوز للمراجعة',
                'إشعار مكتبي هادئ يظهر تلقائيًا عند وصول موعد أي مراجعة مجدولة للمراحل الأربع',
                settings.notificationsEnabled !== false,
              )}
              ${switchRow(
                'reviewChimeEnabled',
                'المنبه الصوتي الخفيف (تيت تيت)',
                'نغمتين هادئتين خفيفتين جداً (880Hz / 987Hz) مع كل إشعار بدون أي إزعاج',
                settings.reviewChimeEnabled !== false,
              )}
              <div class="set-row">
                <div>
                  <div class="set-label">تجربة الإشعار والمنبه الصوتي</div>
                  <div class="set-desc">اختبر صوت المنبه اللطيف وشكل إشعار ويندوز فوراً للتأكد من عملهم</div>
                </div>
                <button class="btn btn-ghost btn-sm" data-act="test-notification-chime">
                  ${icon('bell')} تجربة الإشعار والصوت
                </button>
              </div>
            </section>

            <section class="set-group">
              <div class="set-group-head"><h2>الصوت الألماني</h2><p>نطق الجمل بصوت ويندوز المدمج (SpeechSynthesis)</p></div>
              ${switchRow('tts', 'تشغيل الصوت', 'تشغيل نطق الجمل الألمانية تلقائياً وعبر أزرار الاستماع بمحرك ويندوز.', settings.tts !== false)}
              ${rangeRow(
                'ttsRate',
                'سرعة النطق الافتراضية',
                '0.75 للبطيء و1.00 للطبيعي.',
                settings.ttsRate || 1.0,
                0.5,
                1.5,
                0.05,
                (value) => `${Number(value).toFixed(2)}×`,
              )}
              <div class="set-row">
                <div>
                  <div class="set-label">محرك النطق</div>
                  <div class="set-desc">${voices.length ? 'اختار الصوت الألماني المناسب من أصوات ويندوز المتاحة.' : 'مفيش صوت ألماني متسطّب على ويندوز — ثبّت لغة Deutsch من إعدادات ويندوز.'}</div>
                </div>
                <div class="voice-list" id="voice-list">
                  <button class="voice-chip ${!settings.voice ? 'is-on' : ''}" data-voice="">افتراضي (ويندوز)</button>
                  ${voices.map(
                    (voice) => html`<button class="voice-chip ${settings.voice === voice.name ? 'is-on' : ''}" data-voice="${voice.name}" title="${voice.name}">${voice.name}</button>`,
                  )}
                </div>
              </div>
              <div class="set-row">
                <div>
                  <div class="set-label">جرّب الصوت</div>
                  <div class="set-desc">جملة تجريبية: Ich möchte einen Kaffee.</div>
                </div>
                <button class="btn btn-ghost btn-sm" data-act="test-voice">${icon('speaker')} اسمع</button>
              </div>
            </section>

            <section class="set-group" id="whisper-section">
              <div class="set-group-head">
                <h2>التعرف الصوتي الذكي (Whisper AI)</h2>
                <p>تفريغ نطقك الألماني محلياً على جهازك 100% بدون إنترنت لحماية خصوصيتك</p>
              </div>

              <div class="whisper-specs-card">
                <div class="specs-head">
                  <span class="specs-badge" id="whisper-status-badge">جاري الفحص...</span>
                  <div class="specs-meta" id="whisper-device-info">فحص مواصفات الجهاز...</div>
                </div>
                <p class="specs-desc" id="whisper-recommendation">
                  البرنامج الأساسي يعمل بكامل مميزاته بدون Whisper. الميزة دي اختيارية لتحويل صوتك لنص تلقائياً أثناء التدريب على تنويع الجمل.
                </p>
              </div>

              <div class="whisper-models-grid">
                <!-- Base Model -->
                <div class="whisper-model-card" id="card-model-base">
                  <div class="model-top">
                    <span class="model-badge">🚀 خفيف وسريع</span>
                    <strong class="model-title">النموذج الخفيف (Base)</strong>
                    <span class="model-size">~142 MB فقط</span>
                  </div>
                  <p class="model-info">
                    خفيف جداً في الذاكرة (~1 GB RAM) وسريع الاستجابة. اختيار ممتاز للأجهزة المتوسطة واللابتوبات العادية.
                  </p>
                  <div class="model-action" id="action-base">
                    <button class="btn btn-ghost btn-sm" data-act="dl-whisper" data-model="base">${icon('download')} تحميل وتثبيت (142 MB)</button>
                  </div>
                </div>

                <!-- Turbo Model -->
                <div class="whisper-model-card" id="card-model-turbo">
                  <div class="model-top">
                    <span class="model-badge" style="border-color:var(--yellow);color:var(--yellow)">💎 دقة فائقة</span>
                    <strong class="model-title">النموذج الاحترافي (Turbo v3)</strong>
                    <span class="model-size">~1.5 GB</span>
                  </div>
                  <p class="model-info">
                    أعلى دقة وتفريق بين الكلمات الألمانية المشابهة. يتطلب جهاز قوي (معالج حديث، RAM 8GB+، ومساحة كافية).
                  </p>
                  <div class="model-action" id="action-turbo">
                    <button class="btn btn-ghost btn-sm" data-act="dl-whisper" data-model="turbo">${icon('download')} تحميل وتثبيت (1.5 GB)</button>
                  </div>
                </div>
              </div>

              <!-- Live Progress Bar -->
              <div class="whisper-progress-wrap" id="whisper-progress-wrap" style="display:none">
                <div class="progress-bar-head">
                  <span id="whisper-progress-label">جاري التحميل...</span>
                  <span id="whisper-progress-percent">0%</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="whisper-progress-fill" style="width:0%"></div>
                </div>
                <div class="row" style="margin-top:8px">
                  <span class="muted" style="font-size:12px" id="whisper-progress-bytes">0 / 0 MB</span>
                  <button class="btn btn-ghost btn-sm" data-act="cancel-whisper-dl" style="border-color:var(--red);color:var(--red);margin-inline-start:auto">إلغاء التحميل</button>
                </div>
              </div>

              <div class="set-row">
                <div>
                  <div class="set-label">أدوات المعالجة المحلية (FFmpeg & Whisper Binaries)</div>
                  <div class="set-desc" id="whisper-tools-desc">محرك تحويل الصوت المدمج</div>
                </div>
                <span class="badge" id="whisper-tools-badge">فحص...</span>
              </div>
            </section>

            <section class="set-group">
              <div class="set-group-head"><h2>البيانات</h2><p>تقدمك محفوظ في ملف JSON على جهازك</p></div>
              <div class="set-row" style="display:block">
                <div class="set-label" style="margin-bottom:6px">مكان الملف</div>
                <div class="data-path" id="data-path">${path || 'progress.json — جوه مجلد بيانات التطبيق'}</div>
                <div class="row" style="margin-top:10px">
                  <button class="btn btn-ghost btn-sm" data-act="open-folder">${icon('folder')} افتح فولدر البيانات</button>
                  <button class="btn btn-ghost btn-sm" data-act="export">${icon('download')} صدّر نسخة</button>
                  <button class="btn btn-ghost btn-sm" data-act="import">${icon('upload')} استورد نسخة</button>
                </div>
              </div>
              <div class="set-row">
                <div>
                  <div class="set-label">تقدم ملفات Obsidian القديمة</div>
                  <div class="set-desc">
                    ${stats.imported
                      ? `تم الاستيراد · ${stats.importedCount} جملة عندها شغل محفوظ. تقدر تعيد الاستيراد في أي وقت من غير ما تمسح حاجة.`
                      : 'استورد الشغل اللي في ملفات A1 اللي عندك.'}
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" data-act="legacy">${icon('spark')} استيراد</button>
              </div>
              <div class="set-row">
                <div>
                  <div class="set-label">مسح كل التقدم</div>
                  <div class="set-desc">هيمسح كل الخطوات والإنتاجات والمراجعات. خد نسخة احتياطية الأول.</div>
                </div>
                <button class="btn btn-ghost btn-sm" data-act="reset" style="border-color:var(--red);color:var(--red)">${icon('trash')} مسح</button>
              </div>
            </section>

            <section class="set-group">
              <div class="set-group-head"><h2>عن التطبيق</h2><p>دفتر الشانكس — نسخة محلية بالكامل</p></div>
              <div class="set-row">
                <div>
                  <div class="set-label" id="app-version">الإصدار 2.1.0</div>
                  <div class="set-desc">1500 جملة من A1 لـ C1، مقسمة 5 مستويات، بمسار 6 خطوات ومكتبة مصورة شاملة.</div>
                </div>
                <a class="btn btn-ghost btn-sm" href="#/method">شوف المنهج</a>
              </div>
            </section>
          </div>

          <aside class="settings-side">
            <div class="tip-card">
              <strong>اختصارات سريعة</strong>
              Esc: خروج من الجلسة · Alt + ← / →: تنقّل بين الخطوات. كل حاجة بتتحفظ تلقائيًا.
            </div>
            <div class="tip-card" style="background:color-mix(in srgb, var(--yellow) 18%, var(--card))">
              <strong>نصيحة الاستمرار</strong>
              5–10 جمل في الجلسة الواحدة أحسن من 30 مرة واحدة. المراجعة اليومية أهم من الجلسات الطويلة.
            </div>
            <div class="tip-card">
              <strong>ملاحظة أمان</strong>
              مفيش أي بيانات بتطلع من الجهاز. التسجيل الصوتي (لو استخدمته) بيتمسح أول ما تقفل الجلسة.
            </div>
          </aside>
        </div>
      </div>
    `;
  },

  mount(root) {
    const settings = store.state.settings;

    const setTheme = (next) => {
      store.setSetting('theme', next);
      document.documentElement.dataset.theme = next === 'dark' ? 'dark' : 'light';
      root.querySelector('[data-toggle="theme"]')?.classList.toggle('is-on', next === 'dark');
      root.querySelector('[data-toggle="theme"]')?.setAttribute('aria-checked', next === 'dark' ? 'true' : 'false');
    };

    const onClick = async (event) => {
      const soundToggle = event.target.closest('[data-toggle-sound]');
      if (soundToggle) {
        const next = audioEngine.toggleSound();
        soundToggle.classList.toggle('is-on', next);
        soundToggle.setAttribute('aria-checked', next ? 'true' : 'false');
        toast(next ? 'تم تفعيل المؤثرات الصوتية 🔊' : 'تم كتم الصوت 🔇', next ? 'speaker' : 'speaker-off');
        return;
      }

      const toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        const key = toggle.dataset.toggle;
        if (key === 'theme') {
          setTheme(settings.theme === 'dark' ? 'light' : 'dark');
          return;
        }
        if (key === 'notificationsEnabled') {
          const nextVal = settings.notificationsEnabled === false ? true : false;
          if (nextVal) {
            const granted = await reviewScheduler.requestPermission();
            if (!granted) {
              toast('إذن الإشعارات مش مفعل في المتصفح / النظام', 'lock');
            }
          }
          store.setSetting('notificationsEnabled', nextVal);
          toggle.classList.toggle('is-on', nextVal);
          toggle.setAttribute('aria-checked', nextVal ? 'true' : 'false');
          toast(nextVal ? 'تم تفعيل إشعارات ويندوز 🔔' : 'تم تعطيل إشعارات ويندوز 🔕', nextVal ? 'spark' : 'lock');
          return;
        }
        if (key === 'reviewChimeEnabled') {
          const nextVal = settings.reviewChimeEnabled === false ? true : false;
          store.setSetting('reviewChimeEnabled', nextVal);
          toggle.classList.toggle('is-on', nextVal);
          toggle.setAttribute('aria-checked', nextVal ? 'true' : 'false');
          if (nextVal) audioEngine.playReviewChime(true);
          toast(nextVal ? 'تم تفعيل منبه المراجعة (تيت تيت) 🎵' : 'تم كتم منبه المراجعة 🔇', nextVal ? 'speaker' : 'speaker-off');
          return;
        }
        const next = !settings[key];
        store.setSetting(key, next);
        toggle.classList.toggle('is-on', next);
        toggle.setAttribute('aria-checked', next ? 'true' : 'false');
        return;
      }

      const voice = event.target.closest('[data-voice]');
      if (voice) {
        store.setSetting('voice', voice.dataset.voice || '');
        root.querySelectorAll('[data-voice]').forEach((chip) => chip.classList.toggle('is-on', chip === voice));
        toast('اتغير الصوت', 'speaker');
        return;
      }

      const action = event.target.closest('[data-act]')?.dataset.act;
      if (!action) return;

      if (action === 'test-step') {
        audioEngine.playStepComplete(1);
      } else if (action === 'test-rest') {
        audioEngine.playRestComplete();
      } else if (action === 'test-session') {
        audioEngine.playWorkoutComplete();
      } else if (action === 'test-pr') {
        audioEngine.playNewPR();
      } else if (action === 'test-step-up') {
        audioEngine.playStepper('up');
      } else if (action === 'test-step-down') {
        audioEngine.playStepper('down');
      } else if (action === 'test-soft-error') {
        audioEngine.playSoftError();
      } else if (action === 'test-notification-chime') {
        await reviewScheduler.testNotificationAndChime();
        toast('تم تشغيل المنبه الصوتي وعرض إشعار ويندوز بنجاح ✨', 'spark');
      } else if (action === 'test-voice') {
        const ok = await speech.speak('Ich möchte einen Kaffee.', {
          rate: settings.ttsRate,
          voiceName: settings.voice,
        });
        if (!ok) toast('الصوت مش متاح على الجهاز ده', 'lock');
      } else if (action === 'open-folder') {
        await window.chunkAPI?.openDataFolder();
      } else if (action === 'export') {
        const result = await store.exportData();
        if (result?.ok) toast('اتصدّرت نسخة من تقدمك', 'download');
        else if (!result?.canceled) toast('مش قادر أصدّر', 'lock');
      } else if (action === 'import') {
        const result = await store.importData();
        if (result?.ok) {
          toast('اتستورد — التطبيق هيعيد التحميل', 'upload');
          setTimeout(() => location.reload(), 600);
        } else if (!result?.canceled) toast(result?.error || 'الملف مش صالح', 'lock');
      } else if (action === 'legacy') {
        const result = store.importLegacyProgress();
        toast(`تم استيراد ${chunksLabel(result.count)} · ${result.stages} مرحلة`, 'spark');
      } else if (action === 'dl-whisper') {
        const modelKey = event.target.closest('[data-model]')?.dataset.model || 'base';
        const isTurbo = modelKey === 'turbo';
        const modelLabel = isTurbo ? 'النموذج المتقدم Turbo (~1.5 GB)' : 'النموذج الخفيف Base (~142 MB)';
        const confirmed = await confirmDialog({
          title: `تحميل ${modelLabel}؟`,
          text: isTurbo 
            ? 'سيتم تحميل ملف بحجم 1.5 GB من سيرفرات HuggingFace الرسمية وتثبيته محلياً. تأكد من وجود مساحة وسرعة إنترنت مناسبة.'
            : 'سيتم تحميل ملف بحجم 142 MB فقط وتثبيته محلياً لتشغيل التعرف الصوتي السريع.',
          confirm: 'ابدأ التحميل الآن',
        });
        if (confirmed) {
          const wrap = root.querySelector('#whisper-progress-wrap');
          if (wrap) wrap.style.display = 'block';
          toast('بدأ تحميل نموذج ويسبر في الخلفية...', 'spark');
          const res = await window.chunkAPI?.downloadWhisperModel(modelKey);
          if (res?.ok) {
            toast('تم التحميل والتثبيت بنجاح 🎉', 'check');
          } else if (res?.error && res.error !== 'cancelled') {
            toast(`فشل التحميل: ${res.error}`, 'lock');
          }
          refreshWhisperUI();
        }
      } else if (action === 'del-whisper') {
        const modelKey = event.target.closest('[data-model]')?.dataset.model || 'base';
        const confirmed = await confirmDialog({
          title: 'حذف نموذج ويسبر؟',
          text: 'سيتم حذف ملف النموذج من جهازك لتوفير مساحة القرص. يمكنك إعادة تحميله في أي وقت.',
          confirm: 'احذف الآن',
          danger: true,
        });
        if (confirmed) {
          await window.chunkAPI?.deleteWhisperModel(modelKey);
          toast('تم حذف النموذج وتفريغ المساحة', 'trash');
          refreshWhisperUI();
        }
      } else if (action === 'cancel-whisper-dl') {
        await window.chunkAPI?.cancelWhisperDownload();
        const wrap = root.querySelector('#whisper-progress-wrap');
        if (wrap) wrap.style.display = 'none';
        toast('تم إلغاء التحميل', 'lock');
        refreshWhisperUI();
      } else if (action === 'reset') {
        const confirmed = await confirmDialog({
          title: 'متأكد إنك عايز تمسح كل التقدم؟',
          text: 'هيتم مسح كل الخطوات والإنتاجات والمراجعات. النسخة الاحتياطية بتتحفظ في مجلد backups جوه بيانات التطبيق.',
          confirm: 'امسح كل حاجة',
          danger: true,
        });
        if (confirmed) {
          await store.resetAll();
          toast('اتمسح كل حاجة — بداية جديدة', 'spark');
          location.hash = '#/home';
          setTimeout(() => location.reload(), 400);
        }
      }
    };

    const onInput = (event) => {
      const soundRange = event.target.closest('[data-range-sound]');
      if (soundRange) {
        const val = parseFloat(soundRange.value);
        audioEngine.setMasterVolume(val);
        const label = root.querySelector('#val-sound-vol');
        if (label) label.textContent = `${Math.round(val * 100)}%`;
        return;
      }

      const range = event.target.closest('[data-range]');
      if (!range) return;
      const key = range.dataset.range;
      const value = Number(range.value);
      const label = root.querySelector(`#val-${key}`);
      if (label) label.textContent = key === 'ttsRate' ? `${value.toFixed(2)}×` : String(value);
    };

    const onChange = (event) => {
      const soundRange = event.target.closest('[data-range-sound]');
      if (soundRange) {
        audioEngine.playStepComplete(1);
        return;
      }

      const range = event.target.closest('[data-range]');
      if (!range) return;
      store.setSetting(range.dataset.range, Number(range.value));
      toast('اتحفظ', 'check');
    };

    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);

    const rebuildVoices = () => {
      const list = root.querySelector('#voice-list');
      if (!list) return;
      const voices = speech.germanVoices();
      if (!voices.length) return;
      list.innerHTML = String(html`
        <button class="voice-chip ${!settings.voice ? 'is-on' : ''}" data-voice="">افتراضي</button>
        ${voices.map(
          (voice) => html`<button class="voice-chip ${settings.voice === voice.name ? 'is-on' : ''}" data-voice="${voice.name}" title="${voice.name}">${voice.name}</button>`,
        )}
      `);
    };
    rebuildVoices();
    const voiceTimer = setTimeout(rebuildVoices, 900);
    window.speechSynthesis?.addEventListener?.('voiceschanged', rebuildVoices);

    window.chunkAPI?.appInfo().then((info) => {
      const node = root.querySelector('#app-version');
      if (node && info) node.textContent = `الإصدار ${info.version} · Electron ${info.electron}`;
    });

    const refreshWhisperUI = async () => {
      if (!window.chunkAPI?.getWhisperStatus) return;
      const status = await window.chunkAPI.getWhisperStatus();
      if (!status?.ok) return;

      const badge = root.querySelector('#whisper-status-badge');
      const devInfo = root.querySelector('#whisper-device-info');
      const rec = root.querySelector('#whisper-recommendation');
      const toolsBadge = root.querySelector('#whisper-tools-badge');
      const toolsDesc = root.querySelector('#whisper-tools-desc');

      if (devInfo && status.specs) {
        devInfo.innerHTML = `💻 مواصفات جهازك: <b>${status.specs.cpus} أنوية</b> · <b>${status.specs.totalMemGB} GB RAM</b>`;
      }

      if (toolsBadge) {
        toolsBadge.textContent = status.hasTools ? 'جاهزة ومثبتة ✅' : 'غير متوفرة ⚠️';
        toolsBadge.className = `badge ${status.hasTools ? 'is-ready' : 'is-missing'}`;
      }
      if (toolsDesc) {
        toolsDesc.textContent = status.hasTools 
          ? `المحرك يعمل محلياً: ${status.binDir}` 
          : 'الأدوات غير موجودة في المستودع. ستتوفر عند تشغيل سكريبت الإعداد setup:whisper';
      }

      if (badge) {
        if (status.downloading) {
          badge.textContent = 'جاري التحميل الآن... ⏳';
          badge.className = 'specs-badge is-downloading';
        } else if (status.hasModel && status.hasTools) {
          badge.textContent = `جاهز للعمل ✅ (${status.activeModel?.label || 'نموذج محمل'})`;
          badge.className = 'specs-badge is-ready';
        } else if (!status.hasModel) {
          badge.textContent = 'النموذج غير محمل (الميزة معطلة مؤقتاً) ⚠️';
          badge.className = 'specs-badge is-missing';
        } else {
          badge.textContent = 'أدوات التشغيل ناقصة ⚠️';
          badge.className = 'specs-badge is-missing';
        }
      }

      if (rec && status.specs) {
        if (status.specs.totalMemGB >= 12) {
          rec.innerHTML = `جهازك بمواصفات قوية (${status.specs.totalMemGB} GB RAM) — <b>مؤهل لتشغيل النموذج المتقدم Turbo</b> بأعلى دقة ممكنة.`;
        } else if (status.specs.totalMemGB >= 8) {
          rec.innerHTML = `جهازك ممتاز (${status.specs.totalMemGB} GB RAM) — يمكنك اختيار <b>النموذج الخفيف Base</b> للسرعة الخارقة، أو <b>Turbo</b> للدقة.`;
        } else {
          rec.innerHTML = `جهازك اقتصادي (${status.specs.totalMemGB} GB RAM) — <b>يُنصح بالنموذج الخفيف Base (~142 MB)</b> لتوفير الذاكرة وضمان أفضل أداء وسرعة.`;
        }
      }

      // Render model cards
      ['base', 'turbo'].forEach((mKey) => {
        const mInfo = status.models?.[mKey];
        const card = root.querySelector(`#card-model-${mKey}`);
        const actWrap = root.querySelector(`#action-${mKey}`);
        if (!card || !actWrap) return;

        const isInstalled = mInfo?.installed;
        card.classList.toggle('is-active', Boolean(isInstalled));

        if (isInstalled) {
          const mb = Math.round(mInfo.size / (1024 * 1024));
          actWrap.innerHTML = `
            <span style="color:#10b981;font-weight:700;font-size:12px">مثبت وجاهز ✅ (${mb} MB)</span>
            <button class="btn btn-ghost btn-sm" data-act="del-whisper" data-model="${mKey}" style="margin-inline-start:auto;border-color:var(--red);color:var(--red);font-size:11px">${icon('trash')} حذف لتوفير المساحة</button>
          `;
        } else {
          const szLabel = mKey === 'base' ? '142 MB' : '1.5 GB';
          actWrap.innerHTML = `
            <button class="btn btn-ghost btn-sm" data-act="dl-whisper" data-model="${mKey}">
              ${icon('download')} تحميل وتثبيت (${szLabel})
            </button>
          `;
        }
      });
    };

    refreshWhisperUI();

    const unsubProgress = window.chunkAPI?.onWhisperProgress?.((data) => {
      const wrap = root.querySelector('#whisper-progress-wrap');
      const fill = root.querySelector('#whisper-progress-fill');
      const pct = root.querySelector('#whisper-progress-percent');
      const bytesLabel = root.querySelector('#whisper-progress-bytes');
      const lbl = root.querySelector('#whisper-progress-label');
      if (wrap) wrap.style.display = 'block';
      if (fill) fill.style.width = `${data.percent}%`;
      if (pct) pct.textContent = `${data.percent}%`;
      if (bytesLabel) {
        const loadedMB = (data.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (data.total / (1024 * 1024)).toFixed(1);
        bytesLabel.textContent = `${loadedMB} MB / ${totalMB} MB`;
      }
      if (lbl) lbl.textContent = `جاري تحميل نموذج ${data.modelId === 'base' ? 'Base (142 MB)' : 'Turbo (1.5 GB)'}...`;
    });

    const unsubComplete = window.chunkAPI?.onWhisperComplete?.((data) => {
      const wrap = root.querySelector('#whisper-progress-wrap');
      if (wrap) wrap.style.display = 'none';
      if (data.success) {
        toast(`تم تحميل وتثبيت نموذج ويسبر بنجاح 🎉`, 'check');
      }
      refreshWhisperUI();
    });

    return () => {
      clearTimeout(voiceTimer);
      unsubProgress?.();
      unsubComplete?.();
      window.speechSynthesis?.removeEventListener?.('voiceschanged', rebuildVoices);
      root.removeEventListener('click', onClick);
      root.removeEventListener('input', onInput);
      root.removeEventListener('change', onChange);
    };
  },
};
