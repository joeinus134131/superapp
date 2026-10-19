'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { useUser } from '@superapp/shared/auth';
import { buildMigrationPreview, getDatabaseMigrationState, migrateLocalDataToDatabase } from '@/lib/databaseMigration';
import { useLanguage } from "@superapp/shared/language";


export default function DatabaseMigrationCard() {
  const { tx: translateCopy } = useLanguage();
  const { user } = useUser();
  const userId = user?.id;
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setMessage('');
    try {
      setPreview(await buildMigrationPreview(userId));
      setState(getDatabaseMigrationState());
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const migrate = async () => {
    setLoading(true);
    setMessage('');
    try {
      const completed = await migrateLocalDataToDatabase(userId, preview);
      setState(completed);
      setMessage(translateCopy("Migrasi dan verifikasi selesai untuk {0} kelompok data.", [completed.itemCount]));
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card card-padding mb-3" style={{ border: '1px solid var(--accent-purple)' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Database size={16} /> {translateCopy("Migrasi ke PostgreSQL")}
      </label>
      <p className="text-sm text-secondary mb-2">
        {translateCopy("Salin data cache profil ini ke database secara idempotent. Cache lokal tidak akan dihapus, termasuk bila upload atau verifikasi gagal.")}
      </p>
      <div className="text-sm mb-2">
        {preview ? translateCopy("{0} kelompok data · {1} KB", [preview.itemCount, (preview.byteCount / 1024).toFixed(1)]) : translateCopy("Memeriksa cache lokal…")}
        {state?.status === 'verified' && (
          <span style={{ marginLeft: '8px', color: 'var(--accent-green)' }}><ShieldCheck size={14} style={{ verticalAlign: 'middle' }} /> {translateCopy("Terverifikasi")}</span>
        )}
      </div>
      {message && <p className="text-sm mb-2" role="status">{translateCopy(message)}</p>}
      <div className="flex gap-1">
        <button className="btn btn-primary" disabled={loading || !preview?.itemCount} onClick={migrate}>
          {loading ? translateCopy("Memproses…") : translateCopy("Migrasikan & verifikasi")}
        </button>
        <button className="btn btn-secondary" disabled={loading} onClick={refresh} aria-label={translateCopy("Periksa ulang cache")}>
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  );
}
