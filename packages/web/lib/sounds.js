// 🎵 Sound Effects Engine — Web Audio API (no external files needed)

let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playSequence(notes, baseTime = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;
  let offset = baseTime;
  notes.forEach(([freq, dur, type = 'sine', vol = 0.3]) => {
    setTimeout(() => playTone(freq, dur, type, vol), offset * 1000);
    offset += dur * 0.6;
  });
}

// ===== SOUND COLLECTION =====

// ✅ Task complete — satisfying ding
export function playTaskComplete() {
  playSequence([
    [880, 0.1, 'sine', 0.25],
    [1320, 0.15, 'sine', 0.3],
    [1760, 0.3, 'sine', 0.2],
  ]);
}

// 🔥 Habit done — whoosh combo
export function playHabitDone() {
  playSequence([
    [523, 0.08, 'triangle', 0.25],
    [659, 0.08, 'triangle', 0.3],
    [784, 0.12, 'triangle', 0.35],
    [1047, 0.2, 'sine', 0.25],
  ]);
}

// 🏆 Achievement Unlocked — triumphant fanfare
export function playAchievement() {
  playSequence([
    [523, 0.15, 'square', 0.2],
    [659, 0.15, 'square', 0.2],
    [784, 0.15, 'square', 0.2],
    [1047, 0.4, 'sine', 0.35],
  ]);
}

// ⬆️ Level Up — epic victory
export function playLevelUp() {
  playSequence([
    [440, 0.1, 'square', 0.15],
    [554, 0.1, 'square', 0.18],
    [659, 0.1, 'square', 0.2],
    [880, 0.1, 'square', 0.22],
    [1047, 0.15, 'sine', 0.3],
    [1319, 0.15, 'sine', 0.35],
    [1568, 0.4, 'sine', 0.4],
  ]);
}

// 💀 Streak Break — glass shatter
export function playStreakBreak() {
  const ctx = getAudioContext();
  if (!ctx) return;
  // Low ominous tone
  playTone(110, 0.5, 'sawtooth', 0.3);
  // Shatter noise
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      playTone(200 + Math.random() * 2000, 0.05, 'square', 0.08);
    }, 100 + i * 30);
  }
  // Descending doom
  setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.15), 300);
  setTimeout(() => playTone(100, 0.5, 'sawtooth', 0.1), 500);
}

// ⏱️ Pomodoro Done — victory chime
export function playPomodoroDone() {
  playSequence([
    [784, 0.15, 'sine', 0.3],
    [988, 0.15, 'sine', 0.3],
    [1175, 0.15, 'sine', 0.3],
    [1568, 0.4, 'triangle', 0.35],
  ]);
}

// 💧 Water Drink — bubble
export function playWaterDrink() {
  playSequence([
    [400, 0.05, 'sine', 0.2],
    [600, 0.05, 'sine', 0.25],
    [800, 0.08, 'sine', 0.2],
    [1200, 0.1, 'sine', 0.15],
  ]);
}

// +XP — subtle positive
export function playXPGain() {
  playTone(1200, 0.08, 'sine', 0.15);
  setTimeout(() => playTone(1600, 0.12, 'sine', 0.12), 60);
}

// ❌ Error / Delete
export function playError() {
  playTone(200, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.15), 120);
}

// 🔔 Notification
export function playNotification() {
  playSequence([
    [880, 0.1, 'sine', 0.25],
    [1100, 0.15, 'sine', 0.2],
  ]);
}

// Click feedback
export function playClick() {
  playTone(800, 0.03, 'sine', 0.1);
}
