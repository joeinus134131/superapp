'use client';

import { useState, useEffect } from 'react';
import { usePremium } from '@/lib/premium';
import { useUser } from '@/lib/auth';

export default function PremiumStore() {
    const {
        tokenData, isPremium, balance, storageLimitMB,
        buyPackage, claimDaily, checkFeature,
        TOKEN_PACKAGES, PREMIUM_FEATURES
    } = usePremium();

    const { user } = useUser();

    const [toast, setToast] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load Midtrans Snap JS dynamically
        const snapScriptUrl = 'https://app.sandbox.midtrans.com/snap/snap.js';
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

        const script = document.createElement('script');
        script.src = snapScriptUrl;
        script.setAttribute('data-client-key', clientKey);
        script.async = true;

        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleBuy = async (pkg) => {
        setIsLoading(true);
        try {
            // Get Snap Token from generic API
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId: pkg.id,
                    packageName: pkg.name,
                    price: pkg.price,
                    userId: user?.id || 'guest',
                    userName: user?.name || 'Guest User'
                }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Server Error');

            // Trigger Midtrans Snap
            window.snap.pay(data.token, {
                onSuccess: function (result) {
                    const res = buyPackage(pkg.id);
                    if (res.success) {
                        showToast(`🎉 Pembayaran sukses! Mendapatkan paket ${res.package.name} (+${res.package.tokens} Token)`);
                    }
                },
                onPending: function (result) {
                    showToast('⏳ Menunggu pembayaran Anda...');
                },
                onError: function (result) {
                    showToast('❌ Pembayaran Dibatalkan / Gagal');
                },
                onClose: function () {
                    showToast('ℹ️ Jendela pembayaran ditutup');
                }
            });
        } catch (error) {
            console.error(error);
            showToast(`❌ Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaim = () => {
        const res = claimDaily();
        if (res.success) {
            showToast('🎁 Berhasil klaim 1 Token Gratis Hari Ini!');
        } else if (res.alreadyClaimed) {
            showToast('⚠️ Kamu sudah klaim token hari ini. Besok lagi ya!');
        }
    };

    if (!tokenData) return <div className="p-4">Loading Token Data...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1>💎 Premium Store</h1>
                        <p>Dapatkan Token untuk unlock fitur spesial dan tambah storage.</p>
                    </div>
                    <div className="dashboard-level-badge" style={{ borderColor: 'var(--accent-purple)', background: 'var(--bg-card)' }}>
                        <span style={{ color: 'var(--accent-purple)', fontSize: '18px', fontWeight: 700 }}>{balance}</span>
                        <span className="text-xs text-secondary">Token</span>
                    </div>
                </div>
            </div>

            {toast && (
                <div className="xp-toast" style={{ background: 'var(--accent-purple)' }}>
                    {toast}
                </div>
            )}

            {/* Info Card */}
            <div className="card card-padding mb-3" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                    <div>
                        <h2 className="mb-1">Status: {isPremium ? '🌟 Premium User' : 'Standard User'}</h2>
                        {tokenData.activePlan && (
                            <p className="text-sm font-bold opacity-100" style={{ color: 'var(--accent-green)' }}>
                                Current Plan: {TOKEN_PACKAGES.find(p => p.id === tokenData.activePlan)?.name || 'Custom'}
                            </p>
                        )}
                        <p className="opacity-90 text-sm mt-1">
                            Kapasitas Storage saat ini: <strong>{storageLimitMB} MB</strong>
                            {tokenData.bonusStorageMB > 0 && ` (+${tokenData.bonusStorageMB} MB Bonus)`}
                        </p>
                    </div>
                    <button
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}
                        onClick={handleClaim}
                    >
                        🎁 Klaim Token Harian
                    </button>
                </div>
            </div>

            <h2 className="mb-2">📦 Beli Token</h2>
            <p className="text-sm text-secondary mb-3">
                Pembayaran diamankan oleh Midtrans. Token dan storage tambahan akan masuk ke akunmu setelah pembayaran berhasil.
            </p>

            <div className="grid-3 mb-4">
                {TOKEN_PACKAGES.map(pkg => (
                    <div key={pkg.id} className="card card-padding" style={{
                        position: 'relative',
                        border: pkg.popular ? `2px solid ${pkg.color}` : '1px solid var(--border-color)',
                        background: 'var(--bg-card)'
                    }}>
                        {pkg.popular && (
                            <div style={{
                                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                                background: pkg.color, color: 'white', fontSize: '11px', fontWeight: 700,
                                padding: '4px 12px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px'
                            }}>
                                Best Value
                            </div>
                        )}
                        <div className="flex flex-col items-center text-center">
                            <span style={{ fontSize: '48px', marginBottom: '8px' }}>{pkg.icon}</span>
                            <h3 style={{ color: pkg.color, marginBottom: '4px' }}>{pkg.name}</h3>
                            <p className="text-xs text-secondary mb-2">{pkg.desc}</p>

                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0' }}>
                                <span className="text-lg text-secondary align-top" style={{ marginRight: '4px' }}>Token</span>
                                {pkg.tokens}
                            </div>

                            <div className="w-full flex flex-col gap-1 mb-3 text-sm">
                                <div className="flex justify-between items-center py-1 border-b border-color">
                                    <span className="text-secondary">Bonus Storage</span>
                                    <span className="font-semibold text-green">+{pkg.bonusStorage} MB</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-color">
                                    <span className="text-secondary">Cross-device Sync</span>
                                    <span className="font-semibold">Bebas Akses</span>
                                </div>
                            </div>

                            <button
                                className="btn w-full"
                                style={{
                                    background: pkg.popular ? pkg.color : 'var(--bg-glass)',
                                    color: pkg.popular ? 'white' : 'var(--text-primary)',
                                    border: `1px solid ${pkg.color}`,
                                    opacity: isLoading ? 0.7 : 1
                                }}
                                disabled={isLoading}
                                onClick={() => handleBuy(pkg)}
                            >
                                {isLoading ? 'Proses...' : `Beli — ${pkg.priceLabel}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="mb-2">✨ Fitur Premium</h2>
            <div className="grid-2 mb-4">
                {PREMIUM_FEATURES.map(feat => {
                    const unlocked = checkFeature(feat.id);
                    return (
                        <div key={feat.id} className="card p-3 flex gap-2 items-center" style={{
                            opacity: unlocked ? 1 : 0.7,
                            borderLeft: unlocked ? '4px solid var(--accent-green)' : '4px solid var(--border-color)'
                        }}>
                            <div style={{ fontSize: '28px' }}>{feat.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 style={{ margin: 0 }}>{feat.name}</h4>
                                    {unlocked ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>Unlocked</span>
                                    ) : feat.type === 'free_premium' ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>Premium Only</span>
                                    ) : feat.type === 'auto' ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>Auto</span>
                                    ) : (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)' }}>{feat.cost} Token</span>
                                    )}
                                </div>
                                <p className="text-xs text-secondary mt-1">{feat.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <h2 className="mb-2">📜 Riwayat Token</h2>
            <div className="card card-padding">
                {tokenData.purchaseHistory.length === 0 && tokenData.spendHistory.length === 0 ? (
                    <p className="text-sm text-secondary text-center py-4">Belum ada riwayat transaksi token.</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {[...tokenData.purchaseHistory.map(p => ({ ...p, type: 'in' })), ...tokenData.spendHistory.map(s => ({ ...s, type: 'out' }))]
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 10)
                            .map((item, i) => (
                                <div key={i} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div className="text-sm font-semibold">{item.type === 'in' ? (item.price === 0 ? '🎁 Klaim Harian' : `🛒 Beli ${item.packageName}`) : `🔓 Buka ${item.label}`}</div>
                                        <div className="text-xs text-secondary">{new Date(item.date).toLocaleString('id-ID')}</div>
                                    </div>
                                    <div className={`font-bold ${item.type === 'in' ? 'text-green' : 'text-red'}`} style={{ color: item.type === 'in' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                        {item.type === 'in' ? '+' : '-'}{item.type === 'in' ? item.tokens : item.amount} Token
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

        </div>
    );
}
