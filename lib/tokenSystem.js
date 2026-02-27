// 💎 Token/Coin Economy System
// Manages token balance, purchases, spending, and history

const TOKEN_KEY = 'superapp_tokens';

// ===== TOKEN PACKAGES =====
export const TOKEN_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter Pack',
        icon: '⭐',
        price: 15000,
        priceLabel: 'Rp 15.000',
        tokens: 50,
        bonusStorage: 5, // MB
        color: '#10b981',
        popular: false,
        desc: 'Cocok untuk mulai coba fitur premium',
    },
    {
        id: 'pro',
        name: 'Pro Pack',
        icon: '🔥',
        price: 45000,
        priceLabel: 'Rp 45.000',
        tokens: 200,
        bonusStorage: 25,
        color: '#8b5cf6',
        popular: true,
        desc: 'Best value — fitur lengkap + storage besar',
    },
    {
        id: 'ultimate',
        name: 'Ultimate Pack',
        icon: '💎',
        price: 99000,
        priceLabel: 'Rp 99.000',
        tokens: 500,
        bonusStorage: 100,
        color: '#f59e0b',
        popular: false,
        desc: 'Unlimited power — semua fitur tanpa batas',
    },
];

// ===== PREMIUM FEATURES =====
export const PREMIUM_FEATURES = [
    { id: 'cloud_auto_sync', name: 'Cloud Auto-Sync', icon: '☁️', cost: 5, desc: 'Sinkronisasi otomatis ke cloud', type: 'monthly' },
    { id: 'advanced_analytics', name: 'Advanced Analytics', icon: '📊', cost: 3, desc: 'Analitik detail & insights', type: 'one_time' },
    { id: 'custom_themes', name: 'Custom Themes', icon: '🎨', cost: 2, desc: 'Tema & warna kustom', type: 'one_time' },
    { id: 'cross_device', name: 'Cross-Device Sync', icon: '🔄', cost: 0, desc: 'Gratis untuk semua premium user', type: 'free_premium' },
    { id: 'extra_storage', name: 'Extra Storage', icon: '💾', cost: 0, desc: 'Otomatis dari paket token', type: 'auto' },
];

// ===== CORE FUNCTIONS =====
function getUserId() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('superapp_current_user');
}

function getTokenKey() {
    const userId = getUserId();
    return userId ? `${userId}_${TOKEN_KEY}` : TOKEN_KEY;
}

function getDefaultTokenData() {
    return {
        balance: 0,
        activePlan: null, // Track highest active plan
        totalPurchased: 0,
        totalSpent: 0,
        bonusStorageMB: 0,
        purchaseHistory: [],
        spendHistory: [],
        unlockedFeatures: [],
        lastDailyReward: null,
    };
}

export function getTokenData() {
    if (typeof window === 'undefined') return getDefaultTokenData();
    try {
        const data = localStorage.getItem(getTokenKey());
        return data ? JSON.parse(data) : getDefaultTokenData();
    } catch {
        return getDefaultTokenData();
    }
}

function saveTokenData(data) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getTokenKey(), JSON.stringify(data));
}

// ===== PURCHASE =====
export function purchaseTokens(packageId) {
    const pkg = TOKEN_PACKAGES.find(p => p.id === packageId);
    if (!pkg) return { success: false, error: 'Paket tidak ditemukan' };

    const data = getTokenData();
    data.balance += pkg.tokens;
    data.totalPurchased += pkg.tokens;
    data.bonusStorageMB += pkg.bonusStorage;

    // Set the latest active plan
    data.activePlan = pkg.id;

    data.purchaseHistory.push({
        id: Date.now().toString(36),
        packageId: pkg.id,
        packageName: pkg.name,
        tokens: pkg.tokens,
        bonusStorage: pkg.bonusStorage,
        price: pkg.price,
        date: new Date().toISOString(),
    });

    // Keep last 50 purchases
    if (data.purchaseHistory.length > 50) {
        data.purchaseHistory = data.purchaseHistory.slice(-50);
    }

    saveTokenData(data);
    return { success: true, data, package: pkg };
}

// ===== SPEND TOKENS =====
export function spendTokens(featureId, amount, label) {
    const data = getTokenData();
    if (data.balance < amount) {
        return { success: false, error: 'Token tidak cukup', balance: data.balance };
    }

    data.balance -= amount;
    data.totalSpent += amount;

    // Track unlocked features
    if (!data.unlockedFeatures.includes(featureId)) {
        data.unlockedFeatures.push(featureId);
    }

    data.spendHistory.push({
        id: Date.now().toString(36),
        featureId,
        amount,
        label: label || featureId,
        date: new Date().toISOString(),
    });

    if (data.spendHistory.length > 100) {
        data.spendHistory = data.spendHistory.slice(-100);
    }

    saveTokenData(data);
    return { success: true, data };
}

// ===== DAILY FREE TOKEN =====
// Daily reward adalah 1 token, bonus jika total mencapai 30 adalah +20 tokens
// Jadi user bisa mencapai 50 tokens setelah claim 30 hari
export function claimDailyToken() {
    const data = getTokenData();
    const today = new Date().toISOString().split('T')[0];

    if (data.lastDailyReward === today) {
        return { success: false, alreadyClaimed: true };
    }

    const DAILY_REWARD_AMOUNT = 1;
    const BONUS_THRESHOLD = 30; // Minimum daily claims untuk unlock bonus
    const BONUS_AMOUNT = 20;

    // Count how many times user has claimed daily reward
    const dailyClaimCount = data.purchaseHistory.filter(h => h.packageId === 'daily_reward').length + 1;
    
    let tokensAwarded = DAILY_REWARD_AMOUNT;
    let bonusAwarded = 0;

    // Jika sudah mencapai threshold (30 hari), tambah bonus 20 token
    if (dailyClaimCount === BONUS_THRESHOLD) {
        bonusAwarded = BONUS_AMOUNT;
    }

    data.balance += tokensAwarded + bonusAwarded;
    data.totalPurchased += tokensAwarded + bonusAwarded;
    data.lastDailyReward = today;

    data.purchaseHistory.push({
        id: Date.now().toString(36),
        packageId: 'daily_reward',
        packageName: 'Daily Reward 🎁',
        tokens: tokensAwarded + bonusAwarded,
        bonusStorage: 0,
        price: 0,
        date: new Date().toISOString(),
        dayNumber: dailyClaimCount,
        bonus: bonusAwarded > 0,
    });

    saveTokenData(data);
    return { success: true, data, dayNumber: dailyClaimCount, bonusAwarded };
}

// ===== QUERIES =====
export function getTokenBalance() {
    return getTokenData().balance;
}

export function hasEnoughTokens(amount) {
    return getTokenData().balance >= amount;
}

export function isFeatureUnlocked(featureId) {
    const data = getTokenData();
    // Free premium features are unlocked if user has any token history
    const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
    if (feature && feature.type === 'free_premium') {
        return data.totalPurchased > 0;
    }
    if (feature && feature.type === 'auto') {
        return data.bonusStorageMB > 0;
    }
    return data.unlockedFeatures.includes(featureId);
}

export function getStorageLimitMB() {
    const data = getTokenData();
    return 5 + data.bonusStorageMB; // 5MB base + bonus
}

export function isPremiumUser() {
    const data = getTokenData();
    // Minimal 30 tokens untuk menjadi premium user
    const PREMIUM_MINIMUM = 30;
    return data.totalPurchased >= PREMIUM_MINIMUM;
}
