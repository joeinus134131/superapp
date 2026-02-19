'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, getToday, MOOD_EMOJIS } from '@/lib/helpers';

export default function JournalPage() {
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', content: '', mood: 'good', date: getToday() });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.JOURNAL);
    if (saved) setEntries(saved);
  }, []);

  const save = (e) => { setEntries(e); setData(STORAGE_KEYS.JOURNAL, e); };

  const createNew = () => {
    setForm({ title: '', content: '', mood: 'good', date: getToday() });
    setSelected(null);
    setIsEditing(true);
  };

  const selectEntry = (entry) => {
    setSelected(entry);
    setForm({ ...entry });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (selected) {
      const updated = entries.map(e => e.id === selected.id ? { ...e, ...form, updatedAt: new Date().toISOString() } : e);
      save(updated);
      setSelected({ ...selected, ...form });
    } else {
      const newEntry = { ...form, id: generateId(), createdAt: new Date().toISOString() };
      save([newEntry, ...entries]);
      setSelected(newEntry);
    }
    setIsEditing(false);
  };

  const deleteEntry = (id) => {
    save(entries.filter(e => e.id !== id));
    if (selected && selected.id === id) {
      setSelected(null);
      setIsEditing(false);
    }
  };

  const filtered = search
    ? entries.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const moodCount = {};
  entries.forEach(e => { moodCount[e.mood] = (moodCount[e.mood] || 0) + 1; });

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>📝 Journal & Notes</h1>
            <p>Tulis pikiran, refleksi, dan catatan harianmu</p>
          </div>
          <button className="btn btn-primary" onClick={createNew}>+ Tulis Baru</button>
        </div>
      </div>

      {/* Mood Stats */}
      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>📝</div>
          <div className="stat-info">
            <h3>{entries.length}</h3>
            <p>Total Jurnal</p>
          </div>
        </div>
        {Object.entries(MOOD_EMOJIS).map(([key, emoji]) => (
          <div key={key} className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>{emoji}</div>
            <div className="stat-info">
              <h3>{moodCount[key] || 0}</h3>
              <p style={{ textTransform: 'capitalize' }}>{key}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '320px 1fr', alignItems: 'start' }}>
        {/* Entry List */}
        <div className="card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <input className="form-input" placeholder="🔍 Cari jurnal..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p className="text-muted text-sm">Belum ada jurnal</p>
            </div>
          ) : (
            filtered.map(entry => (
              <div key={entry.id}
                className="list-item"
                style={{
                  cursor: 'pointer',
                  background: selected?.id === entry.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                  borderLeft: selected?.id === entry.id ? '3px solid var(--accent-purple)' : '3px solid transparent',
                  margin: '0',
                  borderRadius: '0',
                }}
                onClick={() => selectEntry(entry)}>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="flex items-center gap-1">
                    <span>{MOOD_EMOJIS[entry.mood] || '🙂'}</span>
                    <span className="font-semibold truncate" style={{ fontSize: '14px' }}>{entry.title}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">{formatDate(entry.date)}</div>
                </div>
                <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }}>🗑</button>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="card card-padding">
          {!selected && !isEditing ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>Pilih atau buat jurnal</h3>
              <p>Pilih jurnal dari daftar di sebelah kiri, atau buat yang baru.</p>
              <button className="btn btn-primary mt-2" onClick={createNew}>+ Tulis Baru</button>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                      placeholder="Judul jurnal..." style={{ fontSize: '18px', fontWeight: '600', background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent-purple)', borderRadius: 0, padding: '4px 0' }} />
                  ) : (
                    <h2 style={{ fontSize: '20px' }}>{selected?.title}</h2>
                  )}
                </div>
                <div className="flex gap-1">
                  {isEditing ? (
                    <>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditing(false); if (!selected) setSelected(null); }}>Batal</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSave}>💾 Simpan</button>
                    </>
                  ) : (
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>✏️ Edit</button>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-secondary">Mood:</span>
                  <div className="mood-selector">
                    {Object.entries(MOOD_EMOJIS).map(([key, emoji]) => (
                      <button key={key} type="button" className={`mood-btn ${form.mood === key ? 'selected' : ''}`} onClick={() => setForm({...form, mood: key})}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: 'auto' }} />
                </div>
              )}

              {isEditing ? (
                <textarea className="form-textarea" value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  placeholder="Tulis pikiranmu di sini..."
                  style={{ minHeight: '400px', fontSize: '15px', lineHeight: '1.8' }} />
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm text-muted">
                    <span>{MOOD_EMOJIS[selected?.mood]} {selected?.mood}</span>
                    <span>•</span>
                    <span>{formatDate(selected?.date)}</span>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '15px', color: 'var(--text-secondary)' }}>
                    {selected?.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
