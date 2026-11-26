// Single source of truth. Every mutation is persisted to disk through the
// Electron bridge (with a localStorage fallback for plain-browser previews).
import {
  addDays,
  addHours,
  clamp,
  dayKey,
  dayStart,
  debounce,
  daysBetween,
  formatExactDateTime,
  formatCountdown,
} from './utils.js';

export const STAGES = [
  { key: 'understand', title: 'افهم الـChunk', short: 'افهم', hint: 'اقرأ، افهم المعنى، شوف الوظيفة' },
  { key: 'speak', title: 'انطقه بصوت عالي', short: 'انطق', hint: 'بطيء، طبيعي، وبعدين من غير ما تبص' },
  { key: 'produce', title: 'درّب عليه 30 إنتاج', short: 'درّب', hint: '10 + 5 + 5 + 5 + 5 على أيام' },
  { key: 'test', title: 'اختبر نفسك', short: 'اختبر', hint: 'استدعاء سريع، سرعة، كلام مرتجل' },
  { key: 'vary', title: 'المرحلة الختامية: غيّر كل مرة', short: 'التنويع', hint: '5 تنويعات شاملة لقالب المجموعة' },
];

export const PRODUCE_PLAN = [
  { amount: 10, label: 'الجلسة الأولى', sub: '10 جمل مختلفة', hours: 0 },
  { amount: 5, label: 'بعد عدة ساعات', sub: 'نفس اليوم', hours: 4 },
  { amount: 5, label: 'اليوم التالي', sub: 'بعد 24 ساعة', hours: 24 },
  { amount: 5, label: 'بعد 3 أيام', sub: 'مراجعة', hours: 72 },
  { amount: 5, label: 'بعد 7 أيام', sub: 'مراجعة', hours: 168 },
];

export const SR_INTERVALS = [
  { stage: 1, label: 'المرحلة 1: بعد عدة ساعات', shortLabel: 'بعد عدة ساعات', sub: 'نفس اليوم', hours: 4 },
  { stage: 2, label: 'المرحلة 2: اليوم التالي', shortLabel: 'اليوم التالي', sub: 'بعد 24 ساعة', hours: 24 },
  { stage: 3, label: 'المرحلة 3: بعد 3 أيام', shortLabel: 'بعد 3 أيام', sub: 'مراجعة', hours: 72 },
  { stage: 4, label: 'المرحلة 4: بعد 7 أيام', shortLabel: 'بعد 7 أيام', sub: 'مراجعة نهائية', hours: 168 },
];

export function createInitialSrSchedule(baseDateIso = null) {
  const base = baseDateIso ? new Date(baseDateIso) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;
  const stages = SR_INTERVALS.map((intv) => ({
    stage: intv.stage,
    label: intv.label,
    shortLabel: intv.shortLabel,
    sub: intv.sub,
    hours: intv.hours,
    scheduledAt: addHours(validBase, intv.hours).toISOString(),
    completedAt: null,
    done: false,
  }));
  return {
    createdAt: validBase.toISOString(),
    lastReviewedAt: null,
    currentStage: 1,
    nextReviewAt: stages[0].scheduledAt,
    notifiedStage: 0,
    stages,
  };
}

export function normalizeSrSchedule(sch, rec) {
  if (rec?.srOptOut) return null;
  if (!sch || typeof sch !== 'object') {
    const hasProgress = (rec.produce?.total || 0) > 0 || rec.mastery?.done || rec.understand?.done;
    if (hasProgress) {
      const baseAt = rec.produce?.log?.[0]?.at || rec.understand?.at || rec.lastAt || nowIso();
      const init = createInitialSrSchedule(baseAt);
      const prodTotal = rec.produce?.total || 0;
      if (prodTotal >= 15 && init.stages[0]) {
        init.stages[0].done = true;
        init.stages[0].completedAt = rec.produce?.log?.[1]?.at || baseAt;
      }
      if (prodTotal >= 20 && init.stages[1]) {
        init.stages[1].done = true;
        init.stages[1].completedAt = rec.produce?.log?.[2]?.at || baseAt;
      }
      if (prodTotal >= 25 && init.stages[2]) {
        init.stages[2].done = true;
        init.stages[2].completedAt = rec.produce?.log?.[3]?.at || baseAt;
      }
      if ((prodTotal >= 30 || rec.mastery?.done) && init.stages[3]) {
        init.stages[3].done = true;
        init.stages[3].completedAt = rec.produce?.log?.[4]?.at || rec.mastery?.at || baseAt;
      }
      const firstUndone = init.stages.find((s) => !s.done);
      init.currentStage = firstUndone ? firstUndone.stage : 5;
      init.nextReviewAt = firstUndone ? firstUndone.scheduledAt : null;
      init.notifiedStage = firstUndone ? 0 : 5;
      return init;
    }
    return null;
  }
  const stages = SR_INTERVALS.map((intv, idx) => {
    const existing = sch.stages?.[idx] || {};
    return {
      stage: intv.stage,
      label: intv.label,
      shortLabel: intv.shortLabel,
      sub: intv.sub,
      hours: intv.hours,
      scheduledAt: existing.scheduledAt || addHours(new Date(sch.createdAt || nowIso()), intv.hours).toISOString(),
      completedAt: existing.completedAt || null,
      done: Boolean(existing.done),
    };
  });
  const firstUndone = stages.find((s) => !s.done);
  const isFullyDone = !firstUndone || (rec?.produce?.total || 0) >= 30 || Boolean(rec?.mastery?.done && stages.every((s) => s.done));
  return {
    createdAt: sch.createdAt || nowIso(),
    lastReviewedAt: sch.lastReviewedAt || null,
    currentStage: typeof sch.currentStage === 'number' ? sch.currentStage : (firstUndone ? firstUndone.stage : 5),
    nextReviewAt: sch.nextReviewAt !== undefined ? sch.nextReviewAt : (firstUndone ? firstUndone.scheduledAt : null),
    notifiedStage: typeof sch.notifiedStage === 'number' ? (isFullyDone && !firstUndone ? 5 : sch.notifiedStage) : (firstUndone ? 0 : 5),
    stages,
  };
}

export const VARIATION_AXES = [
  { key: 'subject', title: 'غيّر الفاعل', hint: 'مثال: ich ← wir / du / er / die Leute' },
  { key: 'tense', title: 'غيّر الزمن', hint: 'مثال: حاضر ← ماضي / مستقبل / شرط' },
  { key: 'words', title: 'غيّر الكلمات', hint: 'بدّل الاسم أو الصفة أو المفعول' },
  { key: 'situation', title: 'غيّر الموقف', hint: 'نفس الجملة في مطعم / شغل / سفر' },
];

export const FUNCTIONS = ['رأي', 'مقارنة', 'سبب', 'نتيجة', 'طلب', 'رفض', 'رد', 'اقتراح'];

const AXIS_TITLE = Object.fromEntries(VARIATION_AXES.map((a) => [a.key, a.title]));

const nowIso = () => new Date().toISOString();

const emptyRecord = () => ({
  understand: { done: false, at: null, func: null, checks: {} },
  speak: { passes: { slow: false, natural: false, blind: false }, count: 0, at: null },
  produce: { total: 0, log: [] },
  vary: { items: [], at: null, importedDone: false },
  test: {
    recall: { score: 0, total: 5, at: null, passed: false },
    variation: { count: 0, at: null },
    sprint: { count: 0, at: null },
    speaking: { seconds: 0, at: null, note: '' },
    delayed: { passed: false, at: null },
  },
  mastery: { done: false, at: null },
  review: { due: null, interval: 0, reps: 0, lastGrade: null, lastAt: null },
  srSchedule: null,
  seconds: 0,
  lastAt: null,
  imported: [],
  notes: '',
});

const defaultSettings = () => ({
  dailyGoal: 25,
  theme: 'light',
  lang: 'ar',
  tts: true,
  ttsRate: 0.95,
  voice: '',
  notificationsEnabled: true,
  reviewChimeEnabled: true,
});

const defaultState = () => ({
  v: 2,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  settings: defaultSettings(),
  pointer: null,
  days: {},
  chunks: {},
  groups: {},
  reviews: [],
  library: { read: [], fav: [] },
  meta: { importedObsidian: false, importedAt: null, importedCount: 0 },
});

export function getChunkGroupInfo(chunk, levelId) {
  if (!chunk) return { groupId: 'other', title: 'عبارات متنوعة', key: 'other' };
  const lv = levelId || chunk.level || (chunk.id ? chunk.id.split('-')[0] : 'A1');
  if (chunk.groupId && chunk.groupTitle) {
    return {
      groupId: chunk.groupId,
      title: chunk.groupTitle,
      key: chunk.groupKey || chunk.groupId.split('::')[1] || chunk.groupId,
    };
  }
  let title = (chunk.template || '').trim();
  if (!title && chunk.family) {
    const famPart = chunk.family.split(':')[1] || chunk.family;
    title = famPart.trim();
  }
  if (!title) {
    const words = (chunk.de || '').trim().split(/\s+/).slice(0, 2).join(' ');
    title = words ? `${words} …` : 'عبارات متنوعة';
  }
  const cleanKey = title.replace(/[.…]+$/, '').trim().toLowerCase();
  return {
    groupId: `${lv}::${cleanKey}`,
    title: title.includes('…') ? title : `${title} …`,
    key: cleanKey,
  };
}

function stageFlags(rec, groupVariationDone = false) {
  const speak = rec.speak?.passes?.slow && rec.speak?.passes?.natural && rec.speak?.passes?.blind;
  const immediateTestsPassed = Boolean(
    rec.test?.recall?.passed &&
      rec.test?.sprint?.count >= 5 &&
      rec.test?.speaking?.seconds >= 30,
  );
  const variationDone =
    groupVariationDone ||
    (rec.vary?.items?.length || 0) >= 5 ||
    (rec.test?.variation?.count || 0) >= 5 ||
    Boolean(rec.vary?.importedDone);

  return [
    Boolean(rec.understand?.done),
    Boolean(speak),
    (rec.produce?.total || 0) >= 10,
    immediateTestsPassed,
    variationDone,
    Boolean(rec.mastery?.done),
  ];
}

class Store {
  constructor() {
    this.data = null;
    this.state = defaultState();
    this.loaded = false;
    this._dirty = false;
    this.recoveredFromBackup = false;
    this.onSaved = null;
    this.onChange = null;
    this.api = typeof window !== 'undefined' ? window.chunkAPI : undefined;
    this.save = debounce(() => this.persist(), 180);
  }

  async init() {
    let payload = null;
    if (this.api) {
      payload = await this.api.getChunks();
    } else if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      payload = await (await fetch(new URL('../../data/chunks.json', import.meta.url))).json();
    } else {
      const fs = await import('node:fs');
      payload = JSON.parse(fs.readFileSync(new URL('../../data/chunks.json', import.meta.url), 'utf8'));
    }
    if (!payload || !payload.levels) throw new Error('ملفات الشانكس مش موجودة');
    this.data = payload;
    this.levels = payload.levels.map((level) => ({
      ...level,
      chunks: level.chunks.map((chunk, index) => {
        const groupInfo = getChunkGroupInfo(chunk, level.id);
        const gNum = chunk.groupNumber || (chunk.groupId ? parseInt(chunk.groupId.split('::group-')[1], 10) : index + 1);
        return {
          ...chunk,
          level: level.id,
          levelTitle: level.title,
          index,
          groupId: chunk.groupId || groupInfo.groupId,
          groupTitle: chunk.groupTitle || (chunk.groupId && gNum ? `المجموعة ${gNum}` : groupInfo.title),
          groupKey: chunk.groupKey || groupInfo.key,
          groupNumber: gNum,
          groupOrder: chunk.groupOrder || (index + 1),
          isAnchor: Boolean(chunk.isAnchor),
          isCapstone: Boolean(chunk.isCapstone),
        };
      }),
    }));
    this.byId = new Map();
    this.levelMap = new Map();
    for (const level of this.levels) {
      this.levelMap.set(level.id, level);
      for (const chunk of level.chunks) this.byId.set(chunk.id, chunk);
    }

    let loadedState = null;
    if (this.api) {
      const loaded = await this.api.loadState();
      loadedState = loaded?.state || null;
      this.recoveredFromBackup = Boolean(loaded?.recoveredFromBackup);
      this.paths = loaded;
    } else {
      try {
        loadedState = JSON.parse(localStorage.getItem('chunk-trainer-state') || 'null');
      } catch {
        loadedState = null;
      }
    }

    this.state = this.normalize(loadedState);
    if (!this.state.meta.importedObsidian) {
      this.state.meta.importedObsidian = true;
    }
    this.freshImport = false;
    if (!this.state.pointer) this.state.pointer = this.firstUnfinishedPointer();
    this.loaded = true;
    // Only persist on boot if we actually loaded & migrated existing data (never overwrite missing/corrupt state with blank)
    if (loadedState && loadedState.v !== this.state.v) {
      this._dirty = true;
      this.save();
    }
    return this.state;
  }

  normalize(loaded) {
    if (!loaded || typeof loaded !== 'object') return defaultState();
    const base = defaultState();
    // Migrate legacy localStorage library read/fav & lang into unified progress.json (Zero Data Loss)
    let migratedLib = loaded.library;
    if (!migratedLib && typeof localStorage !== 'undefined') {
      try {
        const rawLib = JSON.parse(localStorage.getItem('chunk-trainer-library-v1') || 'null');
        if (rawLib) {
          migratedLib = {
            read: Array.isArray(rawLib.read) ? rawLib.read : [],
            fav: Array.isArray(rawLib.fav) ? rawLib.fav : [],
          };
        }
      } catch {}
    }
    const state = {
      ...base,
      ...loaded,
      v: 2,
      settings: { ...base.settings, ...(loaded.settings || {}) },
      days: loaded.days || {},
      chunks: loaded.chunks || {},
      groups: loaded.groups || {},
      reviews: loaded.reviews || [],
      library: {
        read: Array.isArray(migratedLib?.read) ? [...new Set(migratedLib.read)] : [],
        fav: Array.isArray(migratedLib?.fav) ? [...new Set(migratedLib.fav)] : [],
      },
      meta: { ...base.meta, ...(loaded.meta || {}) },
      pointer: loaded.pointer || null,
    };
    for (const [id, rec] of Object.entries(state.chunks)) {
      state.chunks[id] = this.normalizeRecord(rec);
    }
    // Auto-migrate any existing chunk variations into group variations (Zero Data Loss)
    for (const [id, rec] of Object.entries(state.chunks)) {
      if (!rec.vary?.items?.length && !rec.vary?.importedDone) continue;
      const lv = id.split('-')[0];
      const chunk = this.byId?.get(id);
      const groupInfo = getChunkGroupInfo(chunk || { id }, lv);
      const gid = groupInfo.groupId;
      if (!state.groups[gid]) {
        state.groups[gid] = { variations: [], done: false, at: null };
      }
      const grp = state.groups[gid];
      if (rec.vary?.importedDone) grp.done = true;
      for (const item of rec.vary?.items || []) {
        const text = String(item.text || '').trim();
        if (!text) continue;
        const exists = grp.variations.some(
          (v) => v.text.trim().toLowerCase() === text.toLowerCase(),
        );
        if (!exists) {
          grp.variations.push({
            axis: item.axis || 'words',
            text,
            at: item.at || nowIso(),
          });
        }
      }
      if (grp.variations.length >= 5) grp.done = true;
    }
    for (const day of Object.values(state.days)) {
      if (Array.isArray(day.chunks)) {
        day.chunks = day.chunks.filter((cid) => state.chunks[cid] || (!cid.startsWith('B2-') && !cid.startsWith('C1-')));
      }
    }
    return state;
  }

  normalizeRecord(rec) {
    const base = emptyRecord();
    const normalized = {
      ...base,
      ...rec,
      understand: { ...base.understand, ...(rec.understand || {}) },
      speak: { ...base.speak, ...(rec.speak || {}), passes: { ...base.speak.passes, ...(rec.speak?.passes || {}) } },
      produce: { ...base.produce, ...(rec.produce || {}), log: rec.produce?.log?.slice(-40) || [] },
      vary: { ...base.vary, ...(rec.vary || {}), items: rec.vary?.items || [] },
      test: {
        recall: { ...base.test.recall, ...(rec.test?.recall || {}) },
        variation: { ...base.test.variation, ...(rec.test?.variation || {}) },
        sprint: { ...base.test.sprint, ...(rec.test?.sprint || {}) },
        speaking: { ...base.test.speaking, ...(rec.test?.speaking || {}) },
        delayed: { ...base.test.delayed, ...(rec.test?.delayed || {}) },
      },
      mastery: { ...base.mastery, ...(rec.mastery || {}) },
      review: { ...base.review, ...(rec.review || {}) },
      imported: rec.imported || [],
    };
    normalized.srSchedule = normalizeSrSchedule(rec.srSchedule, normalized);
    return normalized;
  }

  // ---------- persistence ----------

  async persist() {
    this.state.updatedAt = nowIso();
    this._dirty = false;
    try {
      if (this.api) await this.api.saveState(this.state);
      else if (typeof localStorage !== 'undefined') localStorage.setItem('chunk-trainer-state', JSON.stringify(this.state));
      this.onSaved?.(this.state.updatedAt);
    } catch (error) {
      this._dirty = true;
      console.error('save failed', error);
      this.onSaved?.(null);
    }
  }

  async flush() {
    this.save.cancel();
    if (!this._dirty && this.loaded) return;
    await this.persist();
  }

  flushSync() {
    this.save.cancel();
    if (!this._dirty || !this.loaded) return;
    this.state.updatedAt = nowIso();
    this._dirty = false;
    try {
      if (this.api?.saveStateSync) this.api.saveStateSync(this.state);
      else if (typeof localStorage !== 'undefined') localStorage.setItem('chunk-trainer-state', JSON.stringify(this.state));
    } catch {}
  }

  touch() {
    this._dueCache = null;
    this._dirty = true;
    this.save();
    this.onChange?.();
  }

  setLibraryState(readSet, favSet) {
    this.state.library = {
      read: [...readSet],
      fav: [...favSet],
    };
    this.touch();
  }

  setSetting(key, value) {
    this.state.settings[key] = value;
    this.touch();
  }

  // ---------- records ----------

  record(id) {
    if (!this.state.chunks[id]) this.state.chunks[id] = emptyRecord();
    return this.state.chunks[id];
  }

  peek(id) {
    return this.state.chunks[id] || null;
  }

  chunk(id) {
    return this.byId.get(id) || null;
  }

  level(id) {
    return this.levelMap.get(id) || null;
  }

  levelOf(id) {
    return id ? id.split('-')[0] : null;
  }

  stageFlags(id) {
    const rec = this.peek(id);
    const chunk = this.chunk(id);
    const lv = this.levelOf(id);
    const gid = chunk?.groupId || (chunk ? getChunkGroupInfo(chunk, lv).groupId : null);
    const groupDone = gid ? this.isGroupVariationDone(gid) : false;
    return stageFlags(rec || emptyRecord(), groupDone);
  }

  stageDone(id, stageIndex) {
    return this.stageFlags(id)[stageIndex];
  }

  completedCount(id) {
    return this.stageFlags(id).filter(Boolean).length;
  }

  status(id) {
    const rec = this.peek(id);
    if (!rec) return 'new';
    if (rec.mastery?.done) return 'mastered';
    if (this.completedCount(id) > 0 || (rec.produce?.total || 0) > 0) return 'learning';
    return 'new';
  }

  sessionPhase(id) {
    const rec = this.peek(id);
    if (!rec) return { code: 'new', label: 'جديد', step: 1 };
    if (rec.mastery?.done) return { code: 'mastered', label: 'متقن ومراجعته مجدولة', step: 6 };
    const prodTotal = rec.produce?.total || 0;
    const batches = this.batchState(id);
    const doneBatches = batches.filter((b) => b.done).length;
    const nextBatch = batches.find((b) => !b.done);
    if (prodTotal >= 30) {
      return { code: 'all_sessions', label: '30/30 إنتاج مكتمل', step: 4 };
    }
    if (prodTotal >= 10) {
      if (nextBatch?.overdue) {
        return { code: 'session_due', label: `جلسة ${nextBatch.index + 1} مستحقة الآن`, step: 3 };
      }
      return { code: 'session1_done', label: `جلسة 1 تمت · (${doneBatches}/5 جلسات)`, step: 4 };
    }
    if (prodTotal > 0) {
      return { code: 'session1_prog', label: `جلسة 1 (${prodTotal}/10)`, step: 3 };
    }
    const currentStep = this.currentStep(id);
    if (currentStep > 1) {
      return { code: 'learning', label: `خطوة ${currentStep} من 4`, step: currentStep };
    }
    return { code: 'new', label: 'جديد', step: 1 };
  }

  currentStep(id) {
    const flags = this.stageFlags(id);
    if (!flags[0]) return 1;
    if (!flags[1]) return 2;
    if (!flags[2]) return 3;
    if (!flags[3]) return 4;
    const groupPos = this.getGroupPosition(id);
    if (groupPos && !groupPos.nextChunk && !flags[4]) {
      return 5;
    }
    return 4;
  }

  // ---------- day / stats ----------

  day(date = new Date()) {
    const key = dayKey(date);
    if (!this.state.days[key]) this.state.days[key] = { prod: 0, minutes: 0, reviews: 0, chunks: [] };
    return this.state.days[key];
  }

  today() {
    return this.day();
  }

  addProduction(id, amount) {
    const rec = this.record(id);
    const at = nowIso();
    rec.produce.log.push({ at, amount });
    rec.produce.total = rec.produce.log.reduce((sum, entry) => sum + entry.amount, 0);
    rec.lastAt = at;
    this.ensureSrSchedule(id, rec.produce.log[0]?.at || at);
    if (!this.day().chunks.includes(id)) this.day().chunks.push(id);
    this.day().prod += amount;
    this.touch();
    return rec.produce.total;
  }

  addExtraProduction(id, amount = 1) {
    return this.addProduction(id, amount);
  }

  batchState(id) {
    const rec = this.record(id);
    const log = rec.produce.log;
    const first = log[0]?.at ? new Date(log[0].at) : null;
    const allDone = (rec.produce.total || 0) >= 30;
    return PRODUCE_PLAN.map((plan, index) => {
      const entry = log[index];
      const due = first ? addHours(first, plan.hours) : null;
      return {
        ...plan,
        index,
        entry,
        done: Boolean(entry) || allDone,
        due,
        isNext: !entry && !allDone && (index === 0 ? true : Boolean(log[index - 1])),
        overdue: Boolean(due && !entry && due <= new Date()),
      };
    });
  }

  nextBatch(id) {
    return this.batchState(id).find((batch) => !batch.done) || null;
  }

  addVariation(id, axis, text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    const rec = this.record(id);
    rec.vary.items.push({ axis, text: clean, at: nowIso() });
    rec.vary.at = nowIso();
    rec.test.variation.count = Math.max(rec.test.variation.count, rec.vary.items.length);
    if (rec.vary.items.length >= 5) rec.test.variation.at = rec.test.variation.at || nowIso();
    rec.lastAt = nowIso();
    if (!this.day().chunks.includes(id)) this.day().chunks.push(id);

    // Sync to group
    const chunk = this.chunk(id);
    const lv = this.levelOf(id);
    const gid = chunk?.groupId || (chunk ? getChunkGroupInfo(chunk, lv).groupId : null);
    if (gid) {
      const grp = this.getGroupRecord(gid);
      const exists = grp.variations.some((v) => v.text.trim().toLowerCase() === clean.toLowerCase());
      if (!exists) {
        grp.variations.push({ axis, text: clean, at: nowIso() });
        grp.at = nowIso();
        if (grp.variations.length >= 5) grp.done = true;
      }
    }

    this.touch();
  }

  removeVariation(id, index) {
    const rec = this.record(id);
    rec.vary.items.splice(index, 1);
    rec.test.variation.count = rec.vary.items.length;
    this.touch();
  }

  variationCoverage(id) {
    const rec = this.record(id);
    const chunk = this.chunk(id);
    const axes = new Set((rec.vary?.items || []).map((item) => item.axis));
    const lv = this.levelOf(id);
    const gid = chunk?.groupId || (chunk ? getChunkGroupInfo(chunk, lv).groupId : null);
    if (gid) {
      const groupVars = this.getGroupVariations(gid);
      for (const gv of groupVars) {
        if (gv.axis) axes.add(gv.axis);
      }
    }
    return VARIATION_AXES.filter((axis) => axes.has(axis.key)).length;
  }

  siblings(id, limit = 4) {
    const chunk = this.chunk(id);
    if (!chunk?.family) return [];
    const level = this.level(chunk.level);
    return level.chunks
      .filter((c) => c.family === chunk.family && c.id !== id)
      .slice(0, limit);
  }

  // ---------- chunk groups & template packs ----------

  getGroupRecord(groupId) {
    if (!this.state.groups) this.state.groups = {};
    if (!this.state.groups[groupId]) {
      this.state.groups[groupId] = { variations: [], done: false, at: null };
    }
    return this.state.groups[groupId];
  }

  isGroupVariationDone(groupId) {
    const rec = this.state.groups?.[groupId];
    if (!rec) return false;
    return Boolean(rec.done || (rec.variations?.length || 0) >= 5);
  }

  getGroupVariations(groupId) {
    return this.state.groups?.[groupId]?.variations || [];
  }

  addGroupVariation(groupId, axis, text) {
    const clean = String(text || '').trim();
    if (!clean) return 0;
    const rec = this.getGroupRecord(groupId);
    const exists = rec.variations.some((v) => v.text.trim().toLowerCase() === clean.toLowerCase());
    if (!exists) {
      rec.variations.push({ axis: axis || 'words', text: clean, at: nowIso() });
      rec.at = nowIso();
    }
    if (rec.variations.length >= 5) {
      rec.done = true;
    }
    this.touch();
    return rec.variations.length;
  }

  removeGroupVariation(groupId, index) {
    const rec = this.getGroupRecord(groupId);
    rec.variations.splice(index, 1);
    rec.done = rec.variations.length >= 5;
    this.touch();
  }

  setGroupVariationDone(groupId, done = true) {
    const rec = this.getGroupRecord(groupId);
    rec.done = Boolean(done);
    rec.at = nowIso();
    this.touch();
  }

  getGroups(levelId) {
    const level = this.level(levelId);
    if (!level) return [];
    const map = new Map();
    for (const chunk of level.chunks) {
      const gid = chunk.groupId;
      if (!map.has(gid)) {
        map.set(gid, {
          id: gid,
          levelId,
          title: chunk.groupTitle,
          key: chunk.groupKey,
          chunks: [],
        });
      }
      map.get(gid).chunks.push(chunk);
    }
    const list = [];
    for (const grp of map.values()) {
      let masteredCount = 0;
      let learningCount = 0;
      for (const c of grp.chunks) {
        const st = this.status(c.id);
        if (st === 'mastered') masteredCount++;
        else if (st === 'learning') learningCount++;
      }
      const total = grp.chunks.length;
      const isMastered = total > 0 && masteredCount === total;
      const firstUnfinished =
        grp.chunks.find((c) => this.status(c.id) === 'learning') ||
        grp.chunks.find((c) => this.status(c.id) !== 'mastered') ||
        grp.chunks[0];
      const varDone = this.isGroupVariationDone(grp.id);
      const varCount = this.getGroupVariations(grp.id).length;
      const uniqueTemplates = Array.from(
        new Set(
          grp.chunks
            .map((c) => c.template || c.patternKey || (c.family ? c.family.split(':')[1] : null) || c.de.split(/\s+/).slice(0, 2).join(' '))
            .filter(Boolean),
        ),
      );
      const anchorChunk = grp.chunks.find((c) => c.isAnchor) || grp.chunks[0];
      const groupNum = grp.chunks[0]?.groupNumber || parseInt(grp.id.split('::group-')[1], 10) || 1;

      list.push({
        ...grp,
        number: groupNum,
        total,
        masteredCount,
        learningCount,
        freshCount: total - masteredCount - learningCount,
        isMastered,
        pct: Math.round((masteredCount / total) * 100),
        firstUnfinished,
        variationDone: varDone,
        variationCount: varCount,
        uniqueTemplatesCount: uniqueTemplates.length,
        templates: uniqueTemplates,
        anchorChunk,
        isCapstone: Boolean(grp.chunks[0]?.isCapstone),
      });
    }
    return list;
  }

  getGroup(groupId) {
    const [levelId] = String(groupId || '').split('::');
    const groups = this.getGroups(levelId);
    return groups.find((g) => g.id === groupId) || null;
  }

  getGroupForChunk(chunkId) {
    const chunk = this.chunk(chunkId);
    if (!chunk) return null;
    const groups = this.getGroups(chunk.level);
    return groups.find((g) => g.id === chunk.groupId) || null;
  }

  getGroupPosition(chunkId) {
    const chunk = this.chunk(chunkId);
    if (!chunk) return null;
    const group = this.getGroupForChunk(chunkId);
    if (!group) return null;
    const index = group.chunks.findIndex((c) => c.id === chunkId);
    const prevChunk = index > 0 ? group.chunks[index - 1] : null;
    const nextChunk = index >= 0 && index < group.chunks.length - 1 ? group.chunks[index + 1] : null;
    return {
      group,
      index,
      position: index + 1,
      total: group.total,
      prevChunk,
      nextChunk,
    };
  }

  // ---------- tests & mastery ----------

  setUnderstand(id, patch) {
    Object.assign(this.record(id).understand, patch, { done: true, at: nowIso() });
    this.touch();
  }

  toggleUnderstandCheck(id, key) {
    const rec = this.record(id);
    rec.understand.checks = { ...(rec.understand.checks || {}), [key]: !rec.understand.checks?.[key] };
    rec.lastAt = nowIso();
    this.touch();
  }

  setUnderstandFunc(id, func) {
    const rec = this.record(id);
    rec.understand.func = rec.understand.func === func ? null : func;
    rec.lastAt = nowIso();
    this.touch();
  }

  finishUnderstand(id) {
    const rec = this.record(id);
    rec.understand.done = true;
    rec.understand.at = nowIso();
    rec.lastAt = nowIso();
    this.ensureSrSchedule(id, rec.understand.at);
    this.touch();
  }

  note(id, text) {
    this.record(id).notes = String(text || '');
    this.save();
  }

  setSpeakPass(id, key, value) {
    const rec = this.record(id);
    rec.speak.passes[key] = Boolean(value);
    if (rec.speak.passes.slow && rec.speak.passes.natural && rec.speak.passes.blind) {
      rec.speak.at = rec.speak.at || nowIso();
    }
    if (value) rec.speak.count += 1;
    rec.lastAt = nowIso();
    this.touch();
  }

  setSprint(id, count) {
    const rec = this.record(id);
    rec.test.sprint = { count, at: nowIso() };
    this.day().chunks = [...new Set([...this.day().chunks, id])];
    this.touch();
  }

  setSpeaking(id, seconds, note = '') {
    const rec = this.record(id);
    rec.test.speaking = { seconds, at: nowIso(), note };
    this.touch();
  }

  setRecall(id, score, total = 5) {
    const rec = this.record(id);
    rec.test.recall = { score, total, at: nowIso(), passed: score >= 4 };
    this.touch();
    return rec.test.recall.passed;
  }

  setDelayed(id, passed, score = 0) {
    const rec = this.record(id);
    rec.test.delayed = { passed, at: nowIso(), score };
    this.touch();
  }

  delayedDue(id) {
    const rec = this.peek(id);
    if (!rec || rec.test?.delayed?.passed) return null;
    const refAt = rec.mastery?.at || rec.vary?.at || rec.test?.recall?.at || rec.lastAt;
    if (!refAt) return null;
    return addDays(new Date(refAt), 7);
  }

  delayedReady(id) {
    const due = this.delayedDue(id);
    return Boolean(due && due <= new Date());
  }

  masteryReady(id) {
    const flags = this.stageFlags(id);
    return Boolean(flags[0] && flags[1] && flags[2] && flags[3]);
  }

  completeMastery(id) {
    const rec = this.record(id);
    if (!this.masteryReady(id)) return false;
    rec.mastery = { done: true, at: nowIso() };
    rec.review = { due: addDays(new Date(), 3).toISOString(), interval: 3, reps: 1, lastGrade: 'good', lastAt: nowIso() };
    this.ensureSrSchedule(id, rec.mastery.at);
    this.touch();
    return true;
  }

  gradeReview(id, grade) {
    const rec = this.record(id);
    const previous = rec.review.interval || 1;
    const nextInterval =
      grade === 'again' ? 1 : clamp(Math.round(previous * (grade === 'hard' ? 1.4 : 2.3)), 1, 180);
    rec.review = {
      due: addDays(new Date(), nextInterval).toISOString(),
      interval: nextInterval,
      reps: (rec.review.reps || 1) + 1,
      lastGrade: grade,
      lastAt: nowIso(),
    };
    this.state.reviews.unshift({ id, grade, at: nowIso(), interval: nextInterval });
    this.state.reviews = this.state.reviews.slice(0, 400);
    this.day().reviews += 1;
    this.touch();
  }

  ensureSrSchedule(id, baseDate = null) {
    const rec = this.record(id);
    if (!rec.srSchedule) {
      delete rec.srOptOut;
      const base = baseDate || rec.produce?.log?.[0]?.at || rec.lastAt || nowIso();
      rec.srSchedule = createInitialSrSchedule(base);
      this.touch();
    }
    return rec.srSchedule;
  }

  enrollSrSchedule(id) {
    const rec = this.record(id);
    delete rec.srOptOut;
    rec.srSchedule = createInitialSrSchedule(nowIso());
    this._dueCache = null;
    this.touch();
    return rec.srSchedule;
  }

  cancelSrSchedule(id) {
    const rec = this.record(id);
    rec.srSchedule = null;
    rec.srOptOut = true;
    this._dueCache = null;
    this.touch();
    return true;
  }

  getSrCardInfo(id) {
    const rec = this.peek(id);
    const sch = rec?.srSchedule;
    if (!sch || rec?.srOptOut) return { enrolled: false };
    const now = Date.now();
    const nextDueMs = sch.nextReviewAt ? new Date(sch.nextReviewAt).getTime() : null;
    const isDue = nextDueMs !== null && now >= nextDueMs;
    const isCompleted = sch.currentStage >= 5;
    const stageInfo = SR_INTERVALS.find((i) => i.stage === sch.currentStage) || {
      stage: 5,
      label: 'مكتملة بالكامل',
      shortLabel: 'مكتملة',
      sub: 'تمت جميع المراجعات الأربع',
    };
    return {
      enrolled: true,
      isDue,
      isCompleted,
      currentStage: sch.currentStage,
      stageInfo,
      countdown: formatCountdown(sch.nextReviewAt).text,
      nextReviewAt: sch.nextReviewAt,
    };
  }

  completeSrStage(id, grade = 'good') {
    const rec = this.record(id);
    const sch = this.ensureSrSchedule(id);
    const now = nowIso();
    const stageIndex = sch.stages.findIndex((s) => s.stage === sch.currentStage && !s.done);

    if (grade === 'again') {
      if (stageIndex >= 0) {
        // Reset scheduled time for this stage to now + 4 hours
        const retryAt = addHours(new Date(), 4).toISOString();
        sch.stages[stageIndex].scheduledAt = retryAt;
        sch.nextReviewAt = retryAt;
        sch.notifiedStage = Math.max(0, sch.currentStage - 1);
      }
      sch.lastReviewedAt = now;
    } else {
      // 'good' or 'hard'
      if (stageIndex >= 0) {
        sch.stages[stageIndex].done = true;
        sch.stages[stageIndex].completedAt = now;
        sch.lastReviewedAt = now;
        const nextUndone = sch.stages.find((s) => !s.done);
        if (nextUndone) {
          sch.currentStage = nextUndone.stage;
          const intervalHours = grade === 'hard' ? Math.round(nextUndone.hours * 0.7) : nextUndone.hours;
          const minScheduled = addHours(new Date(), intervalHours).toISOString();
          if (new Date(nextUndone.scheduledAt) < new Date(minScheduled)) {
            nextUndone.scheduledAt = minScheduled;
          }
          sch.nextReviewAt = nextUndone.scheduledAt;

          // Cascade forward to subsequent stages
          let cascadeRef = new Date(nextUndone.scheduledAt);
          for (let i = stageIndex + 1; i < sch.stages.length; i++) {
            const s = sch.stages[i];
            if (!s.done && s.stage > nextUndone.stage) {
              const minNext = addHours(cascadeRef, s.hours).toISOString();
              if (new Date(s.scheduledAt) < new Date(minNext)) {
                s.scheduledAt = minNext;
              }
              cascadeRef = new Date(s.scheduledAt);
            }
          }
        } else {
          sch.currentStage = 5;
          sch.nextReviewAt = null;
          sch.notifiedStage = 5;
        }
      }
    }

    this.gradeReview(id, grade);
    this.touch();
    return sch;
  }

  getScheduleRows() {
    const rows = [];
    const now = Date.now();
    for (const [id, rec] of Object.entries(this.state.chunks)) {
      if (!rec) continue;
      const chunk = this.chunk(id);
      if (!chunk) continue;
      const hasActivity = (rec.produce?.total || 0) > 0 || rec.mastery?.done || rec.understand?.done || rec.srSchedule;
      if (!hasActivity) continue;

      const sch = rec.srSchedule || this.ensureSrSchedule(id);
      if (!sch) continue;

      const nextDueMs = sch.nextReviewAt ? new Date(sch.nextReviewAt).getTime() : null;
      const isDue = nextDueMs !== null && now >= nextDueMs;
      const countdown = formatCountdown(sch.nextReviewAt);
      const stageInfo = SR_INTERVALS.find((i) => i.stage === sch.currentStage) || {
        stage: 5,
        label: 'مكتملة بالكامل',
        shortLabel: 'مكتملة',
        sub: 'تمت جميع المراجعات الأربع',
      };

      rows.push({
        id,
        chunk,
        record: rec,
        schedule: sch,
        currentStage: sch.currentStage,
        stageInfo,
        nextReviewAt: sch.nextReviewAt,
        formattedNextDate: sch.nextReviewAt ? formatExactDateTime(sch.nextReviewAt) : 'أتمت كل المراجعات ✅',
        isDue,
        countdown,
        stages: sch.stages.map((s) => ({
          ...s,
          formattedScheduled: formatExactDateTime(s.scheduledAt),
          formattedCompleted: s.completedAt ? formatExactDateTime(s.completedAt) : null,
        })),
      });
    }

    rows.sort((a, b) => {
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      if (a.nextReviewAt && !b.nextReviewAt) return -1;
      if (!a.nextReviewAt && b.nextReviewAt) return 1;
      if (a.nextReviewAt && b.nextReviewAt) {
        return new Date(a.nextReviewAt) - new Date(b.nextReviewAt);
      }
      return 0;
    });

    return rows;
  }

  // ---------- navigation ----------

  setPointer(chunkId, step = 1) {
    const levelId = this.levelOf(chunkId);
    this.state.pointer = { levelId, chunkId, step: clamp(step, 1, 6), at: nowIso() };
    this.touch();
  }

  pointer() {
    return this.state.pointer;
  }

  firstUnfinishedPointer() {
    for (const level of this.levels) {
      for (const chunk of level.chunks) {
        if (this.status(chunk.id) !== 'mastered' && this.peek(chunk.id)) {
          return { levelId: level.id, chunkId: chunk.id, step: this.currentStep(chunk.id), at: nowIso() };
        }
      }
    }
    return { levelId: 'A1', chunkId: 'A1-001', step: 1, at: nowIso() };
  }

  upNext(preferredLevel = null) {
    const pointer = this.state.pointer;
    if (pointer && this.status(pointer.chunkId) !== 'mastered') {
      return { ...pointer, step: clamp(pointer.step || 1, 1, 6) };
    }
    const order = preferredLevel
      ? [this.level(preferredLevel), ...this.levels.filter((l) => l.id !== preferredLevel)]
      : this.levels;
    for (const level of order) {
      if (!level) continue;
      const started = level.chunks.find((chunk) => this.status(chunk.id) === 'learning');
      if (started) return { levelId: level.id, chunkId: started.id, step: this.currentStep(started.id), at: nowIso() };
    }
    for (const level of order) {
      if (!level) continue;
      const fresh = level.chunks.find((chunk) => this.status(chunk.id) === 'new');
      if (fresh) return { levelId: level.id, chunkId: fresh.id, step: 1, at: nowIso() };
    }
    return { levelId: order[0]?.id || 'A1', chunkId: `${order[0]?.id || 'A1'}-001`, step: 1, at: nowIso() };
  }

  dueItems() {
    if (this._dueCache && this._dueCacheAt && Date.now() - this._dueCacheAt < 15000) return this._dueCache;
    const out = [];
    const now = new Date();
    for (const level of this.levels) {
      for (const chunk of level.chunks) {
        const rec = this.peek(chunk.id);
        if (!rec) continue;
        if (rec.srSchedule?.nextReviewAt && new Date(rec.srSchedule.nextReviewAt) <= now) {
          out.push({
            id: chunk.id,
            levelId: level.id,
            type: 'review',
            due: rec.srSchedule.nextReviewAt,
            interval: rec.review?.interval || 1,
            srStage: rec.srSchedule.currentStage,
          });
          continue;
        }
        if (rec.mastery?.done) {
          if (rec.review?.due && dayStart(new Date(rec.review.due)) <= dayStart(now)) {
            out.push({ id: chunk.id, levelId: level.id, type: 'review', due: rec.review.due, interval: rec.review.interval });
          }
          continue;
        }
        const next = this.nextBatch(chunk.id);
        if (next?.due && next.due <= now) {
          out.push({ id: chunk.id, levelId: level.id, type: 'produce', due: next.due.toISOString(), amount: next.amount });
        }
        const flags = stageFlags(rec);
        if (flags[3] && !rec.test?.delayed?.passed) {
          const due = this.delayedDue(chunk.id);
          if (due && due <= now) {
            out.push({ id: chunk.id, levelId: level.id, type: 'delayed', due: due.toISOString() });
          }
        }
      }
    }
    const weight = { review: 0, delayed: 1, produce: 2 };
    out.sort((a, b) => weight[a.type] - weight[b.type] || new Date(a.due) - new Date(b.due));
    this._dueCache = out;
    this._dueCacheAt = Date.now();
    this._dueDay = dayKey();
    return out;
  }

  levelStats(levelId) {
    const level = this.level(levelId);
    if (!level) return { total: 0, mastered: 0, learning: 0, fresh: 0, due: 0, stageTotal: 0, stageDone: 0 };
    const due = this.dueItems().filter((item) => item.levelId === levelId).length;
    let mastered = 0;
    let learning = 0;
    let stageDone = 0;
    for (const chunk of level.chunks) {
      const status = this.status(chunk.id);
      if (status === 'mastered') mastered += 1;
      else if (status === 'learning') learning += 1;
      stageDone += this.completedCount(chunk.id);
    }
    return {
      total: level.count,
      mastered,
      learning,
      fresh: level.count - mastered - learning,
      due,
      stageDone,
      stageTotal: level.count * 6,
      pct: Math.round((mastered / level.count) * 100),
    };
  }

  overall() {
    let mastered = 0;
    let learning = 0;
    let productions = 0;
    for (const level of this.levels) {
      const stats = this.levelStats(level.id);
      mastered += stats.mastered;
      learning += stats.learning;
    }
    for (const rec of Object.values(this.state.chunks)) {
      productions += rec.produce?.total || 0;
    }
    const totals = Object.values(this.state.days).reduce(
      (acc, day) => {
        acc.minutes += day.minutes || 0;
        acc.reviews += day.reviews || 0;
        return acc;
      },
      { minutes: 0, reviews: 0 },
    );
    return {
      total: this.data.total,
      mastered,
      learning,
      fresh: this.data.total - mastered - learning,
      streak: this.streak(),
      due: this.dueItems().length,
      productions,
      minutes: Math.round(totals.minutes),
      reviews: totals.reviews,
      todayProd: this.today().prod,
      todayGoal: this.state.settings.dailyGoal,
    };
  }

  streak() {
    const hasActivity = (key) => {
      const day = this.state.days[key];
      return Boolean(day && (day.prod > 0 || day.minutes > 0.5 || day.reviews > 0));
    };
    let cursor = dayStart();
    let count = 0;
    if (!hasActivity(dayKey(cursor))) cursor = addDays(cursor, -1);
    while (hasActivity(dayKey(cursor)) && count < 4000) {
      count += 1;
      cursor = addDays(cursor, -1);
    }
    return count;
  }

  heartbeat(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const day = this.day();
    day.minutes = (day.minutes || 0) + seconds / 60;
    this.save();
  }

  lastChunkSeconds(id) {
    return this.peek(id)?.seconds || 0;
  }

  activity(limit = 8) {
    const rows = [];
    for (const [id, rec] of Object.entries(this.state.chunks)) {
      if (rec.lastAt) rows.push({ id, at: rec.lastAt, status: this.status(id) });
    }
    return rows.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
  }

  recentVariations(limit = 6) {
    const all = [];
    for (const [id, rec] of Object.entries(this.state.chunks)) {
      for (const item of rec.vary?.items || []) all.push({ id, ...item });
    }
    return all.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
  }

  // ---------- legacy import ----------

  importLegacyProgress(notify = true) {
    const stamp = nowIso();
    let count = 0;
    let stages = 0;
    for (const level of this.data.levels) {
      for (const chunk of level.chunks) {
        if (!chunk.stages?.length) continue;
        const rec = this.record(chunk.id);
        rec.imported = [...new Set([...(rec.imported || []), ...chunk.stages])];
        rec.understand.done = true;
        rec.understand.at = rec.understand.at || stamp;
        rec.speak.passes = { slow: true, natural: true, blind: true };
        rec.speak.at = rec.speak.at || stamp;
        for (const stage of chunk.stages) {
          stages += 1;
          if (stage === 'produce' && rec.produce.total < 30) {
            rec.produce.log = [{ at: stamp, amount: 30, imported: true }];
            rec.produce.total = 30;
          }
          if (stage === 'recall') rec.test.recall = { score: 5, total: 5, at: stamp, passed: true };
          if (stage === 'variation') {
            rec.vary.importedDone = true;
            rec.test.variation = { count: 5, at: stamp };
          }
          if (stage === 'sprint') rec.test.sprint = { count: 5, at: stamp };
          if (stage === 'speaking') rec.test.speaking = { seconds: 30, at: stamp, note: '' };
          if (stage === 'delayed') rec.test.delayed = { passed: true, at: stamp, score: 5 };
        }
        if (chunk.stages.length === 6 && !rec.mastery.done) {
          rec.mastery = { done: true, at: stamp };
          rec.review = {
            due: addDays(new Date(), 3).toISOString(),
            interval: 3,
            reps: 1,
            lastGrade: 'good',
            lastAt: stamp,
          };
        }
        count += 1;
      }
    }
    this.state.meta.importedObsidian = true;
    this.state.meta.importedAt = stamp;
    this.state.meta.importedCount = count;
    this.state.meta.importedStages = stages;
    this.save();
    return { count, stages };
  }

  // ---------- data reset / transfer ----------

  async exportData() {
    if (!this.api) return { ok: false };
    await this.flush();
    return this.api.exportState();
  }

  async importData() {
    if (!this.api) return { ok: false };
    const result = await this.api.importState();
    if (result.ok) {
      this.state = this.normalize(result.state);
      this.onChange?.();
    }
    return result;
  }

  async resetAll() {
    const keepSettings = { ...this.state.settings };
    const fresh = defaultState();
    fresh.settings = keepSettings;
    this.state = fresh;
    if (this.api) await this.api.resetState();
    this.state.meta.importedObsidian = true;
    this.state.pointer = { levelId: 'A1', chunkId: 'A1-001', step: 1, at: nowIso() };
    await this.flush();
    this.onChange?.();
  }

  axisTitle(axis) {
    return AXIS_TITLE[axis] || axis;
  }
}

export const store = new Store();
