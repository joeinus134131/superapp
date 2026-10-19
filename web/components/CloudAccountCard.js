'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, LogIn, UserPlus } from 'lucide-react';
import { useUser } from '@superapp/shared/auth';
import { connectCloudAccount, disconnectCloudAccount, getCloudAccessToken, getCloudAccount } from '@superapp/shared/cloud-auth';
import { API_URL } from '@/lib/apiConfig';
import { useLanguage } from "@superapp/shared/language";


export default function CloudAccountCard() {
  const { tx: translateCopy } = useLanguage();
  const { user, updateProfile } = useUser();
  const [account, setAccount] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createMode, setCreateMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getCloudAccount().then(setAccount);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const connected = await connectCloudAccount(email, password, { create: createMode });
      if (user?.id) {
        await updateProfile({ authUserId: connected.userId, cloudEmail: connected.email });
      }
      const token = await getCloudAccessToken();
      if (token) {
        await fetch(`${API_URL}/users/sync`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: connected.email }),
        }).catch(() => {});
      }
      setAccount(connected);
      setPassword('');
      setMessage(translateCopy("Akun cloud terhubung. Kamu bisa menjalankan migrasi ke PostgreSQL."));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await disconnectCloudAccount();
      setAccount(null);
      setMessage(translateCopy("Akun cloud diputuskan. Data di perangkat tetap aman."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card card-padding mb-3" style={{ border: '1px solid var(--accent-cyan)' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Cloud size={16} /> {translateCopy("Akun Cloud")}
      </label>

      {account ? (
        <>
          <p className="text-sm text-secondary mb-2">
            {translateCopy("Terhubung sebagai")} <strong>{account.email || account.userId}</strong>{translateCopy(". Sesi Supabase ini dipakai untuk menyimpan data ke database.")}
          </p>
          {message && <p className="text-sm mb-2" role="status">{message}</p>}
          <button className="btn btn-secondary" disabled={loading} onClick={handleDisconnect} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CloudOff size={16} /> {loading ? translateCopy("Memproses…") : translateCopy("Putuskan akun")}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-secondary mb-2">
            {translateCopy("Hubungkan profil ini ke akun Supabase agar migrasi database bisa berjalan. Data tetap berada di perangkat ini sampai kamu memigrasikannya.")}
          </p>
          <div className="grid-2" style={{ gap: '12px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs" htmlFor="cloud-email">{translateCopy("Email")}</label>
              <input id="cloud-email" type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label text-xs" htmlFor="cloud-password">{translateCopy("Password")}</label>
              <input id="cloud-password" type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={translateCopy("Minimal 6 karakter")} autoComplete={createMode ? 'new-password' : 'current-password'} />
            </div>
          </div>
          {error && <p className="text-sm mb-2" role="alert" style={{ color: 'var(--accent-red)' }}>{translateCopy(error)}</p>}
          {message && <p className="text-sm mb-2" role="status">{message}</p>}
          <div className="flex gap-1">
            <button className="btn btn-primary" disabled={loading || !email || !password} onClick={handleConnect} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {createMode ? <UserPlus size={16} /> : <LogIn size={16} />}
              {loading ? translateCopy("Memproses…") : createMode ? translateCopy("Buat akun cloud") : translateCopy("Hubungkan akun cloud")}
            </button>
            <button className="btn btn-secondary" disabled={loading} onClick={() => { setCreateMode(!createMode); setError(''); }}>
              {createMode ? translateCopy("Sudah punya akun? Masuk") : translateCopy("Belum punya akun? Buat")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
