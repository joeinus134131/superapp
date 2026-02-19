'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/helpers';
import { addXP, checkAchievements } from '@/lib/gamification';
import { playTaskComplete, playXPGain, playError } from '@/lib/sounds';
import Confetti from '@/components/Confetti';
import LevelUpModal from '@/components/LevelUpModal';

const CATEGORIES = ['Personal', 'Kerja', 'Proyek', 'Belajar', 'Lainnya'];

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('kanban');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [xpToast, setXpToast] = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'P3', category: 'Personal', deadline: '', status: 'todo'
  });

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.TASKS);
    if (saved) setTasks(saved);
  }, []);

  const save = (newTasks) => {
    setTasks(newTasks);
    setData(STORAGE_KEYS.TASKS, newTasks);
  };

  const openAdd = () => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'P3', category: 'Personal', deadline: '', status: 'todo' });
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTask(task);
    setForm({ ...task });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editTask) {
      const wasDone = editTask.status === 'done';
      const nowDone = form.status === 'done';
      const updated = tasks.map(t => t.id === editTask.id ? { ...t, ...form } : t);
      save(updated);
      if (!wasDone && nowDone) rewardXP();
    } else {
      const newTask = { ...form, id: generateId(), createdAt: new Date().toISOString() };
      save([newTask, ...tasks]);
      if (form.status === 'done') rewardXP();
    }
    setShowModal(false);
  };

  const deleteTask = (id) => {
    save(tasks.filter(t => t.id !== id));
    playError();
  };

  const moveTask = (id, newStatus) => {
    const task = tasks.find(t => t.id === id);
    const wasDone = task?.status === 'done';
    save(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (newStatus === 'done' && !wasDone) rewardXP();
  };

  const rewardXP = () => {
    playTaskComplete();
    const result = addXP('TASK_COMPLETE');
    if (result.levelUp) {
      setLevelUpData(result.newLevel);
      setShowConfetti(true);
    }
    setXpToast(`+${result.xpGained} XP`);
    setTimeout(() => setXpToast(null), 2000);
    checkAchievements();
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);
  const todo = filtered.filter(t => t.status === 'todo');
  const inProgress = filtered.filter(t => t.status === 'in-progress');
  const done = filtered.filter(t => t.status === 'done');

  const TaskCard = ({ task }) => (
    <div className="kanban-card" onClick={() => openEdit(task)}>
      <div className="flex items-center gap-1 mb-1">
        <span className="badge" style={{
          background: `${PRIORITY_COLORS[task.priority]}22`,
          color: PRIORITY_COLORS[task.priority]
        }}>
          {task.priority} — {PRIORITY_LABELS[task.priority]}
        </span>
      </div>
      <div className="kanban-card-title">{task.title}</div>
      <div className="kanban-card-meta">
        <span>{task.category}</span>
        {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
      </div>
      <div className="flex gap-1 mt-1">
        {task.status !== 'todo' && (
          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'todo'); }}>
            ← Todo
          </button>
        )}
        {task.status !== 'in-progress' && (
          <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'in-progress'); }}>
            🔄 Progress
          </button>
        )}
        {task.status !== 'done' && (
          <button className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); moveTask(task.id, 'done'); }}>
            ✓ Done
          </button>
        )}
        <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
          🗑
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {xpToast && <div className="xp-toast">⚡ {xpToast}</div>}

      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>✅ Task Manager</h1>
            <p>Kelola semua tugas kamu dengan prioritas dan deadline</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Tambah Task</button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-2">
        <div className="tabs">
          <button className={`tab ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>📋 Kanban</button>
          <button className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>📝 List</button>
        </div>
        <div className="flex gap-1">
          <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto' }}>
            <option value="all">Semua Kategori</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="kanban-board">
          <div className="kanban-column">
            <div className="kanban-column-header">
              <span className="kanban-column-title">📋 To Do <span className="kanban-count">{todo.length}</span></span>
            </div>
            {todo.map(t => <TaskCard key={t.id} task={t} />)}
            {todo.length === 0 && <div className="text-center text-muted text-sm" style={{ padding: '20px' }}>Tidak ada task</div>}
          </div>
          <div className="kanban-column">
            <div className="kanban-column-header">
              <span className="kanban-column-title">🔄 In Progress <span className="kanban-count">{inProgress.length}</span></span>
            </div>
            {inProgress.map(t => <TaskCard key={t.id} task={t} />)}
            {inProgress.length === 0 && <div className="text-center text-muted text-sm" style={{ padding: '20px' }}>Tidak ada task</div>}
          </div>
          <div className="kanban-column">
            <div className="kanban-column-header">
              <span className="kanban-column-title">✅ Done <span className="kanban-count">{done.length}</span></span>
            </div>
            {done.map(t => <TaskCard key={t.id} task={t} />)}
            {done.length === 0 && <div className="text-center text-muted text-sm" style={{ padding: '20px' }}>Tidak ada task</div>}
          </div>
        </div>
      ) : (
        <div className="card card-padding">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3>Belum ada task</h3>
              <p>Mulai tambahkan task pertamamu!</p>
            </div>
          ) : (
            filtered.map(task => (
              <div key={task.id} className="list-item" onClick={() => openEdit(task)} style={{ cursor: 'pointer' }}>
                <div className={`checkbox ${task.status === 'done' ? 'checked' : ''}`} onClick={(e) => {
                  e.stopPropagation();
                  moveTask(task.id, task.status === 'done' ? 'todo' : 'done');
                }}>
                  {task.status === 'done' ? '✓' : ''}
                </div>
                <div className="flex-1">
                  <div style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.6 : 1 }}>
                    {task.title}
                  </div>
                  <div className="text-xs text-muted">{task.category} • {task.priority}</div>
                </div>
                {task.deadline && <span className="badge badge-blue">{formatDate(task.deadline)}</span>}
                <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>🗑</button>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editTask ? 'Edit Task' : 'Tambah Task Baru'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Task</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Apa yang perlu dikerjakan?" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detail tambahan..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prioritas</label>
                    <select className="form-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                      <option value="P1">🔴 P1 — Urgent</option>
                      <option value="P2">🟡 P2 — High</option>
                      <option value="P3">🔵 P3 — Medium</option>
                      <option value="P4">⚪ P4 — Low</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{editTask ? 'Simpan' : 'Tambah Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
