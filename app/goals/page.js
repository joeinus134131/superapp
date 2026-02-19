'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, getToday } from '@/lib/helpers';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Personal', targetDate: '', milestones: [], completed: false
  });
  const [newMilestone, setNewMilestone] = useState('');

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.GOALS);
    if (saved) setGoals(saved);
  }, []);

  const save = (g) => { setGoals(g); setData(STORAGE_KEYS.GOALS, g); };

  const openAdd = () => {
    setEditGoal(null);
    setForm({ title: '', description: '', category: 'Personal', targetDate: '', milestones: [], completed: false });
    setNewMilestone('');
    setShowModal(true);
  };

  const openEdit = (goal) => {
    setEditGoal(goal);
    setForm({ ...goal });
    setNewMilestone('');
    setShowModal(true);
  };

  const addMilestone = () => {
    if (!newMilestone.trim()) return;
    setForm({ ...form, milestones: [...form.milestones, { id: generateId(), text: newMilestone.trim(), done: false }] });
    setNewMilestone('');
  };

  const toggleMilestone = (goalId, msId) => {
    save(goals.map(g => {
      if (g.id !== goalId) return g;
      return { ...g, milestones: g.milestones.map(m => m.id === msId ? { ...m, done: !m.done } : m) };
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editGoal) {
      save(goals.map(g => g.id === editGoal.id ? { ...g, ...form } : g));
    } else {
      save([{ ...form, id: generateId(), createdAt: new Date().toISOString() }, ...goals]);
    }
    setShowModal(false);
  };

  const deleteGoal = (id) => save(goals.filter(g => g.id !== id));
  const completeGoal = (id) => save(goals.map(g => g.id === id ? { ...g, completed: !g.completed } : g));

  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);

  const getProgress = (goal) => {
    if (!goal.milestones || goal.milestones.length === 0) return goal.completed ? 100 : 0;
    const done = goal.milestones.filter(m => m.done).length;
    return Math.round((done / goal.milestones.length) * 100);
  };

  const CATEGORIES = ['Personal', 'Karir', 'Kesehatan', 'Keuangan', 'Edukasi', 'Hubungan'];
  const CAT_EMOJIS = { Personal: '🌟', Karir: '💼', Kesehatan: '💪', Keuangan: '💰', Edukasi: '📚', Hubungan: '❤️' };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>🎯 Goal Setting</h1>
            <p>Tetapkan target dan raih impianmu langkah demi langkah</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Tambah Goal</button>
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>🎯</div>
          <div className="stat-info">
            <h3>{active.length}</h3>
            <p>Goals Aktif</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>✅</div>
          <div className="stat-info">
            <h3>{completed.length}</h3>
            <p>Goals Selesai</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>📊</div>
          <div className="stat-info">
            <h3>{goals.length > 0 ? Math.round(goals.reduce((s, g) => s + getProgress(g), 0) / goals.length) : 0}%</h3>
            <p>Rata-rata Progress</p>
          </div>
        </div>
      </div>

      {/* Active Goals */}
      {active.length > 0 && (
        <div className="mb-3">
          <h2 className="text-lg font-semibold mb-2">🔥 Goals Aktif</h2>
          <div className="grid-auto">
            {active.map(goal => {
              const progress = getProgress(goal);
              return (
                <div key={goal.id} className="card card-padding" style={{ cursor: 'pointer' }} onClick={() => openEdit(goal)}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="badge badge-purple">{CAT_EMOJIS[goal.category] || '🎯'} {goal.category}</span>
                    <div className="flex gap-1">
                      <button className="btn btn-success btn-icon sm" onClick={(e) => { e.stopPropagation(); completeGoal(goal.id); }}>✓</button>
                      <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteGoal(goal.id); }}>🗑</button>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1" style={{ fontSize: '16px' }}>{goal.title}</h3>
                  {goal.description && <p className="text-sm text-secondary mb-2">{goal.description}</p>}
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted">Progress</span>
                    <span className="text-xs font-semibold">{progress}%</span>
                  </div>
                  <div className="progress-bar mb-2">
                    <div className="progress-fill green" style={{ width: `${progress}%` }} />
                  </div>
                  {goal.milestones && goal.milestones.length > 0 && (
                    <div className="text-xs text-muted">
                      {goal.milestones.filter(m => m.done).length}/{goal.milestones.length} milestones
                    </div>
                  )}
                  {goal.targetDate && (
                    <div className="text-xs text-muted mt-1">🎯 Target: {formatDate(goal.targetDate)}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">✅ Selesai</h2>
          <div className="grid-auto">
            {completed.map(goal => (
              <div key={goal.id} className="card card-padding" style={{ opacity: 0.7 }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="badge badge-green">✅ Completed</span>
                  <button className="btn btn-danger btn-icon sm" onClick={() => deleteGoal(goal.id)}>🗑</button>
                </div>
                <h3 className="font-semibold" style={{ textDecoration: 'line-through', fontSize: '16px' }}>{goal.title}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="card card-padding">
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <h3>Belum ada goals</h3>
            <p>Tetapkan target pertamamu dan mulai perjalanan!</p>
            <button className="btn btn-primary mt-2" onClick={openAdd}>+ Tambah Goal</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editGoal ? 'Edit Goal' : 'Goal Baru'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Goal</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Apa yang ingin kamu capai?" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Kenapa goal ini penting?" style={{ minHeight: '80px' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJIS[c]} {c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Tanggal</label>
                    <input type="date" className="form-input" value={form.targetDate} onChange={e => setForm({...form, targetDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Milestones</label>
                  {form.milestones.map((ms, i) => (
                    <div key={ms.id} className="flex items-center gap-1 mb-1">
                      <div className={`checkbox ${ms.done ? 'checked' : ''}`}
                        onClick={() => {
                          const updated = [...form.milestones];
                          updated[i] = { ...updated[i], done: !updated[i].done };
                          setForm({...form, milestones: updated});
                        }}>
                        {ms.done ? '✓' : ''}
                      </div>
                      <span className="text-sm flex-1" style={{ textDecoration: ms.done ? 'line-through' : 'none' }}>{ms.text}</span>
                      <button type="button" className="btn btn-danger btn-icon sm"
                        onClick={() => setForm({...form, milestones: form.milestones.filter((_, j) => j !== i)})}>✕</button>
                    </div>
                  ))}
                  <div className="form-inline mt-1">
                    <input className="form-input" value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                      placeholder="Tambah milestone..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMilestone(); }}} />
                    <button type="button" className="btn btn-secondary" onClick={addMilestone}>+</button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{editGoal ? 'Simpan' : 'Buat Goal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
