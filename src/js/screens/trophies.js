// ============================================================
// Trophy Cabinet & Skill Certificates Screen (G066, G067, G070)
// Adapted for the 50-Level Player Rank Ladder & 1,500 Chunks
// ============================================================

import { store } from '../store.js';
import { trophyManager, BADGES } from '../trophies.js';
import { audioEngine } from '../audioEngine.js';
import { html, icon, raw, chunksLabel } from '../utils.js';

export const trophiesScreen = {
  render() {
    const rankInfo = trophyManager.getRankInfo();
    const badges = trophyManager.getAllBadges();
    const unlockedCount = badges.filter((b) => b.unlocked).length;

    const levels = store.levels || [];

    return html`
      <div class="page trophies-page">
        <div class="section-head">
          <div>
            <span class="eyebrow">خزانة الإنجازات والتحفيز اللحظي</span>
            <h1 style="font-size:clamp(26px,3.2vw,34px);margin-top:2px">إنجازاتك المعتمدة ونقاط الإتقان</h1>
            <p class="sub muted">الأوسمة والرتب تُمنح تلقائيًا بناءً على إتقان حقيقي وموثق لمسار الـ 1,500 شانك، بدون حظ وبدون شروط خفية.</p>
          </div>
          <div class="top-actions">
            <button class="btn btn-primary btn-sm" data-act="cert-quick">
              ${icon('trophy')} استخراج شهادة مستوى
            </button>
          </div>
        </div>

        <!-- Bento Grid Hero Summary -->
        <div class="trophy-bento">
          <!-- Rank & XP Card (50 Levels) -->
          <div class="bento-card bento-xp">
            <div class="bento-rank-top">
              <span class="bento-rank-badge">
                ${rankInfo.current.icon} ${rankInfo.current.title}
                <small class="bento-tier-pill">${rankInfo.current.tier}</small>
              </span>
              <span class="bento-xp-num"><b>${rankInfo.xp.toLocaleString()}</b> <small>XP</small></span>
            </div>
            <div class="bento-bar-wrap">
              <div class="bento-bar"><span style="width:${rankInfo.progressPct}%"></span></div>
              <div class="bento-bar-lbl">
                <span>المستوى الحالي <b>${rankInfo.current.level}</b> من 50</span>
                ${rankInfo.next
                  ? html`<span>فاضل <b>${rankInfo.remainingXP.toLocaleString()} XP</b> للمستوى ${rankInfo.next.level} (${rankInfo.next.title})</span>`
                  : html`<span>أعلى رتبة إتقان في البرنامج 🎉</span>`}
              </div>
            </div>
            <div class="bento-curriculum-overview">
              <div class="bento-curriculum-head">
                <span>رحلة الـ 1,500 جملة كاملة:</span>
                <b>${rankInfo.overallMastered} من 1,500 متقنة (${rankInfo.curriculumPct}%)</b>
              </div>
              <div class="bento-curriculum-bar">
                <span style="width:${rankInfo.curriculumPct}%"></span>
              </div>
            </div>
          </div>

          <!-- Trophy Progress Card -->
          <div class="bento-card bento-stat">
            <span class="bento-stat-num">${unlockedCount} <small>/ ${badges.length}</small></span>
            <span class="bento-stat-lbl">أوسمة مكتملة في الخزانة</span>
            <div class="bento-chips-row">
              <span class="chip chip-green">${unlockedCount} مفتوح</span>
              <span class="chip">${badges.length - unlockedCount} قيد الإنجاز</span>
            </div>
          </div>

          <!-- Streak & Mastery Card -->
          <div class="bento-card bento-stat">
            <span class="bento-stat-num">${store.streak()} <small>أيام</small></span>
            <span class="bento-stat-lbl">السلسلة الحالية المتواصلة</span>
            <div class="bento-chips-row">
              <span class="chip">${rankInfo.overallMastered} جملة متقنة</span>
            </div>
          </div>
        </div>

        <!-- Trophy Filter Tabs -->
        <div class="trophy-filter-bar">
          <div class="tabs-nav" id="trophy-tabs">
            <button class="tab-btn is-active" data-filter="all">الكل (${badges.length})</button>
            <button class="tab-btn" data-filter="unlocked">المحققة (${unlockedCount})</button>
            <button class="tab-btn" data-filter="in_progress">قيد الإنجاز (${badges.length - unlockedCount})</button>
            <button class="tab-btn" data-filter="mastery">الإتقان</button>
            <button class="tab-btn" data-filter="practice">التدريب والتنويع</button>
            <button class="tab-btn" data-filter="streak">السلاسل</button>
          </div>
        </div>

        <!-- Badges Grid -->
        <div class="badges-grid" id="badges-grid">
          ${badges.map((badge) => renderBadgeCard(badge))}
        </div>

        <!-- Certificates Section (G070) -->
        <section class="cert-showcase-section">
          <div class="section-head" style="margin-bottom:16px">
            <div>
              <span class="eyebrow">شهادات المهارة المعتمدة</span>
              <h2 style="font-size:22px">شهادات قابلة للطباعة والحفظ (A1 إلى C1)</h2>
              <p class="sub muted">توثق بدقة إتقان الـ 300 جملة لكل مستوى، مع إمكانية التصدير إلى PDF ورمز تحقق فريد.</p>
            </div>
          </div>

          <div class="cert-cards-grid">
            ${levels.map((lvl) => {
              const stats = store.levelStats(lvl.id);
              const eligible = stats.mastered >= 100;
              const isHonors = stats.mastered >= 300;
              const pct = Math.round((stats.mastered / (stats.total || 300)) * 100);

              let statusText = 'محتاجة 100 شانك للاستخراج';
              if (isHonors) statusText = 'مكتملة بمرتبة الشرف 🏆';
              else if (eligible) statusText = 'جاهزة للاستخراج المعتمد ✨';
              else statusText = `فاضل ${100 - stats.mastered} لإتاحة الشهادة`;

              return html`
                <div class="cert-card ${eligible ? 'is-eligible' : 'is-locked'}">
                  <div class="cert-card-header">
                    <span class="chip is-level" style="background:var(--${lvl.id.toLowerCase()});color:#fff">${lvl.id}</span>
                    <span class="cert-card-status">${statusText}</span>
                  </div>
                  <h3>${lvl.title}</h3>
                  <p class="cert-card-p">${stats.mastered} شانك متقن من 300 (${pct}%)</p>
                  <div class="cert-card-bar">
                    <span style="width:${Math.min(100, pct)}%"></span>
                  </div>
                  <button
                    class="btn ${eligible ? 'btn-primary' : 'btn-ghost'} btn-sm"
                    data-act="open-cert"
                    data-level="${lvl.id}"
                    ${eligible ? '' : 'disabled'}
                  >
                    ${eligible ? icon('trophy') : icon('lock')} ${eligible ? 'عرض وطباعة الشهادة' : 'كمّل الشروط الأول (100 شانك)'}
                  </button>
                </div>
              `;
            })}
          </div>
        </section>
      </div>
    `;
  },

  mount(root) {
    // Tab filtering
    const tabBtns = root.querySelectorAll('#trophy-tabs .tab-btn');
    const badgeCards = root.querySelectorAll('.badge-card');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        audioEngine.playTap();
        tabBtns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        const filter = btn.dataset.filter;
        badgeCards.forEach((card) => {
          const isUnlocked = card.dataset.unlocked === 'true';
          const cat = card.dataset.category;

          let match = true;
          if (filter === 'unlocked') match = isUnlocked;
          else if (filter === 'in_progress') match = !isUnlocked;
          else if (filter === 'mastery') match = cat === 'mastery';
          else if (filter === 'practice') match = cat === 'practice';
          else if (filter === 'streak') match = cat === 'streak';

          card.style.display = match ? 'flex' : 'none';
        });
      });
    });

    // Certificate openers
    root.querySelectorAll('[data-act="open-cert"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = btn.dataset.level || 'A1';
        audioEngine.playTap();
        trophyManager.openCertificateModal(lvl);
      });
    });

    root.querySelector('[data-act="cert-quick"]')?.addEventListener('click', () => {
      audioEngine.playTap();
      trophyManager.openCertificateModal('A1');
    });

    // Interactive badge clicks
    badgeCards.forEach((card) => {
      card.addEventListener('click', () => {
        if (card.dataset.unlocked === 'true') {
          audioEngine.playNewPR();
        } else {
          audioEngine.playTap();
        }
      });
    });
  },
};

function renderBadgeCard(badge) {
  return html`
    <div
      class="badge-card ${badge.unlocked ? 'is-unlocked' : 'is-locked'}"
      data-unlocked="${badge.unlocked ? 'true' : 'false'}"
      data-category="${badge.category}"
    >
      <div class="badge-card-icon">
        <div class="badge-icon-box">
          ${icon(badge.icon || 'trophy')}
        </div>
        ${badge.unlocked ? html`<span class="badge-status-dot" title="مكتمل">${icon('check')}</span>` : ''}
      </div>
      <div class="badge-card-body">
        <div class="badge-card-top">
          <h4>${badge.title}</h4>
          <span class="badge-xp-chip">+${badge.xp} XP</span>
        </div>
        <p class="badge-card-desc">${badge.desc}</p>
        <div class="badge-card-foot">
          <span class="badge-foot-status ${badge.unlocked ? 'is-done' : ''}">
            ${badge.unlocked ? 'تم الإنجاز بنجاح ✓' : 'قيد التدريب والتكرار'}
          </span>
        </div>
      </div>
    </div>
  `;
}
