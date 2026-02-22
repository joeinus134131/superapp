'use client';

import { useState, useEffect } from 'react';
import { usePremium } from '@/lib/premium';
import { useUser } from '@/lib/auth';
import {
  Gem, Star, Gift, Package, Sparkles, History, ShoppingCart, Unlock,
  Flame, Cloud, BarChart2, Palette, RefreshCw, HardDrive, AlertCircle
} from 'lucide-react';
import { useLanguage } from '@/lib/language';

const PACKAGE_ICONS = {
  starter: <Star size={48} color="var(--accent-green)" />,
  pro: <Flame size={48} color="var(--accent-purple)" />,
  ultimate: <Gem size={48} color="var(--accent-yellow)" />
};

const FEATURE_ICONS = {
  cloud_auto_sync: <Cloud size={28} color="var(--accent-cyan)" />,
  advanced_analytics: <BarChart2 size={28} color="var(--accent-purple)" />,
  custom_themes: <Palette size={28} color="var(--accent-red)" />,
  cross_device: <RefreshCw size={28} color="var(--accent-green)" />,
  extra_storage: <HardDrive size={28} color="var(--accent-yellow)" />
};

export default function PremiumStore() {
    const {
        tokenData, isPremium, balance, storageLimitMB,
        buyPackage, claimDaily, checkFeature,
        TOKEN_PACKAGES, PREMIUM_FEATURES
    } = usePremium();

    const { user } = useUser();
    const { t } = useLanguage();

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

            // --- BACKDOOR BYPASS ---
            if (data.isBackdoor) {
                const res = buyPackage(pkg.id);
                if (res.success) {
                    showToast(`🔓 [BACKDOOR] ${t('premium.toast_success')} ${res.package.name} (+${res.package.tokens} ${t('premium.token')})`);
                }
                setIsLoading(false);
                return;
            }
            // -----------------------

            // Trigger Midtrans Snap
            window.snap.pay(data.token, {
                onSuccess: function (result) {
                    const res = buyPackage(pkg.id);
                    if (res.success) {
                        showToast(`${t('premium.toast_success')} ${res.package.name} (+${res.package.tokens} ${t('premium.token')})`);
                    }
                },
                onPending: function (result) {
                    showToast(t('premium.toast_pending'));
                },
                onError: function (result) {
                    showToast(t('premium.toast_error'));
                },
                onClose: function () {
                    showToast(t('premium.toast_close'));
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
            showToast(t('premium.toast_claim_success'));
        } else if (res.alreadyClaimed) {
            showToast(t('premium.toast_claim_error'));
        }
    };

    if (!tokenData) return <div className="p-4">Loading Token Data...</div>;

    return (
        <div>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Gem size={32} color="var(--accent-purple)" /> {t('premium.title')}</h1>
                        <p>{t('premium.desc')}</p>
                    </div>
                    <div className="dashboard-level-badge" style={{ borderColor: 'var(--accent-purple)', background: 'var(--bg-card)' }}>
                        <span style={{ color: 'var(--accent-purple)', fontSize: '18px', fontWeight: 700 }}>{balance}</span>
                        <span className="text-xs text-secondary">{t('premium.token')}</span>
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
                        <h2 className="mb-1" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>{t('premium.status')} {isPremium ? <><Star size={20} color="var(--accent-yellow)" fill="var(--accent-yellow)" /> {t('premium.premium_user')}</> : t('premium.standard_user')}</h2>
                        {tokenData.activePlan && (
                            <p className="text-sm font-bold opacity-100" style={{ color: 'var(--accent-green)' }}>
                                {t('premium.current_plan')} {TOKEN_PACKAGES.find(p => p.id === tokenData.activePlan)?.name || t('premium.custom')}
                            </p>
                        )}
                        <p className="opacity-90 text-sm mt-1">
                            {t('premium.storage_capacity')} <strong>{storageLimitMB} MB</strong>
                            {tokenData.bonusStorageMB > 0 && ` (+${tokenData.bonusStorageMB} MB ${t('premium.bonus')})`}
                        </p>
                    </div>
                    <button
                        className="btn"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={handleClaim}
                    >
                        <Gift size={16} /> {t('premium.claim_daily')}
                    </button>
                </div>
            </div>

            <h2 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Package size={20} /> {t('premium.buy_tokens')}</h2>
            <div className="mb-4">
                <p className="text-sm text-secondary mb-3">
                    {t('premium.payment_info')}
                </p>
                
                <div className="p-3 rounded text-sm flex items-start gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginTop: '12px' }}>
                    <div style={{ color: 'var(--accent-red)', marginTop: '2px' }}><AlertCircle size={18} /></div>
                    <div>
                        <strong style={{ color: 'var(--text-primary)' }}>{t('premium.payment_issue')}</strong><br/>
                        <span className="text-secondary">{t('premium.payment_issue_desc')}</span><br/>
                        <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                            • WhatsApp: <a href="https://wa.me/6283802436288" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'underline', fontWeight: 600 }}>083802436288</a><br/>
                            • Email: <a href="mailto:idnmakerspace@gmail.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)', textDecoration: 'underline', fontWeight: 600 }}>idnmakerspace@gmail.com</a>
                        </div>
                    </div>
                </div>
            </div>

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
                                {t('premium.best_value')}
                            </div>
                        )}
                        <div className="flex flex-col items-center text-center">
                            <span style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{PACKAGE_ICONS[pkg.id] || <Package size={48} />}</span>
                            <h3 style={{ color: pkg.color, marginBottom: '4px' }}>{pkg.name}</h3>
                            <p className="text-xs text-secondary mb-2">{pkg.desc}</p>

                            <div style={{ fontSize: '32px', fontWeight: 800, margin: '12px 0' }}>
                                <span className="text-lg text-secondary align-top" style={{ marginRight: '4px' }}>{t('premium.token')}</span>
                                {pkg.tokens}
                            </div>

                            <div className="w-full flex flex-col gap-1 mb-3 text-sm">
                                <div className="flex justify-between items-center py-1 border-b border-color">
                                    <span className="text-secondary">{t('premium.bonus_storage')}</span>
                                    <span className="font-semibold text-green">+{pkg.bonusStorage} MB</span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b border-color">
                                    <span className="text-secondary">{t('premium.cross_sync')}</span>
                                    <span className="font-semibold">{t('premium.free_access')}</span>
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
                                {isLoading ? t('premium.processing') : `${t('premium.buy_btn')} ${pkg.priceLabel}`}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <h2 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Sparkles size={20} color="var(--accent-yellow)" /> {t('premium.features_title')}</h2>
            <div className="grid-2 mb-4">
                {PREMIUM_FEATURES.map(feat => {
                    const unlocked = checkFeature(feat.id);
                    return (
                        <div key={feat.id} className="card p-3 flex gap-2 items-center" style={{
                            opacity: unlocked ? 1 : 0.7,
                            borderLeft: unlocked ? '4px solid var(--accent-green)' : '4px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px' }}>{FEATURE_ICONS[feat.id] || <Sparkles size={28} />}</div>
                            <div style={{ flex: 1 }}>
                                <div className="flex justify-between items-center mb-1">
                                    <h4 style={{ margin: 0 }}>{feat.name}</h4>
                                    {unlocked ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-green)' }}>{t('premium.unlocked')}</span>
                                    ) : feat.type === 'free_premium' ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>{t('premium.premium_only')}</span>
                                    ) : feat.type === 'auto' ? (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>{t('premium.auto')}</span>
                                    ) : (
                                        <span className="text-xs font-semibold px-2 py-1 rounded" style={{ background: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-purple)' }}>{feat.cost} {t('premium.token')}</span>
                                    )}
                                </div>
                                <p className="text-xs text-secondary mt-1">{feat.desc}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <h2 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} /> {t('premium.history_title')}</h2>
            <div className="card card-padding">
                {tokenData.purchaseHistory.length === 0 && tokenData.spendHistory.length === 0 ? (
                    <p className="text-sm text-secondary text-center py-4">{t('premium.no_history')}</p>
                ) : (
                    <div className="flex flex-col gap-2">
                        {[...tokenData.purchaseHistory.map(p => ({ ...p, type: 'in' })), ...tokenData.spendHistory.map(s => ({ ...s, type: 'out' }))]
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .slice(0, 10)
                            .map((item, i) => (
                                <div key={i} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <div>
                                        <div className="text-sm font-semibold" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {item.type === 'in' ? (item.price === 0 ? <><Gift size={14} color="var(--accent-green)" /> {t('premium.daily_claim')}</> : <><ShoppingCart size={14} color="var(--accent-green)" /> {t('premium.buy')} {item.packageName}</>) : <><Unlock size={14} color="var(--accent-yellow)" /> {t('premium.unlock')} {item.label}</>}
                                        </div>
                                        <div className="text-xs text-secondary">{new Date(item.date).toLocaleString('id-ID')}</div>
                                    </div>
                                    <div className={`font-bold ${item.type === 'in' ? 'text-green' : 'text-red'}`} style={{ color: item.type === 'in' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                        {item.type === 'in' ? '+' : '-'}{item.type === 'in' ? item.tokens : item.amount} {t('premium.token')}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

        </div>
    );
}
