'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getToday, formatDate } from '@/lib/helpers';

export default function HealthPage() {
  const [health, setHealth] = useState({ workouts: [], weights: [], waterLog: {} });
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({ exercise: '', sets: '', reps: '', duration: '', type: 'strength' });
  const [weightForm, setWeightForm] = useState({ weight: '', date: getToday() });
  const today = getToday();

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.HEALTH);
    if (saved) setHealth(saved);
  }, []);

  const save = (h) => { setHealth(h); setData(STORAGE_KEYS.HEALTH, h); };

  // Water
  const todayWater = health.waterLog?.[today] || 0;
  const WATER_GOAL = 8;
  const toggleWater = (cup) => {
    const newLog = { ...health.waterLog };
    if (todayWater >= cup) {
      newLog[today] = cup - 1;
    } else {
      newLog[today] = cup;
    }
    save({ ...health, waterLog: newLog });
  };

  // Workouts
  const addWorkout = (e) => {
    e.preventDefault();
    if (!workoutForm.exercise.trim()) return;
    const workout = {
      id: generateId(),
      ...workoutForm,
      sets: Number(workoutForm.sets) || 0,
      reps: Number(workoutForm.reps) || 0,
      duration: Number(workoutForm.duration) || 0,
      date: today,
      createdAt: new Date().toISOString(),
    };
    save({ ...health, workouts: [workout, ...(health.workouts || [])] });
    setWorkoutForm({ exercise: '', sets: '', reps: '', duration: '', type: 'strength' });
    setShowWorkoutModal(false);
  };

  const deleteWorkout = (id) => {
    save({ ...health, workouts: health.workouts.filter(w => w.id !== id) });
  };

  // Weight
  const addWeight = (e) => {
    e.preventDefault();
    if (!weightForm.weight) return;
    const entry = { id: generateId(), weight: Number(weightForm.weight), date: weightForm.date };
    save({ ...health, weights: [...(health.weights || []), entry].sort((a, b) => new Date(a.date) - new Date(b.date)) });
    setWeightForm({ weight: '', date: getToday() });
    setShowWeightModal(false);
  };

  const todayWorkouts = (health.workouts || []).filter(w => w.date === today);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekWorkouts = (health.workouts || []).filter(w => new Date(w.date) >= weekAgo);

  // Weight chart (simple line)
  const WeightChart = () => {
    const weights = health.weights || [];
    if (weights.length < 2) return <div className="text-center text-muted text-sm" style={{ padding: '40px' }}>Perlu minimal 2 data untuk chart</div>;

    const last14 = weights.slice(-14);
    const minW = Math.min(...last14.map(w => w.weight)) - 2;
    const maxW = Math.max(...last14.map(w => w.weight)) + 2;
    const range = maxW - minW || 1;
    const svgW = 400;
    const svgH = 160;
    const padding = 20;

    const points = last14.map((w, i) => {
      const x = padding + (i / (last14.length - 1)) * (svgW - padding * 2);
      const y = svgH - padding - ((w.weight - minW) / range) * (svgH - padding * 2);
      return { x, y, weight: w.weight, date: w.date };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

    return (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = svgH - padding - pct * (svgH - padding * 2);
          const val = (minW + pct * range).toFixed(1);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={svgW - padding} y2={y} stroke="rgba(255,255,255,0.05)" />
              <text x={4} y={y + 4} fill="var(--text-muted)" fontSize="9">{val}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke="url(#weightGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Gradient def */}
        <defs>
          <linearGradient id="weightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-purple)" />
            <stop offset="100%" stopColor="var(--accent-cyan)" />
          </linearGradient>
        </defs>
        {/* Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--bg-secondary)" stroke="var(--accent-purple)" strokeWidth="2" />
        ))}
      </svg>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>💪 Health & Fitness</h1>
        <p>Lacak workout, berat badan, dan intake air harianmu</p>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>🏋️</div>
          <div className="stat-info">
            <h3>{todayWorkouts.length}</h3>
            <p>Workout Hari Ini</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>💧</div>
          <div className="stat-info">
            <h3>{todayWater}<span className="text-sm text-muted">/{WATER_GOAL}</span></h3>
            <p>Gelas Air</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>📅</div>
          <div className="stat-info">
            <h3>{weekWorkouts.length}</h3>
            <p>Workout Minggu Ini</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>⚖️</div>
          <div className="stat-info">
            <h3>{health.weights && health.weights.length > 0 ? health.weights[health.weights.length - 1].weight : '—'}<span className="text-sm text-muted"> kg</span></h3>
            <p>Berat Terakhir</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3">
        {/* Water Tracker */}
        <div className="card card-padding">
          <div className="card-title mb-2">💧 Water Intake</div>
          <p className="text-sm text-secondary mb-2">Target: {WATER_GOAL} gelas per hari</p>
          <div className="water-cups mb-2">
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <div key={i} className={`water-cup ${i < todayWater ? 'filled' : ''}`} onClick={() => toggleWater(i + 1)}>
                {i < todayWater ? '💧' : ''}
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(todayWater / WATER_GOAL) * 100}%`, background: 'var(--accent-cyan)' }} />
          </div>
          <div className="text-sm text-muted mt-1">{todayWater}/{WATER_GOAL} gelas ({Math.round((todayWater / WATER_GOAL) * 100)}%)</div>
        </div>

        {/* Weight Chart */}
        <div className="card card-padding">
          <div className="flex justify-between items-center mb-2">
            <div className="card-title">⚖️ Berat Badan</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWeightModal(true)}>+ Catat</button>
          </div>
          <WeightChart />
        </div>
      </div>

      {/* Workout Log */}
      <div className="card card-padding">
        <div className="flex justify-between items-center mb-2">
          <div className="card-title">🏋️ Workout Log</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowWorkoutModal(true)}>+ Tambah Workout</button>
        </div>

        {todayWorkouts.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-secondary mb-1">Hari Ini</p>
            {todayWorkouts.map(w => (
              <div key={w.id} className="workout-item">
                <span style={{ fontSize: '20px' }}>{w.type === 'strength' ? '🏋️' : w.type === 'cardio' ? '🏃' : '🧘'}</span>
                <span className="workout-name">{w.exercise}</span>
                <div className="workout-detail">
                  {w.type === 'strength' ? (
                    <><span>{w.sets} set</span><span>{w.reps} rep</span></>
                  ) : (
                    <span>{w.duration} menit</span>
                  )}
                </div>
                <button className="btn btn-danger btn-icon sm" onClick={() => deleteWorkout(w.id)}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {(health.workouts || []).filter(w => w.date !== today).length > 0 && (
          <div>
            <p className="text-sm text-secondary mb-1">Sebelumnya</p>
            {(health.workouts || []).filter(w => w.date !== today).slice(0, 10).map(w => (
              <div key={w.id} className="workout-item" style={{ opacity: 0.7 }}>
                <span style={{ fontSize: '20px' }}>{w.type === 'strength' ? '🏋️' : w.type === 'cardio' ? '🏃' : '🧘'}</span>
                <span className="workout-name">{w.exercise}</span>
                <div className="workout-detail">
                  {w.type === 'strength' ? (
                    <><span>{w.sets} set</span><span>{w.reps} rep</span></>
                  ) : (
                    <span>{w.duration} menit</span>
                  )}
                  <span className="text-muted">{formatDate(w.date)}</span>
                </div>
                <button className="btn btn-danger btn-icon sm" onClick={() => deleteWorkout(w.id)}>🗑</button>
              </div>
            ))}
          </div>
        )}

        {(!health.workouts || health.workouts.length === 0) && (
          <div className="empty-state">
            <div className="empty-state-icon">💪</div>
            <h3>Belum ada workout</h3>
            <p>Mulai catat latihan harianmu!</p>
          </div>
        )}
      </div>

      {/* Workout Modal */}
      {showWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowWorkoutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Workout</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowWorkoutModal(false)}>✕</button>
            </div>
            <form onSubmit={addWorkout}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    <button type="button" className={`tab ${workoutForm.type === 'strength' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'strength'})}>🏋️ Strength</button>
                    <button type="button" className={`tab ${workoutForm.type === 'cardio' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'cardio'})}>🏃 Cardio</button>
                    <button type="button" className={`tab ${workoutForm.type === 'flexibility' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'flexibility'})}>🧘 Flexibility</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Nama Latihan</label>
                  <input className="form-input" value={workoutForm.exercise} onChange={e => setWorkoutForm({...workoutForm, exercise: e.target.value})} placeholder="Push up, Lari, Yoga..." autoFocus />
                </div>
                {workoutForm.type === 'strength' ? (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Set</label>
                      <input type="number" className="form-input" value={workoutForm.sets} onChange={e => setWorkoutForm({...workoutForm, sets: e.target.value})} placeholder="3" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Rep</label>
                      <input type="number" className="form-input" value={workoutForm.reps} onChange={e => setWorkoutForm({...workoutForm, reps: e.target.value})} placeholder="12" />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Durasi (menit)</label>
                    <input type="number" className="form-input" value={workoutForm.duration} onChange={e => setWorkoutForm({...workoutForm, duration: e.target.value})} placeholder="30" />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWorkoutModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Weight Modal */}
      {showWeightModal && (
        <div className="modal-overlay" onClick={() => setShowWeightModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Catat Berat Badan</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowWeightModal(false)}>✕</button>
            </div>
            <form onSubmit={addWeight}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Berat (kg)</label>
                    <input type="number" step="0.1" className="form-input" value={weightForm.weight} onChange={e => setWeightForm({...weightForm, weight: e.target.value})} placeholder="70.5" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input type="date" className="form-input" value={weightForm.date} onChange={e => setWeightForm({...weightForm, date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
