'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getToday, formatDate } from '@/lib/helpers';
import {
  Dumbbell, Droplets, Activity, Scale, Droplet,
  Plus, Trash2, HeartPulse, X, CalendarDays
} from 'lucide-react';
import { useLanguage } from '@/lib/language';

export default function HealthPage() {
  const { t } = useLanguage();
  const [health, setHealth] = useState({ workouts: [], weights: [], waterLog: {} });
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [workoutForm, setWorkoutForm] = useState({ exercise: '', sets: '', reps: '', duration: '', type: 'strength' });
  const [weightForm, setWeightForm] = useState({ weight: '', date: getToday() });
  const [listPage, setListPage] = useState(1);
  const [todayPage, setTodayPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
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
    if (weights.length < 2) return <div className="text-center text-muted text-sm" style={{ padding: '40px' }}>{t('health.need_more_data')}</div>;

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
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Dumbbell size={32} color="var(--accent-cyan)" /> {t('health.title')}</h1>
        <p>{t('health.desc')}</p>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><Dumbbell size={28} /></div>
          <div className="stat-info">
            <h3>{todayWorkouts.length}</h3>
            <p>{t('health.workouts_today')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}><Droplets size={28} /></div>
          <div className="stat-info">
            <h3>{todayWater}<span className="text-sm text-muted">/{WATER_GOAL}</span></h3>
            <p>{t('health.water_glasses')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><Activity size={28} /></div>
          <div className="stat-info">
            <h3>{weekWorkouts.length}</h3>
            <p>{t('health.workouts_week')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><Scale size={28} /></div>
          <div className="stat-info">
            <h3>{health.weights && health.weights.length > 0 ? health.weights[health.weights.length - 1].weight : '—'}<span className="text-sm text-muted"> kg</span></h3>
            <p>{t('health.last_weight')}</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3">
        {/* Water Tracker */}
        <div className="card card-padding">
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Droplets size={20} /> {t('health.water_intake')}</div>
          <p className="text-sm text-secondary mb-2">{t('health.target_glasses')} {WATER_GOAL} {t('health.glasses_per_day')}</p>
          <div className="water-cups mb-2">
            {Array.from({ length: WATER_GOAL }, (_, i) => (
              <div key={i} className={`water-cup ${i < todayWater ? 'filled' : ''}`} onClick={() => toggleWater(i + 1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i < todayWater ? <Droplet size={20} fill="currentColor" /> : ''}
              </div>
            ))}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(todayWater / WATER_GOAL) * 100}%`, background: 'var(--accent-cyan)' }} />
          </div>
          <div className="text-sm text-muted mt-1">{todayWater}/{WATER_GOAL} {t('health.glasses')} ({Math.round((todayWater / WATER_GOAL) * 100)}%)</div>
        </div>

        {/* Weight Chart */}
        <div className="card card-padding">
          <div className="flex justify-between items-center mb-2">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Scale size={20} /> {t('health.weight')}</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWeightModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> {t('health.log_btn')}</button>
          </div>
          <WeightChart />
        </div>
      </div>

      {/* Workout Log */}
      <div className="card card-padding">
        <div className="flex justify-between items-center mb-2">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Activity size={20} /> {t('health.workout_log')}</div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowWorkoutModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={14} /> {t('health.add_workout')}</button>
        </div>

        {todayWorkouts.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-secondary mb-1">{t('health.today_section')}</p>
            {todayWorkouts.slice((todayPage - 1) * ITEMS_PER_PAGE, todayPage * ITEMS_PER_PAGE).map(w => (
              <div key={w.id} className="workout-item">
                <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  {w.type === 'strength' ? <Dumbbell size={18} /> : w.type === 'cardio' ? <Activity size={18} /> : <HeartPulse size={18} />}
                </span>
                <span className="workout-name">{w.exercise}</span>
                <div className="workout-detail">
                  {w.type === 'strength' ? (
                    <><span>{w.sets} {t('health.set')}</span><span>{w.reps} {t('health.rep')}</span></>
                  ) : (
                    <span>{w.duration} {t('health.min')}</span>
                  )}
                </div>
                <button className="btn btn-danger btn-icon sm" onClick={() => deleteWorkout(w.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
              </div>
            ))}
            {todayWorkouts.length > ITEMS_PER_PAGE && (
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-color mb-3">
                    <span className="text-sm text-secondary">
                        {t('health.page')} {todayPage} {t('health.of')} {Math.ceil(todayWorkouts.length / ITEMS_PER_PAGE)}
                    </span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-secondary" disabled={todayPage === 1} onClick={() => setTodayPage(p => p - 1)}>{t('health.prev')}</button>
                        <button className="btn btn-sm btn-secondary" disabled={todayPage * ITEMS_PER_PAGE >= todayWorkouts.length} onClick={() => setTodayPage(p => p + 1)}>{t('health.next')}</button>
                    </div>
                </div>
            )}
          </div>
        )}

        {(() => {
          const pastWorkouts = (health.workouts || []).filter(w => w.date !== today);
          if (pastWorkouts.length === 0) return null;
          
          return (
            <div>
              <p className="text-sm text-secondary mb-1">{t('health.previous_section')}</p>
              {pastWorkouts.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(w => (
                <div key={w.id} className="workout-item" style={{ opacity: 0.7 }}>
                  <span className="text-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    {w.type === 'strength' ? <Dumbbell size={18} /> : w.type === 'cardio' ? <Activity size={18} /> : <HeartPulse size={18} />}
                  </span>
                  <span className="workout-name">{w.exercise}</span>
                  <div className="workout-detail">
                    {w.type === 'strength' ? (
                      <><span>{w.sets} {t('health.set')}</span><span>{w.reps} {t('health.rep')}</span></>
                    ) : (
                      <span>{w.duration} {t('health.min')}</span>
                    )}
                    <span className="text-muted">{formatDate(w.date)}</span>
                  </div>
                  <button className="btn btn-danger btn-icon sm" onClick={() => deleteWorkout(w.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                </div>
              ))}
              {pastWorkouts.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-color">
                      <span className="text-sm text-secondary">
                          {t('health.page')} {listPage} {t('health.of')} {Math.ceil(pastWorkouts.length / ITEMS_PER_PAGE)}
                      </span>
                      <div className="flex gap-2">
                          <button className="btn btn-sm btn-secondary" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>{t('health.prev')}</button>
                          <button className="btn btn-sm btn-secondary" disabled={listPage * ITEMS_PER_PAGE >= pastWorkouts.length} onClick={() => setListPage(p => p + 1)}>{t('health.next')}</button>
                      </div>
                  </div>
              )}
            </div>
          );
        })()}

        {(!health.workouts || health.workouts.length === 0) && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Dumbbell size={48} color="var(--accent-cyan)" /></div>
            <h3>{t('health.no_workouts_yet')}</h3>
            <p>{t('health.start_tracking')}</p>
          </div>
        )}
      </div>

      {/* Workout Modal */}
      {showWorkoutModal && (
        <div className="modal-overlay" onClick={() => setShowWorkoutModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('health.add_workout')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowWorkoutModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={addWorkout}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('health.type')}</label>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    <button type="button" className={`tab ${workoutForm.type === 'strength' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'strength'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Dumbbell size={16} /> {t('health.strength')}</button>
                    <button type="button" className={`tab ${workoutForm.type === 'cardio' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'cardio'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16} /> {t('health.cardio')}</button>
                    <button type="button" className={`tab ${workoutForm.type === 'flexibility' ? 'active' : ''}`} onClick={() => setWorkoutForm({...workoutForm, type: 'flexibility'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><HeartPulse size={16} /> {t('health.flexibility')}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('health.exercise_name')}</label>
                  <input className="form-input" value={workoutForm.exercise} onChange={e => setWorkoutForm({...workoutForm, exercise: e.target.value})} placeholder={t('health.exercise_placeholder')} autoFocus />
                </div>
                {workoutForm.type === 'strength' ? (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t('health.sets_label')}</label>
                      <input type="number" className="form-input" value={workoutForm.sets} onChange={e => setWorkoutForm({...workoutForm, sets: e.target.value})} placeholder="3" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('health.reps_label')}</label>
                      <input type="number" className="form-input" value={workoutForm.reps} onChange={e => setWorkoutForm({...workoutForm, reps: e.target.value})} placeholder="12" />
                    </div>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">{t('health.duration_label')}</label>
                    <input type="number" className="form-input" value={workoutForm.duration} onChange={e => setWorkoutForm({...workoutForm, duration: e.target.value})} placeholder="30" />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWorkoutModal(false)}>{t('health.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('health.save')}</button>
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
              <h2>{t('health.log_weight')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowWeightModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={addWeight}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('health.weight_kg')}</label>
                    <input type="number" step="0.1" className="form-input" value={weightForm.weight} onChange={e => setWeightForm({...weightForm, weight: e.target.value})} placeholder="70.5" autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('health.date')}</label>
                    <input type="date" className="form-input" value={weightForm.date} onChange={e => setWeightForm({...weightForm, date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowWeightModal(false)}>{t('health.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('health.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
