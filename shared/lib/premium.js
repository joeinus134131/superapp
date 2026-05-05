'use client';

// 👑 Premium Feature Gate System
// React context for premium state management

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    getTokenData, purchaseTokens, spendTokens, claimDailyToken,
    getTokenBalance, isPremiumUser, isFeatureUnlocked, getStorageLimitMB,
    TOKEN_PACKAGES, PREMIUM_FEATURES,
} from './tokenSystem';

const PremiumContext = createContext(null);

export function PremiumProvider({ children }) {
    const [tokenData, setTokenData] = useState(null);
    const [initialized, setInitialized] = useState(false);

    // Load token data on mount
    useEffect(() => {
        setTokenData(getTokenData());
        setInitialized(true);
    }, []);

    const refreshData = useCallback(() => {
        setTokenData(getTokenData());
    }, []);

    const buyPackage = useCallback((packageId) => {
        const result = purchaseTokens(packageId);
        if (result.success) {
            setTokenData(result.data);
        }
        return result;
    }, []);

    const useTokens = useCallback((featureId, amount, label) => {
        const result = spendTokens(featureId, amount, label);
        if (result.success) {
            setTokenData(result.data);
        }
        return result;
    }, []);

    const claimDaily = useCallback(() => {
        const result = claimDailyToken();
        if (result.success) {
            setTokenData(result.data);
        }
        return result;
    }, []);

    const checkFeature = useCallback((featureId) => {
        return isFeatureUnlocked(featureId);
    }, []);

    const value = {
        tokenData,
        initialized,
        isPremium: tokenData?.totalPurchased > 0,
        balance: tokenData?.balance || 0,
        storageLimitMB: 5 + (tokenData?.bonusStorageMB || 0),
        buyPackage,
        useTokens,
        claimDaily,
        checkFeature,
        refreshData,
        TOKEN_PACKAGES,
        PREMIUM_FEATURES,
    };

    return (
        <PremiumContext.Provider value={value}>
            {children}
        </PremiumContext.Provider>
    );
}

export function usePremium() {
    const context = useContext(PremiumContext);
    if (!context) throw new Error('usePremium must be used within PremiumProvider');
    return context;
}

export { PremiumContext };
