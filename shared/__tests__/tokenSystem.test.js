// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(i => Object.keys(store)[i]),
  };
})();

// Mock window object with a fake current user
global.window = {
  localStorage: localStorageMock,
};

// Set up a test user ID
localStorageMock.setItem('superapp_current_user', 'test_user_123');

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import {
  TOKEN_PACKAGES,
  PREMIUM_FEATURES,
  getTokenData,
  purchaseTokens,
  spendTokens,
  claimDailyToken,
  getTokenBalance,
  hasEnoughTokens,
  isFeatureUnlocked,
  getStorageLimitMB,
  isPremiumUser,
} from '../lib/tokenSystem';

describe('Token System', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.setItem('superapp_current_user', 'test_user_123');
    jest.clearAllMocks();
  });

  describe('TOKEN_PACKAGES', () => {
    test('has 3 packages', () => {
      expect(TOKEN_PACKAGES).toHaveLength(3);
    });

    test('packages have required fields', () => {
      TOKEN_PACKAGES.forEach(pkg => {
        expect(pkg).toHaveProperty('id');
        expect(pkg).toHaveProperty('name');
        expect(pkg).toHaveProperty('price');
        expect(pkg).toHaveProperty('tokens');
        expect(pkg).toHaveProperty('bonusStorage');
        expect(pkg).toHaveProperty('color');
        expect(typeof pkg.price).toBe('number');
        expect(typeof pkg.tokens).toBe('number');
        expect(pkg.tokens).toBeGreaterThan(0);
      });
    });

    test('packages are ordered by price ascending', () => {
      for (let i = 1; i < TOKEN_PACKAGES.length; i++) {
        expect(TOKEN_PACKAGES[i].price).toBeGreaterThan(TOKEN_PACKAGES[i - 1].price);
      }
    });

    test('pro package is marked as popular', () => {
      const pro = TOKEN_PACKAGES.find(p => p.id === 'pro');
      expect(pro.popular).toBe(true);
    });
  });

  describe('PREMIUM_FEATURES', () => {
    test('has premium features defined', () => {
      expect(PREMIUM_FEATURES.length).toBeGreaterThan(0);
    });

    test('features have required fields', () => {
      PREMIUM_FEATURES.forEach(f => {
        expect(f).toHaveProperty('id');
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('cost');
        expect(f).toHaveProperty('type');
      });
    });

    test('cross_device is free for premium users', () => {
      const crossDevice = PREMIUM_FEATURES.find(f => f.id === 'cross_device');
      expect(crossDevice.type).toBe('free_premium');
      expect(crossDevice.cost).toBe(0);
    });
  });

  describe('getTokenData', () => {
    test('returns default data for new user', () => {
      const data = getTokenData();
      expect(data.balance).toBe(0);
      expect(data.totalPurchased).toBe(0);
      expect(data.totalSpent).toBe(0);
      expect(data.bonusStorageMB).toBe(0);
      expect(data.purchaseHistory).toEqual([]);
      expect(data.spendHistory).toEqual([]);
      expect(data.unlockedFeatures).toEqual([]);
    });

    test('returns persisted data', () => {
      const mockData = { balance: 100, totalPurchased: 100 };
      localStorageMock.setItem(
        'test_user_123_superapp_tokens',
        JSON.stringify(mockData)
      );
      const data = getTokenData();
      expect(data.balance).toBe(100);
    });
  });

  describe('purchaseTokens', () => {
    test('successfully purchases a package', () => {
      const result = purchaseTokens('starter');
      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(50);
      expect(result.data.totalPurchased).toBe(50);
      expect(result.data.bonusStorageMB).toBe(5);
      expect(result.package.name).toBe('Starter Pack');
    });

    test('adds to purchase history', () => {
      purchaseTokens('starter');
      const data = getTokenData();
      expect(data.purchaseHistory).toHaveLength(1);
      expect(data.purchaseHistory[0].packageId).toBe('starter');
      expect(data.purchaseHistory[0].tokens).toBe(50);
    });

    test('accumulates balance across purchases', () => {
      purchaseTokens('starter');
      purchaseTokens('pro');
      const data = getTokenData();
      expect(data.balance).toBe(250); // 50 + 200
      expect(data.totalPurchased).toBe(250);
    });

    test('sets active plan to latest', () => {
      purchaseTokens('starter');
      expect(getTokenData().activePlan).toBe('starter');
      purchaseTokens('ultimate');
      expect(getTokenData().activePlan).toBe('ultimate');
    });

    test('accumulates bonus storage', () => {
      purchaseTokens('starter');
      purchaseTokens('pro');
      const data = getTokenData();
      expect(data.bonusStorageMB).toBe(30); // 5 + 25
    });

    test('fails for invalid package', () => {
      const result = purchaseTokens('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('tidak ditemukan');
    });

    test('caps purchase history at 50', () => {
      for (let i = 0; i < 55; i++) {
        purchaseTokens('starter');
      }
      const data = getTokenData();
      expect(data.purchaseHistory.length).toBeLessThanOrEqual(50);
    });
  });

  describe('spendTokens', () => {
    beforeEach(() => {
      purchaseTokens('pro'); // Start with 200 tokens
    });

    test('successfully spends tokens', () => {
      const result = spendTokens('cloud_auto_sync', 5, 'Cloud Sync');
      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(195);
      expect(result.data.totalSpent).toBe(5);
    });

    test('adds to spend history', () => {
      spendTokens('cloud_auto_sync', 5, 'Cloud Sync');
      const data = getTokenData();
      expect(data.spendHistory).toHaveLength(1);
      expect(data.spendHistory[0].featureId).toBe('cloud_auto_sync');
      expect(data.spendHistory[0].amount).toBe(5);
    });

    test('tracks unlocked features', () => {
      spendTokens('advanced_analytics', 3, 'Analytics');
      const data = getTokenData();
      expect(data.unlockedFeatures).toContain('advanced_analytics');
    });

    test('does not duplicate unlocked features', () => {
      spendTokens('advanced_analytics', 3, 'Analytics');
      spendTokens('advanced_analytics', 3, 'Analytics again');
      const data = getTokenData();
      const analyticsCount = data.unlockedFeatures.filter(f => f === 'advanced_analytics').length;
      expect(analyticsCount).toBe(1);
    });

    test('fails with insufficient balance', () => {
      const result = spendTokens('premium_feature', 999, 'Too expensive');
      expect(result.success).toBe(false);
      expect(result.error).toContain('tidak cukup');
      expect(result.balance).toBe(200);
    });

    test('balance unchanged after failed spend', () => {
      spendTokens('premium_feature', 999, 'Too expensive');
      expect(getTokenBalance()).toBe(200);
    });

    test('caps spend history at 100', () => {
      for (let i = 0; i < 110; i++) {
        spendTokens('feature_' + i, 1, 'Spend ' + i);
      }
      const data = getTokenData();
      expect(data.spendHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe('claimDailyToken', () => {
    test('successfully claims daily token', () => {
      const result = claimDailyToken();
      expect(result.success).toBe(true);
      expect(result.data.balance).toBe(1);
    });

    test('cannot claim twice same day', () => {
      claimDailyToken();
      const result = claimDailyToken();
      expect(result.success).toBe(false);
      expect(result.alreadyClaimed).toBe(true);
    });

    test('balance only increases by 1', () => {
      claimDailyToken();
      expect(getTokenBalance()).toBe(1);
    });

    test('adds to purchase history', () => {
      claimDailyToken();
      const data = getTokenData();
      expect(data.purchaseHistory).toHaveLength(1);
      expect(data.purchaseHistory[0].packageId).toBe('daily_reward');
    });
  });

  describe('getTokenBalance', () => {
    test('returns 0 for new user', () => {
      expect(getTokenBalance()).toBe(0);
    });

    test('returns correct balance after purchase', () => {
      purchaseTokens('pro');
      expect(getTokenBalance()).toBe(200);
    });

    test('returns correct balance after spend', () => {
      purchaseTokens('pro');
      spendTokens('feature', 10, 'Test');
      expect(getTokenBalance()).toBe(190);
    });
  });

  describe('hasEnoughTokens', () => {
    test('returns false for zero balance', () => {
      expect(hasEnoughTokens(1)).toBe(false);
    });

    test('returns true when balance is sufficient', () => {
      purchaseTokens('starter');
      expect(hasEnoughTokens(50)).toBe(true);
    });

    test('returns false when balance is exactly equal', () => {
      purchaseTokens('starter');
      expect(hasEnoughTokens(51)).toBe(false);
    });
  });

  describe('isFeatureUnlocked', () => {
    test('free premium features require any purchase', () => {
      expect(isFeatureUnlocked('cross_device')).toBe(false);
      purchaseTokens('starter');
      expect(isFeatureUnlocked('cross_device')).toBe(true);
    });

    test('auto features require bonus storage', () => {
      expect(isFeatureUnlocked('extra_storage')).toBe(false);
      purchaseTokens('starter');
      expect(isFeatureUnlocked('extra_storage')).toBe(true);
    });

    test('one_time features require spend', () => {
      expect(isFeatureUnlocked('advanced_analytics')).toBe(false);
      purchaseTokens('pro');
      spendTokens('advanced_analytics', 3, 'Analytics');
      expect(isFeatureUnlocked('advanced_analytics')).toBe(true);
    });
  });

  describe('getStorageLimitMB', () => {
    test('returns 5MB base for new user', () => {
      expect(getStorageLimitMB()).toBe(5);
    });

    test('adds bonus storage after purchase', () => {
      purchaseTokens('starter');
      expect(getStorageLimitMB()).toBe(10); // 5 + 5
    });

    test('accumulates bonus storage', () => {
      purchaseTokens('starter');
      purchaseTokens('pro');
      expect(getStorageLimitMB()).toBe(35); // 5 + 5 + 25
    });
  });

  describe('isPremiumUser', () => {
    test('returns false for new user', () => {
      expect(isPremiumUser()).toBe(false);
    });

    test('returns true after any purchase', () => {
      purchaseTokens('starter');
      expect(isPremiumUser()).toBe(true);
    });

    test('returns false after one daily reward below the premium threshold', () => {
      claimDailyToken();
      expect(isPremiumUser()).toBe(false);
    });
  });
});
