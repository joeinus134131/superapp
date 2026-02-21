'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker, requestPermission, getPermissionStatus,
  startScheduler, showNotification,
  getReminders, addReminder, deleteReminder, toggleReminder,
  getNotificationHistory, REMINDER_TEMPLATES, addFromTemplate,
} from '@/lib/notifications';
import {
  Bell, CheckSquare, Target, Droplets, Coffee, Timer, Dumbbell,
  FlaskConical, Plus, Rocket, MailCheck, CheckCircle2, AlertTriangle, Zap,
  Package, History, BellOff, Clock, Trash2, Inbox, X, Flame
} from 'lucide-react';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const CATEGORY_ICONS = {
  habit: Flame, task: CheckSquare, goal: Target, water: Droplets,
  break: Coffee, pomodoro: Timer, health: Dumbbell, custom: Bell,
};

export default function NotificationsPage() {
  const [permission, setPermission] = useState('default');
  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders');
  const [form, setForm] = useState({
    title: '', body: '', time: '08:00', category: 'custom', url: '/',
    days: [0, 1, 2, 3, 4, 5, 6],
  });

  const refresh = useCallback(() => {
    setReminders(getReminders());
    setHistory(getNotificationHistory());
  }, []);

  useEffect(() => {
    setPermission(getPermissionStatus());
    registerServiceWorker();
    startScheduler();
    refresh();
  }, [refresh]);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await registerServiceWorker();
      startScheduler();
      showNotification('🎉 Notifikasi Aktif!', 'SuperApp sekarang bisa mengirim reminder ke kamu. Brutal mode ON! 🔥');
    }
  };

  const handleTestNotif = () => {
    showNotification('⚡ Test Notification', 'Ini test notifikasi dari SuperApp. Semuanya berjalan sempurna! 💪');
  };

  const handleAddReminder = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    addReminder(form);
    refresh();
    setShowAddModal(false);
    setForm({ title: '', body: '', time: '08:00', category: 'custom', url: '/', days: [0, 1, 2, 3, 4, 5, 6] });
  };

  const handleDelete = (id) => {
    deleteReminder(id);
    refresh();
  };

  const handleToggle = (id) => {
    toggleReminder(id);
    refresh();
  };

  const handleAddTemplate = (template) => {
    addFromTemplate(template);
    refresh();
  };

  const toggleDay = (dayIdx) => {
    setForm(prev => {
      const days = prev.days.includes(dayIdx)
        ? prev.days.filter(d => d !== dayIdx)
        : [...prev.days, dayIdx].sort();
      return { ...prev, days };
    });
  };

  const activeReminders = reminders.filter(r => r.enabled).length;

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={32} color="var(--accent-purple)" /> Notifikasi & Reminder</h1>
            <p>Atur reminder brutal biar kamu nggak pernah lupa!</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-secondary" onClick={handleTestNotif} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FlaskConical size={16} /> Test</button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Tambah Reminder</button>
          </div>
        </div>
      </div>

      {/* Permission Banner */}
      {permission !== 'granted' && (
        <div className="notif-permission-banner">
          <div className="notif-permission-content">
            <div className="notif-permission-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={24} /></div>
            <div>
              <h3>{permission === 'denied' ? 'Notifikasi Diblokir' : 'Aktifkan Notifikasi'}</h3>
              <p>
                {permission === 'denied'
                  ? 'Notifikasi diblokir di browser. Buka Settings Browser → Site Settings → Notifications untuk mengaktifkan.'
                  : 'Izinkan notifikasi agar SuperApp bisa mengirim reminder langsung ke device kamu — bahkan saat tab tertutup!'}
              </p>
            </div>
            {permission !== 'denied' && (
              <button className="btn btn-primary btn-lg" onClick={handleRequestPermission} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                Aktifkan Sekarang <Rocket size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><Bell size={28} /></div>
          <div className="stat-info">
            <h3>{activeReminders}</h3>
            <p>Reminder Aktif</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><MailCheck size={28} /></div>
          <div className="stat-info">
            <h3>{history.length}</h3>
            <p>Notif Terkirim</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: permission === 'granted' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: permission === 'granted' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {permission === 'granted' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className="stat-info">
            <h3>{permission === 'granted' ? 'Aktif' : 'Off'}</h3>
            <p>Status Izin</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><Zap size={28} /></div>
          <div className="stat-info">
            <h3>{reminders.length}</h3>
            <p>Total Reminder</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-2">
        <button className={`tab ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={16} /> Reminder ({reminders.length})
        </button>
        <button className={`tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={16} /> Template Cepat
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <History size={16} /> Riwayat ({history.length})
        </button>
      </div>

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="card card-padding">
          {reminders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><BellOff size={48} color="var(--accent-purple)" /></div>
              <h3>Belum ada reminder</h3>
              <p>Tambahkan reminder atau pakai template cepat biar kamu selalu diingetin!</p>
              <button className="btn btn-primary mt-2" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Tambah Reminder</button>
            </div>
          ) : (
              <div className="reminder-list">
                {reminders.map(r => {
                  const Icon = CATEGORY_ICONS[r.category] || Bell;
                  return (
                    <div key={r.id} className={`reminder-item ${!r.enabled ? 'disabled' : ''}`}>
                      <div className="reminder-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} /></div>
                      <div className="reminder-info">
                        <h4>{r.title}</h4>
                        <div className="reminder-meta">
                          <span className="reminder-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {r.time}</span>
                      <span className="reminder-days">
                        {r.days.length === 7 ? 'Setiap hari' : r.days.map(d => DAY_NAMES[d]).join(', ')}
                      </span>
                    </div>
                    {r.body && <p className="reminder-body">{r.body}</p>}
                  </div>
                  <div className="reminder-actions">
                    <button
                      className={`toggle-switch ${r.enabled ? 'on' : ''}`}
                      onClick={() => handleToggle(r.id)}
                    >
                      <div className="toggle-knob" />
                    </button>
                      <button className="btn btn-danger btn-icon sm" onClick={() => handleDelete(r.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid-auto">
          {REMINDER_TEMPLATES.map((t, i) => {
            const Icon = CATEGORY_ICONS[t.category] || Bell;
            return (
              <div key={i} className="card card-padding template-card">
                <div className="flex items-center gap-1 mb-2">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--accent-purple)' }}><Icon size={18} /></span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{t.title}</h3>
                </div>
                <p className="text-sm text-secondary mb-2">{t.body}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.times.map((time, j) => (
                    <span key={j} className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {time}</span>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm w-full" onClick={() => handleAddTemplate(t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Plus size={14} /> Aktifkan Semua ({t.times.length} reminder)
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card card-padding">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Inbox size={48} color="var(--accent-purple)" /></div>
              <h3>Belum ada riwayat</h3>
              <p>Notifikasi yang terkirim akan muncul di sini</p>
            </div>
          ) : (
            history.map((h, i) => {
              const Icon = CATEGORY_ICONS[h.category] || Bell;
              return (
                <div key={i} className="activity-item">
                  <div className="activity-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                  <div className="text-sm font-semibold">{h.title}</div>
                  {h.body && <div className="text-xs text-secondary">{h.body}</div>}
                  <div className="activity-time">
                    {new Date(h.firedAt).toLocaleString('id-ID', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Reminder</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddReminder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Reminder</label>
                  <input className="form-input" value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder="Contoh: Minum Air..." autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Pesan (opsional)</label>
                  <textarea className="form-textarea" value={form.body}
                    onChange={e => setForm({...form, body: e.target.value})}
                    placeholder="Pesan yang muncul di notifikasi..."
                    style={{ minHeight: '60px' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Waktu</label>
                    <input type="time" className="form-input" value={form.time}
                      onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-select" value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="custom">🔔 Custom</option>
                      <option value="habit">🔥 Habit</option>
                      <option value="task">✅ Task</option>
                      <option value="goal">🎯 Goal</option>
                      <option value="water">💧 Water</option>
                      <option value="break">☕ Break</option>
                      <option value="health">💪 Health</option>
                      <option value="pomodoro">⏱️ Pomodoro</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Hari Aktif</label>
                  <div className="day-picker">
                    {DAY_NAMES.map((name, idx) => (
                      <button key={idx} type="button"
                        className={`day-btn ${form.days.includes(idx) ? 'active' : ''}`}
                        onClick={() => toggleDay(idx)}>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Link Tujuan (opsional)</label>
                  <select className="form-select" value={form.url}
                    onChange={e => setForm({...form, url: e.target.value})}>
                    <option value="/">Dashboard</option>
                    <option value="/tasks">Task Manager</option>
                    <option value="/habits">Habit Tracker</option>
                    <option value="/pomodoro">Pomodoro Timer</option>
                    <option value="/goals">Goal Setting</option>
                    <option value="/finance">Finance</option>
                    <option value="/health">Health & Fitness</option>
                    <option value="/journal">Journal</option>
                    <option value="/reading">Reading List</option>
                    <option value="/calendar">Calendar</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Tambah Reminder</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
