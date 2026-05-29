'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/lib/auth';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { useLanguage } from '@/lib/language';
import { Users, Plus, Trophy, Target, TrendingUp, Users as UsersIcon } from 'lucide-react';
import { API_URL } from '@/lib/apiConfig';

export default function SquadsPage() {
  const { user } = useUser();
  const { t } = useLanguage();
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSquad, setNewSquad] = useState({ name: '', description: '' });

  const fetchSquads = useCallback(async () => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const res = await fetch(`${API_URL}/social/squads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSquads(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch squads', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSquads();
  }, [fetchSquads]);

  const handleCreateSquad = async (e) => {
    e.preventDefault();
    if (!newSquad.name.trim()) return;
    setLoading(true);
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const res = await fetch(`${API_URL}/social/squads`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(newSquad)
      });
      if (res.ok) {
        setShowCreate(false);
        setNewSquad({ name: '', description: '' });
        fetchSquads();
      } else {
        alert('Gagal membuat squad.');
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: '#3b82f6' }}>
              <Users size={24} />
            </div>
            Accountability Squads
          </h1>
          <p className="text-secondary" style={{ fontSize: '15px' }}>
            Tantang temanmu, bangun kebiasaan bersama, dan pantau progres secara *real-time*.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Plus size={18} /> Bikin Squad Baru
        </button>
      </div>

      {loading && squads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <p>Loading squads...</p>
        </div>
      ) : squads.length === 0 ? (
        <div className="card card-padding" style={{ textAlign: 'center', padding: '60px 20px', borderStyle: 'dashed' }}>
          <UsersIcon size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h3>Belum punya Squad?</h3>
          <p className="text-secondary mb-3">Bangun komunitas produktivitasmu sendiri dan mulai berkompetisi secara sehat.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Bikin Squad Sekarang</button>
        </div>
      ) : (
        <div className="grid-2">
          {squads.map(squad => (
            <div key={squad.id} className="card card-padding" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{squad.name}</h3>
                  <p className="text-secondary text-sm">{squad.description || 'Tidak ada deskripsi'}</p>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> {squad.member_count} Members
                </div>
              </div>

              <div style={{ flex: 1 }} />
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary w-full" style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                  <Target size={16} /> Lihat Tantangan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bikin Squad Baru</h2>
            </div>
            <form onSubmit={handleCreateSquad} className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Nama Squad</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Contoh: Pejuang Subuh" 
                  value={newSquad.name}
                  onChange={e => setNewSquad({...newSquad, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Deskripsi (Opsional)</label>
                <textarea 
                  className="form-input" 
                  placeholder="Visi squad kamu..." 
                  value={newSquad.description}
                  onChange={e => setNewSquad({...newSquad, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Membuat...' : 'Bikin Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
