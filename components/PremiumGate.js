'use client';

import { useState } from 'react';
import { usePremium } from '@/lib/premium';

export default function PremiumGate({ featureId, children, fallbackContext }) {
    const { checkFeature, useTokens, balance, isPremium, PREMIUM_FEATURES } = usePremium();
    const [unlocking, setUnlocking] = useState(false);
    const [error, setError] = useState('');

    const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
    const isUnlocked = checkFeature(featureId);

    // Free premium features
    if (feature?.type === 'free_premium' && isPremium) {
        return children;
    }

    // Auto features are handled elsewhere (like storage)
    if (feature?.type === 'auto') {
        return children;
    }

    // If already unlocked
    if (isUnlocked) {
        return children;
    }

    const handleUnlock = () => {
        if (!feature) return;
        setError('');

        if (balance < feature.cost) {
            setError(`Token tidak cukup. Butuh ${feature.cost} token, saldomu ${balance}.`);
            return;
        }

        setUnlocking(true);
        // Simulate slight delay for effect
        setTimeout(() => {
            const result = useTokens(featureId, feature.cost, `Unlock: ${feature.name}`);
            if (result.success) {
                // Success handled by re-render since context updates
            } else {
                setError(result.error);
            }
            setUnlocking(false);
        }, 600);
    };

    // Fallback UI when locked
    return (
        <div className="card card-padding" style={{
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--accent-purple)',
            background: 'var(--gradient-card)'
        }}>
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'var(--bg-glass)', backdropFilter: 'blur(4px)',
                zIndex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: '24px',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💎</div>
                <h3 style={{ marginBottom: '8px' }}>Fitur Premium</h3>
                <p className="text-secondary text-sm mb-2 max-w-sm">
                    {fallbackContext || `Buka fitur ${feature?.name || 'ini'} untuk meningkatkan produktivitasmu.`}
                </p>

                {feature && (
                    <div className="flex flex-col items-center gap-1">
                        <button
                            className="btn btn-primary"
                            onClick={handleUnlock}
                            disabled={unlocking}
                        >
                            {unlocking ? 'Membuka...' : `Buka Akses (${feature.cost} Token)`}
                        </button>
                        <span className="text-xs text-secondary mt-1">Saldo saat ini: {balance} Token</span>
                        {error && <span className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</span>}
                    </div>
                )}

                {!feature && (
                    <a href="/premium" className="btn btn-primary mt-2">Dapatkan Token</a>
                )}
            </div>

            {/* Dimmed children behind blur */}
            <div style={{ opacity: 0.3, pointerEvents: 'none', filter: 'grayscale(50%)' }}>
                {children}
            </div>
        </div>
    );
}
