// Goals v2: one goal model and progress engine shared by web and mobile.
// Everything here is pure (no storage, no React) so both clients compute the
// same numbers from the same data. Numbers shown to users must come from real
// entries or linked module data — never from invented estimates.

export const GOAL_SCHEMA_VERSION = 2;

export const GOAL_TYPES = ['accumulate', 'payoff', 'increase', 'decrease', 'consistency', 'milestone', 'binary', 'composite'];
export const NUMERIC_GOAL_TYPES = ['accumulate', 'payoff', 'increase', 'decrease', 'consistency'];
export const GOAL_STATUSES = ['active', 'paused', 'completed', 'archived'];
export const GOAL_CHECKPOINTS = [10, 25, 50, 75, 90, 100];

// Labels are Indonesian source copy; clients translate them with translateCopy.
export const GOAL_TYPE_INFO = {
  accumulate: { label: 'Kumpulkan dana', hint: 'Tabungan, dana darurat, DP rumah', unit: 'IDR', category: 'finance' },
  payoff: { label: 'Lunasi utang', hint: 'Cicilan, kartu kredit, pinjaman', unit: 'IDR', category: 'finance' },
  increase: { label: 'Naikkan angka', hint: 'Buku dibaca, km lari, jam belajar', unit: 'times', category: 'personal' },
  decrease: { label: 'Turunkan angka', hint: 'Berat badan, screen time', unit: 'kg', category: 'health' },
  consistency: { label: 'Konsistensi', hint: 'Jumlah hari menjalankan kebiasaan', unit: 'day', category: 'health' },
  milestone: { label: 'Tahapan', hint: 'Proyek dengan langkah-langkah', unit: 'custom', category: 'personal' },
  binary: { label: 'Sekali capai', hint: 'Lulus, dapat SIM, liburan impian', unit: 'custom', category: 'personal' },
  composite: { label: 'Gabungan', hint: 'Rata-rata dari beberapa tujuan', unit: 'custom', category: 'personal' },
};

export const GOAL_UNITS = [
  { id: 'IDR', label: 'Rupiah', short: 'Rp', shortEn: 'Rp', money: true },
  { id: 'kg', label: 'Kilogram', short: 'kg', shortEn: 'kg' },
  { id: 'km', label: 'Kilometer', short: 'km', shortEn: 'km' },
  { id: 'book', label: 'Buku', short: 'buku', shortEn: 'books' },
  { id: 'hour', label: 'Jam', short: 'jam', shortEn: 'hrs' },
  { id: 'day', label: 'Hari', short: 'hari', shortEn: 'days' },
  { id: 'times', label: 'Kali', short: 'kali', shortEn: 'times' },
  { id: 'custom', label: 'Lainnya', short: '', shortEn: '' },
];

// Sources that can feed a goal automatically from other Whenya modules.
export const GOAL_SOURCES = {
  manual: { label: 'Catat manual', types: NUMERIC_GOAL_TYPES },
  habit: { label: 'Kebiasaan', types: ['consistency', 'increase'] },
  reading: { label: 'Buku selesai dibaca', types: ['increase'], unit: 'book' },
  pomodoro: { label: 'Jam fokus Pomodoro', types: ['increase'], unit: 'hour' },
  workouts: { label: 'Jumlah workout', types: ['increase', 'consistency'], unit: 'times' },
  weight: { label: 'Berat badan', types: ['decrease', 'increase'], unit: 'kg' },
  finance_category: { label: 'Kategori transaksi', types: ['accumulate', 'payoff'], unit: 'IDR' },
  finance_net: { label: 'Selisih pemasukan dan pengeluaran', types: ['accumulate'], unit: 'IDR' },
};

const DAY_MS = 86400000;
const STATUS_URGENCY = { at_risk: 0, overdue: 1, behind: 2, on_track: 3, no_deadline: 4, ahead: 5, paused: 8, completed: 9 };

// ===== Date helpers (device-local calendar dates) =====
export function toLocalDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

function dateKey(value) {
  const d = parseLocalDate(value);
  return d ? toLocalDate(d) : '';
}

export function daysBetween(from, to) {
  const a = parseLocalDate(from), b = parseLocalDate(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function addDays(date, days) {
  const d = parseLocalDate(date) || new Date();
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function addMonths(date, months) {
  const d = parseLocalDate(date) || new Date();
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return toLocalDate(d);
}

/**
 * Monday-based week key, e.g. 2026-W43.
 * @param {Date | string} [date]
 */
export function weekKey(date = new Date()) {
  const d = parseLocalDate(date) || new Date();
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** @param {Date | string} [date] */
export function startOfWeek(date = new Date()) {
  const d = parseLocalDate(date) || new Date();
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toLocalDate(d);
}

// ===== Number helpers =====
function num(value, fallback = 0) {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Parses friendly amount input: "100jt", "1,5 juta", "500rb", "2M", "1.250.000", "72.5".
 * Returns NaN when the text is not a number.
 */
export function parseGoalAmount(input) {
  if (typeof input === 'number') return input;
  const raw = String(input || '').trim().toLowerCase().replace(/^rp\.?\s*/, '').replace(/\s+/g, '');
  if (!raw) return NaN;
  const match = /^(-?[\d.,]+)(jt|juta|rb|ribu|k|m|miliar|milyar|b)?$/.exec(raw);
  if (!match) return NaN;
  let digits = match[1];
  const suffix = match[2] || '';
  const dots = (digits.match(/\./g) || []).length;
  const commas = (digits.match(/,/g) || []).length;
  if (dots > 1 || (dots === 1 && commas === 0 && /\.\d{3}$/.test(digits) && suffix === '')) digits = digits.replace(/\./g, '');
  if (commas > 1) digits = digits.replace(/,/g, '');
  if (dots >= 1 && commas === 1) digits = digits.replace(/\./g, '').replace(',', '.');
  digits = digits.replace(',', '.');
  const base = Number(digits);
  if (!Number.isFinite(base)) return NaN;
  const multiplier = { jt: 1e6, juta: 1e6, rb: 1e3, ribu: 1e3, k: 1e3, m: 1e9, miliar: 1e9, milyar: 1e9, b: 1e9 }[suffix] || 1;
  return Math.round(base * multiplier * 100) / 100;
}

export function getGoalUnit(unitId) {
  return GOAL_UNITS.find(unit => unit.id === unitId) || GOAL_UNITS[GOAL_UNITS.length - 1];
}

/** Formats a goal value. `translate` lets clients localise unit words. */
export function formatGoalValue(value, unitId, language = 'id', translate) {
  const unit = getGoalUnit(unitId);
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const n = num(value);
  if (unit.money) return new Intl.NumberFormat(locale, { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.round(n));
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: Math.abs(n) < 100 ? 1 : 0 }).format(n);
  if (!unit.short) return formatted;
  const unitLabel = translate ? translate(unit.short) : (language === 'id' ? unit.short : (unit.shortEn || unit.short));
  return `${formatted} ${unitLabel}`;
}

/** Short money format for tight spaces: Rp 37,4 jt / Rp 950 rb. */
export function formatCompactValue(value, unitId, language = 'id', translate) {
  const unit = getGoalUnit(unitId);
  if (!unit.money) return formatGoalValue(value, unitId, language, translate);
  const n = Math.abs(num(value));
  const sign = num(value) < 0 ? '-' : '';
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  const fmt = (v) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(v);
  const suffix = (idLabel, enLabel) => (translate ? translate(idLabel) : (language === 'id' ? idLabel : enLabel));
  if (n >= 1e9) return `${sign}Rp ${fmt(n / 1e9)} ${suffix('M', 'B')}`;
  if (n >= 1e6) return `${sign}Rp ${fmt(n / 1e6)} ${suffix('jt', 'M')}`;
  if (n >= 1e3) return `${sign}Rp ${fmt(n / 1e3)} ${suffix('rb', 'k')}`;
  return `${sign}Rp ${fmt(n)}`;
}

// ===== Category (kept compatible with v1 data) =====
export function normalizeGoalCategory(category) {
  if (!category) return 'personal';
  const clean = String(category).trim().toLowerCase().replace(/^cat_/, '');
  if (['personal', 'pribadi'].includes(clean)) return 'personal';
  if (['career', 'karir', 'kerja', 'pekerjaan', 'work', 'bisnis', 'business'].includes(clean)) return 'career';
  if (['finance', 'keuangan', 'finansial'].includes(clean)) return 'finance';
  if (['health', 'kesehatan', 'kebugaran', 'fitness'].includes(clean)) return 'health';
  if (['education', 'edukasi', 'pendidikan', 'belajar', 'study'].includes(clean)) return 'education';
  if (['relationship', 'hubungan', 'keluarga', 'family', 'sosial', 'social'].includes(clean)) return 'relationship';
  if (['other', 'lainnya', 'lain'].includes(clean)) return 'other';
  return clean;
}

// ===== Migration v1 -> v2 =====
function normalizeMilestones(raw) {
  const list = Array.isArray(raw.milestones) ? raw.milestones
    : Array.isArray(raw.journey) ? raw.journey.map(step => ({ id: step.id, text: step.text, done: !!step.completed, doneAt: step.doneAt }))
      : [];
  return list
    .filter(item => item && String(item.text || '').trim())
    .map(item => ({
      id: item.id || makeId(),
      text: String(item.text).trim(),
      done: !!(item.done ?? item.completed),
      weight: Math.max(1, num(item.weight, 1)),
      doneAt: item.done || item.completed ? (item.doneAt || null) : null,
    }));
}

function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(entry => entry && Number.isFinite(num(entry.amount, NaN)) && dateKey(entry.date))
    .map(entry => ({
      id: entry.id || makeId(),
      date: dateKey(entry.date),
      kind: entry.kind === 'set' ? 'set' : 'add',
      amount: num(entry.amount),
      note: entry.note ? String(entry.note) : '',
      createdAt: entry.createdAt || new Date().toISOString(),
    }));
}

function normalizeSource(source) {
  if (!source || typeof source !== 'object' || !GOAL_SOURCES[source.kind]) return { kind: 'manual' };
  const clean = { kind: source.kind };
  if (source.kind === 'habit') clean.habitId = source.habitId ? String(source.habitId) : '';
  if (source.kind === 'finance_category') {
    clean.category = source.category ? String(source.category) : '';
    clean.txType = ['income', 'expense'].includes(source.txType) ? source.txType : 'any';
  }
  return clean;
}

export function isLinkedGoal(goal) {
  return !!goal?.source && goal.source.kind !== 'manual';
}

/** Converts any stored goal (v1 web, v1 mobile or v2) into the v2 shape. */
export function migrateGoal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = GOAL_TYPES.includes(raw.type) ? raw.type : 'milestone';
  const info = GOAL_TYPE_INFO[type];
  const milestones = normalizeMilestones(raw);
  const status = GOAL_STATUSES.includes(raw.status) ? raw.status
    : raw.archived ? 'archived' : raw.completed ? 'completed' : 'active';
  const targetDate = dateKey(raw.targetDate || raw.deadline);
  const createdAt = raw.createdAt || new Date().toISOString();
  const startDate = dateKey(raw.startDate) || dateKey(createdAt) || toLocalDate();
  const isNumeric = NUMERIC_GOAL_TYPES.includes(type);
  const startValue = isNumeric ? num(raw.startValue, type === 'consistency' ? 0 : 0) : 0;
  const targetValue = isNumeric ? num(raw.targetValue, 0) : 100;
  const source = normalizeSource(raw.source);

  const goal = {
    ...raw,
    schemaVersion: GOAL_SCHEMA_VERSION,
    id: raw.id || makeId(),
    title: String(raw.title || '').trim(),
    description: raw.description ? String(raw.description) : '',
    why: raw.why ? String(raw.why) : '',
    identity: raw.identity ? String(raw.identity) : '',
    category: normalizeGoalCategory(raw.category || info.category),
    type,
    unit: raw.unit && GOAL_UNITS.some(unit => unit.id === raw.unit) ? raw.unit : info.unit,
    startValue,
    targetValue,
    startDate,
    targetDate,
    status,
    pinned: !!raw.pinned,
    parentId: raw.parentId || null,
    milestones,
    entries: normalizeEntries(raw.entries),
    source,
    celebrated: Array.isArray(raw.celebrated) ? raw.celebrated.filter(cp => GOAL_CHECKPOINTS.includes(cp)) : [],
    reviews: Array.isArray(raw.reviews) ? raw.reviews.filter(r => r && r.week).slice(-52) : [],
    futureLetter: raw.futureLetter && String(raw.futureLetter.text || '').trim()
      ? { text: String(raw.futureLetter.text), writtenAt: raw.futureLetter.writtenAt || createdAt }
      : null,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
    completedAt: status === 'completed' ? (raw.completedAt || raw.updatedAt || createdAt) : null,
  };

  // Legacy fields stay populated for older clients, insights and Life DNA.
  goal.completed = status === 'completed';
  goal.archived = status === 'archived';
  goal.deadline = targetDate;
  goal.journey = milestones.map(step => ({ id: step.id, text: step.text, completed: step.done }));
  goal.progress = isLinkedGoal(goal) && status !== 'completed'
    ? clamp(Math.round(num(raw.progress)))
    : getGoalSnapshot(goal).percent;
  return goal;
}

export function migrateGoals(list) {
  return (Array.isArray(list) ? list : []).map(migrateGoal).filter(Boolean);
}

/** Creates a new v2 goal from form values. */
export function createGoal(fields = {}, now = new Date()) {
  const stamp = now.toISOString();
  return migrateGoal({ status: 'active', ...fields, id: fields.id || makeId(), createdAt: stamp, updatedAt: stamp, startDate: fields.startDate || toLocalDate(now) });
}

// ===== Linked module data =====
function sumHours(sessions) {
  return sessions.reduce((sum, s) => sum + num(s.duration, 25) / 60, 0);
}

/**
 * Builds dated progress events from other modules.
 * ctx: { habits, books, pomodoro: { sessions }, health: { workouts, weights }, transactions }
 */
export function buildSourceEvents(goal, ctx = {}) {
  const source = goal?.source || { kind: 'manual' };
  const from = goal.startDate || '';
  const after = (date) => !!date && (!from || date >= from);
  const asArray = (value) => (Array.isArray(value) ? value : []);

  switch (source.kind) {
    case 'habit': {
      const habit = asArray(ctx.habits).find(h => String(h.id) === String(source.habitId));
      if (!habit) return [];
      const dates = [...new Set(asArray(habit.completedDates).map(dateKey).filter(after))];
      return dates.map(date => ({ date, kind: 'add', amount: 1, ref: habit.id }));
    }
    case 'reading':
      return asArray(ctx.books)
        .filter(book => String(book.status || '').toLowerCase() === 'completed')
        .map(book => ({ date: dateKey(book.finishDate || book.updatedAt || book.createdAt), kind: 'add', amount: 1, ref: book.id }))
        .filter(event => after(event.date));
    case 'pomodoro':
      return asArray(ctx.pomodoro?.sessions)
        .map(session => ({ date: dateKey(session.date || session.completedAt), kind: 'add', amount: sumHours([session]) }))
        .filter(event => after(event.date));
    case 'workouts':
      return asArray(ctx.health?.workouts)
        .map(workout => ({ date: dateKey(workout.date), kind: 'add', amount: 1, ref: workout.id }))
        .filter(event => after(event.date));
    case 'weight':
      return asArray(ctx.health?.weights)
        .map(entry => ({ date: dateKey(entry.date), kind: 'set', amount: num(entry.weight, NaN), ref: entry.id }))
        .filter(event => after(event.date) && Number.isFinite(event.amount));
    case 'finance_category':
      return asArray(ctx.transactions)
        .filter(tx => tx.category === source.category && (source.txType === 'any' || !source.txType || tx.type === source.txType))
        .map(tx => ({ date: dateKey(tx.date), kind: 'add', amount: Math.abs(num(tx.amount)), ref: tx.id }))
        .filter(event => after(event.date));
    case 'finance_net':
      return asArray(ctx.transactions)
        .filter(tx => tx.type === 'income' || tx.type === 'expense')
        .map(tx => ({ date: dateKey(tx.date), kind: 'add', amount: tx.type === 'income' ? Math.abs(num(tx.amount)) : -Math.abs(num(tx.amount)), ref: tx.id }))
        .filter(event => after(event.date));
    default:
      return [];
  }
}

function goalDirection(goal) {
  return num(goal.targetValue) >= num(goal.startValue) ? 1 : -1;
}

/** All progress events (manual + linked), oldest first. */
export function getGoalEvents(goal, ctx = {}) {
  const manual = (goal.entries || []).map(entry => ({ date: entry.date, kind: entry.kind, amount: entry.amount, id: entry.id, manual: true }));
  const events = [...manual, ...buildSourceEvents(goal, ctx)].filter(event => event.date);
  return events.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Cumulative value series [{ date, value }], one point per day with activity. */
export function getGoalSeries(goal, ctx = {}) {
  const dir = goalDirection(goal);
  const points = [{ date: goal.startDate, value: num(goal.startValue) }];
  let value = num(goal.startValue);
  const seenDays = new Set();
  for (const event of getGoalEvents(goal, ctx)) {
    if (goal.type === 'consistency') {
      if (seenDays.has(event.date) || event.amount <= 0) continue;
      seenDays.add(event.date);
      value += 1;
    } else if (event.kind === 'set') {
      value = num(event.amount);
    } else {
      value += dir * num(event.amount);
    }
    const last = points[points.length - 1];
    if (last.date === event.date) last.value = value;
    else points.push({ date: event.date, value });
  }
  return points;
}

function valueAt(series, date) {
  let value = series.length ? series[0].value : 0;
  for (const point of series) {
    if (point.date <= date) value = point.value;
    else break;
  }
  return value;
}

function numericPercent(goal, value) {
  const range = num(goal.targetValue) - num(goal.startValue);
  if (range === 0) return value === num(goal.targetValue) && num(goal.targetValue) !== 0 ? 100 : 0;
  return clamp(((value - num(goal.startValue)) / range) * 100);
}

function milestonePercent(goal) {
  const items = goal.milestones || [];
  const total = items.reduce((sum, item) => sum + Math.max(1, num(item.weight, 1)), 0);
  if (!total) return 0;
  const done = items.filter(item => item.done).reduce((sum, item) => sum + Math.max(1, num(item.weight, 1)), 0);
  return (done / total) * 100;
}

function displayPercent(exact, done) {
  if (done) return 100;
  return Math.min(99, Math.floor(exact));
}

/**
 * The single source of truth for a goal's numbers.
 * ctx carries linked module data and, for composite goals, `goals`.
 */
export function getGoalSnapshot(goal, ctx = {}, now = new Date(), depth = 0) {
  const today = toLocalDate(now);
  const type = goal.type || 'milestone';
  const isNumeric = NUMERIC_GOAL_TYPES.includes(type);
  const dir = goalDirection(goal);
  const series = isNumeric ? getGoalSeries(goal, ctx) : [];
  const current = isNumeric ? (series.length ? series[series.length - 1].value : num(goal.startValue)) : null;

  let exact = 0;
  let children = [];
  if (isNumeric) exact = numericPercent(goal, current);
  else if (type === 'composite') {
    children = depth < 3 && Array.isArray(ctx.goals)
      ? ctx.goals.filter(child => child.parentId === goal.id && child.id !== goal.id && child.status !== 'archived')
      : [];
    exact = children.length ? children.reduce((sum, child) => sum + getGoalSnapshot(child, ctx, now, depth + 1).percentExact, 0) / children.length : 0;
  } else exact = milestonePercent(goal);

  const reached = isNumeric ? exact >= 100 : type === 'milestone' ? (goal.milestones || []).length > 0 && exact >= 100 : type === 'composite' ? children.length > 0 && exact >= 100 : false;
  const completed = goal.status === 'completed';
  const done = completed || reached;
  const percent = displayPercent(exact, done);
  const percentExact = done ? 100 : exact;

  const hasDeadline = !!goal.targetDate;
  const totalDays = hasDeadline ? Math.max(1, daysBetween(goal.startDate, goal.targetDate)) : 0;
  const elapsedDays = Math.max(0, daysBetween(goal.startDate, today));
  const daysLeft = hasDeadline ? daysBetween(today, goal.targetDate) : null;
  const expectedPercent = hasDeadline ? clamp((elapsedDays / totalDays) * 100) : null;

  const remaining = isNumeric ? Math.max(0, (num(goal.targetValue) - current) * dir) : null;

  // Pace from real history: last 30 days, or since start when younger.
  let velocityPerDay = null;
  if (isNumeric && elapsedDays >= 1) {
    const window = Math.min(30, elapsedDays);
    const fromDate = addDays(today, -window);
    const gained = (current - valueAt(series, fromDate)) * dir;
    velocityPerDay = gained / window;
  }

  const requiredPerDay = isNumeric && hasDeadline && daysLeft > 0 && remaining > 0 ? remaining / daysLeft : null;
  const projectedDate = isNumeric && !done && velocityPerDay > 0 ? addDays(today, Math.ceil(remaining / velocityPerDay)) : null;

  let status;
  if (completed) status = 'completed';
  else if (goal.status === 'paused') status = 'paused';
  else if (done) status = 'ahead';
  else if (!hasDeadline) status = 'no_deadline';
  else if (daysLeft < 0) status = 'overdue';
  else {
    const gap = percentExact - expectedPercent;
    status = gap >= 5 ? 'ahead' : gap >= -5 ? 'on_track' : gap >= -15 ? 'behind' : 'at_risk';
  }

  const nextCp = GOAL_CHECKPOINTS.find(cp => cp > percentExact) ?? null;
  const nextCheckpoint = nextCp === null ? null : {
    percent: nextCp,
    value: isNumeric ? num(goal.startValue) + (num(goal.targetValue) - num(goal.startValue)) * nextCp / 100 : null,
    remaining: isNumeric ? Math.max(0, (num(goal.startValue) + (num(goal.targetValue) - num(goal.startValue)) * nextCp / 100 - current) * dir) : null,
  };
  const reachedCheckpoints = GOAL_CHECKPOINTS.filter(cp => cp <= percentExact && (cp < 100 || done));

  // Progress this week and weekly streak of real positive activity.
  const weekStart = startOfWeek(today);
  const thisWeek = isNumeric ? (current - valueAt(series, addDays(weekStart, -1))) * dir : (goal.milestones || []).filter(m => m.done && m.doneAt && dateKey(m.doneAt) >= weekStart).length;
  const activeWeeks = new Set();
  if (isNumeric) {
    for (let i = 1; i < series.length; i++) if ((series[i].value - series[i - 1].value) * dir > 0) activeWeeks.add(weekKey(series[i].date));
  } else {
    (goal.milestones || []).forEach(m => { if (m.done && m.doneAt) activeWeeks.add(weekKey(m.doneAt)); });
  }
  let weekStreak = 0;
  let cursor = activeWeeks.has(weekKey(today)) ? today : addDays(today, -7);
  while (activeWeeks.has(weekKey(cursor))) { weekStreak++; cursor = addDays(cursor, -7); }

  return {
    type, isNumeric, unit: goal.unit, status,
    percent, percentExact, expectedPercent,
    current, start: isNumeric ? num(goal.startValue) : null, target: isNumeric ? num(goal.targetValue) : null,
    remaining, daysLeft, elapsedDays, velocityPerDay, requiredPerDay,
    requiredPerWeek: requiredPerDay === null ? null : requiredPerDay * 7,
    requiredPerMonth: requiredPerDay === null ? null : requiredPerDay * 30.4,
    projectedDate, nextCheckpoint, reachedCheckpoints, thisWeek, weekStreak,
    reached: done, childCount: children.length, series,
  };
}

/** Recomputes the cached `progress` used by dashboards and older clients. */
export function withCachedProgress(goal, ctx = {}, now = new Date()) {
  return { ...goal, progress: getGoalSnapshot(goal, ctx, now).percent };
}

/** Checkpoints reached but not yet celebrated. */
export function pendingCelebrations(goal, snapshot) {
  const seen = new Set(goal.celebrated || []);
  return snapshot.reachedCheckpoints.filter(cp => !seen.has(cp));
}

// ===== Goal mutations (return new objects) =====
function touch(goal, patch) {
  return { ...goal, ...patch, updatedAt: new Date().toISOString() };
}

export function addGoalEntry(goal, { amount, kind = 'add', date = toLocalDate(), note = '' }) {
  const value = num(amount, NaN);
  if (!Number.isFinite(value)) return goal;
  const entry = { id: makeId(), date: dateKey(date) || toLocalDate(), kind: kind === 'set' ? 'set' : 'add', amount: value, note: String(note || '').trim(), createdAt: new Date().toISOString() };
  return touch(goal, { entries: [...(goal.entries || []), entry] });
}

export function removeGoalEntry(goal, entryId) {
  return touch(goal, { entries: (goal.entries || []).filter(entry => entry.id !== entryId) });
}

export function toggleGoalMilestone(goal, milestoneId, now = new Date()) {
  return touch(goal, {
    milestones: (goal.milestones || []).map(m => m.id === milestoneId ? { ...m, done: !m.done, doneAt: !m.done ? now.toISOString() : null } : m),
  });
}

export function setGoalStatus(goal, status, now = new Date()) {
  if (!GOAL_STATUSES.includes(status)) return goal;
  return touch(goal, {
    status,
    completed: status === 'completed',
    archived: status === 'archived',
    completedAt: status === 'completed' ? now.toISOString() : null,
  });
}

export function markCelebrated(goal, checkpoints) {
  return { ...goal, celebrated: [...new Set([...(goal.celebrated || []), ...checkpoints])].sort((a, b) => a - b) };
}

export function saveGoalReview(goal, { note = '', commitment = '' }, now = new Date()) {
  const week = weekKey(now);
  const reviews = (goal.reviews || []).filter(review => review.week !== week);
  return touch(goal, { reviews: [...reviews, { week, note: String(note).trim(), commitment: String(commitment).trim(), at: now.toISOString() }].slice(-52) });
}

// ===== Planning helpers =====

/** Weekly quota needed from today to finish on time. */
export function getWeeklyQuota(snapshot) {
  if (!snapshot.isNumeric || snapshot.requiredPerWeek === null) return null;
  return { amount: snapshot.requiredPerWeek, done: Math.max(0, snapshot.thisWeek), left: Math.max(0, snapshot.requiredPerWeek - Math.max(0, snapshot.thisWeek)) };
}

/**
 * Options offered when a goal falls behind. Each option is computed from the
 * user's real pace; nothing is applied without the user choosing it.
 */
export function getRecoveryOptions(goal, snapshot, now = new Date()) {
  if (!snapshot.isNumeric || !['behind', 'at_risk', 'overdue'].includes(snapshot.status)) return null;
  const today = toLocalDate(now);
  const dir = goalDirection(goal);
  const pace = snapshot.velocityPerDay > 0 ? snapshot.velocityPerDay : 0;
  const options = { requiredPerDay: snapshot.requiredPerDay, extendTo: snapshot.projectedDate, reduceTargetTo: null };
  if (pace > 0 && snapshot.daysLeft > 0) {
    const reachable = snapshot.current + dir * pace * snapshot.daysLeft;
    if ((reachable - snapshot.start) * dir > 0) options.reduceTargetTo = Math.round(reachable);
  }
  if (!options.extendTo && snapshot.daysLeft !== null && snapshot.daysLeft < 0) options.extendTo = null;
  options.today = today;
  return options;
}

/**
 * What-if projection for numeric goals. `perMonth` is the planned monthly
 * contribution; `annualReturn` (percent) applies monthly compounding for money.
 */
export function simulateGoal({ current = 0, target = 0, start = 0, perMonth = 0, annualReturn = 0, from = new Date() }) {
  const dir = target >= start ? 1 : -1;
  const monthlyRate = dir > 0 ? Math.max(0, num(annualReturn)) / 100 / 12 : 0;
  let value = num(current);
  const contribution = Math.max(0, num(perMonth));
  if ((target - value) * dir <= 0) return { months: 0, date: toLocalDate(from), reachable: true };
  if (contribution <= 0 && monthlyRate <= 0) return { months: null, date: null, reachable: false };
  for (let month = 1; month <= 600; month++) {
    value = dir > 0 ? value * (1 + monthlyRate) + contribution : value - contribution;
    if ((target - value) * dir <= 0) return { months: month, date: addMonths(toLocalDate(from), month), reachable: true };
  }
  return { months: null, date: null, reachable: false };
}

/** Auto checkpoints for the journey map. */
export function getJourneyStops(goal, snapshot) {
  return GOAL_CHECKPOINTS.map(cp => ({
    percent: cp,
    value: snapshot.isNumeric ? num(goal.startValue) + (num(goal.targetValue) - num(goal.startValue)) * cp / 100 : null,
    reached: snapshot.reachedCheckpoints.includes(cp),
  }));
}

/** Picks the active goal that most needs attention today. */
export function pickNextGoalAction(goals, ctx = {}, now = new Date()) {
  const candidates = (goals || [])
    .filter(goal => goal.status === 'active' && goal.type !== 'composite')
    .map(goal => ({ goal, snapshot: getGoalSnapshot(goal, { ...ctx, goals }, now) }))
    .filter(item => !item.snapshot.reached);
  if (!candidates.length) return null;
  candidates.sort((a, b) =>
    (STATUS_URGENCY[a.snapshot.status] ?? 6) - (STATUS_URGENCY[b.snapshot.status] ?? 6)
    || (b.goal.pinned ? 1 : 0) - (a.goal.pinned ? 1 : 0)
    || (a.snapshot.daysLeft ?? 99999) - (b.snapshot.daysLeft ?? 99999));
  return candidates[0];
}

export function sortGoals(goals, ctx = {}, now = new Date()) {
  return [...goals].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const sa = getGoalSnapshot(a, { ...ctx, goals }, now), sb = getGoalSnapshot(b, { ...ctx, goals }, now);
    return (STATUS_URGENCY[sa.status] ?? 6) - (STATUS_URGENCY[sb.status] ?? 6) || (sa.daysLeft ?? 99999) - (sb.daysLeft ?? 99999);
  });
}

/** Average monthly expense over the last `months` full months (for templates). */
export function averageMonthlyExpense(transactions = [], months = 3, now = new Date()) {
  const totals = [];
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = (Array.isArray(transactions) ? transactions : [])
      .filter(tx => tx.type === 'expense' && String(tx.date || '').startsWith(key))
      .reduce((sum, tx) => sum + Math.abs(num(tx.amount)), 0);
    if (total > 0) totals.push(total);
  }
  return totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
}

// ===== Templates =====
// Titles and steps are Indonesian source copy; clients translate them.
export const GOAL_TEMPLATES = [
  { id: 'first_100m', title: '100 Juta Pertama', category: 'finance', type: 'accumulate', unit: 'IDR', targetValue: 100000000, months: 24, why: 'Fondasi kebebasan finansial pertamaku.', milestones: ['Buka rekening khusus tabungan', 'Atur auto-debit setiap gajian'] },
  { id: 'emergency_fund', title: 'Dana Darurat', category: 'finance', type: 'accumulate', unit: 'IDR', targetValue: 30000000, months: 12, why: 'Supaya tenang kalau ada kejadian tak terduga.', milestones: ['Hitung pengeluaran bulanan', 'Pisahkan rekening dana darurat'], expenseMultiple: 6 },
  { id: 'debt_free', title: 'Bebas Utang', category: 'finance', type: 'payoff', unit: 'IDR', startValue: 20000000, targetValue: 0, months: 12, why: 'Gaji bulanan sepenuhnya jadi milikku lagi.', milestones: ['Daftar semua utang dan bunganya', 'Lunasi yang bunganya paling tinggi dulu'] },
  { id: 'house_dp', title: 'DP Rumah', category: 'finance', type: 'accumulate', unit: 'IDR', targetValue: 150000000, months: 36, why: 'Punya rumah sendiri untuk keluarga.', milestones: ['Tentukan lokasi dan harga rumah', 'Cek simulasi KPR'] },
  { id: 'read_24', title: 'Baca 24 Buku', category: 'education', type: 'increase', unit: 'book', targetValue: 24, months: 12, source: { kind: 'reading' }, why: 'Jadi orang yang terus belajar.', milestones: [] },
  { id: 'lose_weight', title: 'Turun Berat Badan', category: 'health', type: 'decrease', unit: 'kg', startValue: 80, targetValue: 72, months: 6, source: { kind: 'weight' }, why: 'Badan lebih ringan dan sehat.', milestones: ['Timbang badan tiap minggu', 'Atur pola makan'] },
  { id: 'gym_100', title: '100 Hari Olahraga', category: 'health', type: 'consistency', unit: 'day', targetValue: 100, months: 5, source: { kind: 'workouts' }, why: 'Olahraga jadi bagian dari diriku.', milestones: [] },
  { id: 'deep_work', title: '300 Jam Fokus', category: 'career', type: 'increase', unit: 'hour', targetValue: 300, months: 6, source: { kind: 'pomodoro' }, why: 'Menguasai skill yang mengubah karierku.', milestones: [] },
  { id: 'launch_project', title: 'Rilis Side Project', category: 'career', type: 'milestone', unit: 'custom', months: 4, why: 'Membuktikan aku bisa membangun sesuatu sendiri.', milestones: ['Validasi ide ke 10 orang', 'Buat versi pertama', 'Dapat 10 pengguna pertama', 'Rilis publik'] },
];

/**
 * Turns a template into form values. Uses real transaction history where it
 * helps (e.g. emergency fund = 6x average monthly expense).
 */
export function goalFromTemplate(template, ctx = {}, now = new Date()) {
  const today = toLocalDate(now);
  let targetValue = template.targetValue ?? 0;
  if (template.expenseMultiple) {
    const avg = averageMonthlyExpense(ctx.transactions, 3, now);
    if (avg > 0) targetValue = Math.round((avg * template.expenseMultiple) / 100000) * 100000;
  }
  return {
    title: template.title,
    category: template.category,
    type: template.type,
    unit: template.unit,
    startValue: template.startValue ?? 0,
    targetValue,
    startDate: today,
    targetDate: template.months ? addMonths(today, template.months) : '',
    why: template.why || '',
    source: template.source || { kind: 'manual' },
    milestones: (template.milestones || []).map(text => ({ id: makeId(), text, done: false, weight: 1 })),
    templateId: template.id,
  };
}

/**
 * Smart parser that infers goal type, unit, category, and target amount from a
 * plain human title like "Nabung 100jt", "Lunasi utang 25jt", "Baca 24 buku",
 * "Turun ke 70kg", or "Olahraga 100 hari".
 */
export function inferGoalFromTitle(rawTitle = '') {
  const text = String(rawTitle || '').trim();
  const lower = text.toLowerCase();
  if (!text) return null;

  const moneyMatch = /(\d+(?:[.,]\d+)?\s*(?:jt|juta|rb|ribu|m|miliar|milyar))\b/i.exec(text);
  if (moneyMatch) {
    const val = parseGoalAmount(moneyMatch[1]);
    if (Number.isFinite(val) && val > 0) {
      const isDebt = /(utang|hutang|cicilan|kredit|kta|pinjol|payoff|lunas)/.test(lower);
      return isDebt
        ? { type: 'payoff', unit: 'IDR', category: 'finance', startValue: val, targetValue: 0 }
        : { type: 'accumulate', unit: 'IDR', category: 'finance', startValue: 0, targetValue: val };
    }
  }

  const bookMatch = /(\d+)\s*buku\b/i.exec(text);
  if (bookMatch) {
    return { type: 'increase', unit: 'book', category: 'education', startValue: 0, targetValue: Number(bookMatch[1]), source: { kind: 'reading' } };
  }

  const kgMatch = /(\d+(?:[.,]\d+)?)\s*kg\b/i.exec(text);
  if (kgMatch) {
    const kg = Number(kgMatch[1].replace(',', '.'));
    return { type: 'decrease', unit: 'kg', category: 'health', targetValue: kg, source: { kind: 'weight' } };
  }

  const kmMatch = /(\d+(?:[.,]\d+)?)\s*km\b/i.exec(text);
  if (kmMatch) {
    return { type: 'increase', unit: 'km', category: 'health', startValue: 0, targetValue: Number(kmMatch[1].replace(',', '.')) };
  }

  const dayMatch = /(\d+)\s*hari\b/i.exec(text);
  if (dayMatch) {
    return { type: 'consistency', unit: 'day', category: 'health', startValue: 0, targetValue: Number(dayMatch[1]) };
  }

  const hourMatch = /(\d+)\s*jam\b/i.exec(text);
  if (hourMatch) {
    return { type: 'increase', unit: 'hour', category: 'career', startValue: 0, targetValue: Number(hourMatch[1]), source: { kind: 'pomodoro' } };
  }

  return null;
}

