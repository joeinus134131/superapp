// 🤖 AI Motivation System

export function getRoastMessage(stats) {
  const hour = new Date().getHours();
  const messages = [];

  // ===== GENTLE REMINDERS (when low activity) =====
  if (stats.habitsToday === 0 && stats.habitsTotal > 0) {
    messages.push({
      type: 'roast',
      text: 'Jangan lupa untuk menyelesaikan habit harianmu hari ini! Konsistensi kecil membawa dampak besar. 🌱',
      severity: 'high',
    });
  }

  if (stats.tasksCompleted === 0 && stats.tasksTotal > 3) {
    messages.push({
      type: 'roast',
      text: `Ada ${stats.tasksTotal} tugas yang menantimu. Yuk, mulai dari yang paling mudah dulu! ✨`,
      severity: 'medium',
    });
  }

  if (stats.focusSessions === 0 && hour >= 14) {
    messages.push({
      type: 'roast',
      text: 'Belum ada sesi fokus hari ini. Luangkan waktu 25 menit untuk mulai produktif! ⏱️',
      severity: 'medium',
    });
  }

  if (stats.streak === 0 && stats.habitsTotal > 0) {
    messages.push({
      type: 'roast',
      text: 'Mari bangun streak barumu mulai hari ini. Setiap langkah pertama itu penting! 🚀',
      severity: 'high',
    });
  }

  if (stats.totalExpense > stats.totalIncome && stats.totalIncome > 0) {
    messages.push({
      type: 'roast',
      text: 'Pengeluaran sedikit melebihi pemasukan. Yuk, evaluasi lagi anggaran bulan ini 💡',
      severity: 'medium',
    });
  }

  // ===== ENCOURAGEMENT (when productive) =====
  if (stats.habitsToday === stats.habitsTotal && stats.habitsTotal > 0) {
    messages.push({
      type: 'hype',
      text: 'Luar biasa! Semua habit harianmu sudah selesai. Pertahankan energi positif ini! 🌟',
      severity: 'high',
    });
  }

  if (stats.streak >= 7) {
    messages.push({
      type: 'hype',
      text: `${stats.streak} hari berturut-turut! Konsistensi kamu sungguh menginspirasi. 🔥`,
      severity: 'high',
    });
  }

  if (stats.focusSessions >= 4) {
    messages.push({
      type: 'hype',
      text: `${stats.focusSessions} sesi fokus terselesaikan! Produktivitasmu luar biasa hari ini 🎯`,
      severity: 'medium',
    });
  }

  if (stats.tasksCompleted >= 5) {
    messages.push({
      type: 'hype',
      text: `${stats.tasksCompleted} tugas sudah diselesaikan! Kamu benar-benar on fire! 🚀`,
      severity: 'medium',
    });
  }

  if (stats.workoutsThisWeek >= 3) {
    messages.push({
      type: 'hype',
      text: 'Tubuh yang sehat untuk pikiran yang kuat! Keren sudah olahraga 3x minggu ini 💪',
      severity: 'medium',
    });
  }

  // ===== TIME-BASED =====
  if (hour >= 23 || hour < 4) {
    messages.push({
      type: 'neutral',
      text: 'Sudah larut malam. Pastikan kamu mendapat istirahat yang cukup untuk esok hari 🌙',
      severity: 'low',
    });
  }

  if (hour >= 4 && hour < 6) {
    messages.push({
      type: 'hype',
      text: 'Bangun pagi membawa rezeki! Selamat menikmati pagi yang produktif 🌅',
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
    return { type: 'neutral', text: 'Selamat pagi! Mari rencanakan aktivitasmu hari ini ☀️', severity: 'low' };
  }
  if (hour < 17) {
    return { type: 'neutral', text: 'Selamat siang! Lanjutkan semangatmu menyelesaikan tugas 💼', severity: 'low' };
  }
  if (hour < 21) {
    return { type: 'neutral', text: 'Selamat sore! Waktunya mereview pencapaian hari ini 🌅', severity: 'low' };
  }
  return { type: 'neutral', text: 'Selamat malam! Waktunya bersantai dan memulihkan energi 🌙', severity: 'low' };
}

// Streak Death Messages (now encouraging)
export function getStreakDeathMessage(streakBefore) {
  const messages = [
    `Tidak apa-apa, kamu telah berhasil menjaga streak selama ${streakBefore} hari sebelumnya. Mari mulai lagi! 🌱`,
    `Streak terhenti, tapi progressmu tidak hilang. Yuk mulai bangun kebiasaan baik lagi hari ini! ✨`,
    `Istirahat sebentar itu wajar. Mari lanjutkan kebiasaan positifmu mulai sekarang! 🚀`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
