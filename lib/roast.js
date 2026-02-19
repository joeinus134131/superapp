// 🤖 AI Roast & Motivation System

export function getRoastMessage(stats) {
  const hour = new Date().getHours();
  const messages = [];

  // ===== SAVAGE ROASTS (when lazy) =====
  if (stats.habitsToday === 0 && stats.habitsTotal > 0) {
    messages.push({
      type: 'roast',
      text: '0 habit selesai hari ini? Streak-mu lagi nangis di pojokan 😭💀',
      severity: 'high',
    });
  }

  if (stats.tasksCompleted === 0 && stats.tasksTotal > 3) {
    messages.push({
      type: 'roast',
      text: `${stats.tasksTotal} task nganggur, kamu ngapain aja? Rebahan itu bukan hobi! 😤`,
      severity: 'medium',
    });
  }

  if (stats.focusSessions === 0 && hour >= 14) {
    messages.push({
      type: 'roast',
      text: '0 sesi fokus... serius? Mau jadi GIGACHAD tapi gabisa fokus? 🤡',
      severity: 'medium',
    });
  }

  if (stats.streak === 0 && stats.habitsTotal > 0) {
    messages.push({
      type: 'roast',
      text: 'Streak-mu: NOL. Bahkan semut lebih konsisten dari kamu 🐜💀',
      severity: 'high',
    });
  }

  if (stats.totalExpense > stats.totalIncome && stats.totalIncome > 0) {
    messages.push({
      type: 'roast',
      text: 'Pengeluaran > Pemasukan? Dompetmu berteriak minta tolong 🆘💸',
      severity: 'medium',
    });
  }

  // ===== HYPE MESSAGES (when productive) =====
  if (stats.habitsToday === stats.habitsTotal && stats.habitsTotal > 0) {
    messages.push({
      type: 'hype',
      text: 'SEMUA habit selesai?! GIGACHAD DETECTED 💪🔥😤 Kamu ABSOLUTE BEAST!',
      severity: 'high',
    });
  }

  if (stats.streak >= 7) {
    messages.push({
      type: 'hype',
      text: `${stats.streak} HARI STREAK! Kamu mesin yang nggak bisa dihentikan! 🔥🚀`,
      severity: 'high',
    });
  }

  if (stats.focusSessions >= 4) {
    messages.push({
      type: 'hype',
      text: `${stats.focusSessions} sesi fokus! Monk mode: ACTIVATED. Kamu menakutkan 🧘⚡`,
      severity: 'medium',
    });
  }

  if (stats.tasksCompleted >= 5) {
    messages.push({
      type: 'hype',
      text: `${stats.tasksCompleted} task dibantai! Task Slayer mode ON ⚔️🔥`,
      severity: 'medium',
    });
  }

  if (stats.workoutsThisWeek >= 3) {
    messages.push({
      type: 'hype',
      text: 'Workout 3x seminggu! Otot-mu sudah mulai menyeringai 💪😤',
      severity: 'medium',
    });
  }

  // ===== TIME-BASED =====
  if (hour >= 23 || hour < 4) {
    messages.push({
      type: 'neutral',
      text: 'Masih begadang? Night Owl mode ON 🦉 Tapi jangan lupa tidur ya...',
      severity: 'low',
    });
  }

  if (hour >= 4 && hour < 6) {
    messages.push({
      type: 'hype',
      text: 'Bangun subuh?! Early Bird gets the worm! Kamu udah selangkah di depan 🐦✨',
      severity: 'medium',
    });
  }

  // Pick the most relevant message
  if (messages.length === 0) {
    return getDefaultMessage(hour);
  }

  // Prioritize high severity, then hype over roast
  const highSeverity = messages.filter(m => m.severity === 'high');
  if (highSeverity.length > 0) return highSeverity[Math.floor(Math.random() * highSeverity.length)];
  return messages[Math.floor(Math.random() * messages.length)];
}

function getDefaultMessage(hour) {
  if (hour < 12) {
    return { type: 'neutral', text: 'Pagi yang cerah! Saatnya crush it hari ini ☀️💪', severity: 'low' };
  }
  if (hour < 17) {
    return { type: 'neutral', text: 'Siang boyz! Lanjut grinding, jangan kendor! 🔥', severity: 'low' };
  }
  if (hour < 21) {
    return { type: 'neutral', text: 'Sore! Masih bisa produktif sebelum hari berakhir 🌅', severity: 'low' };
  }
  return { type: 'neutral', text: 'Malam! Review apa yang sudah kamu capai hari ini 🌙', severity: 'low' };
}

// Streak Death Messages
export function getStreakDeathMessage(streakBefore) {
  const messages = [
    `💀 STREAK ${streakBefore} HARI... MUSNAH. Kamu gagal.`,
    `☠️ ${streakBefore} hari terbuang sia-sia. Start from ZERO.`,
    `💔 R.I.P. Streak ${streakBefore} hari. Press F to pay respect.`,
    `🪦 Di sini berbaring streak ${streakBefore} harimu. Died of negligence.`,
    `😱 NOOOOO! ${streakBefore} hari streak GONE. Bangun lagi dari abu!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
