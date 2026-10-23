'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker, requestPermission, getPermissionStatus,
  startScheduler, showNotification,
  localizeReminder, getReminders, addReminder, deleteReminder, toggleReminder,
  getNotificationHistory, REMINDER_TEMPLATES, addFromTemplate,
} from '@/lib/notifications';
import {
  Bell, CheckSquare, Target, Droplets, Coffee, Timer, Dumbbell,
  FlaskConical, Plus, Rocket, MailCheck, CheckCircle2, AlertTriangle, Zap,
  Package, History, BellOff, Clock, Trash2, Inbox, X, Flame
} from 'lucide-react';
import { useLanguage } from "@superapp/shared/language";




const CATEGORY_ICONS = {
  habit: Flame, task: CheckSquare, goal: Target, water: Droplets,
  break: Coffee, pomodoro: Timer, health: Dumbbell, custom: Bell,
};

export default function NotificationsPage() {
  const { tx: translateCopy, language } = useLanguage();
  const { language: uiLanguage } = useLanguage();
const DAY_NAMES = [translateCopy("Min"), translateCopy("Sen"), translateCopy("Sel"), translateCopy("Rab"), translateCopy("Kam"), translateCopy("Jum"), translateCopy("Sab")];

  const [permission, setPermission] = useState('default');
  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('reminders');
  const [form, setForm] = useState({
    title: '', body: '', time: '08:00', category: 'custom', url: '/',
    days: [0, 1, 2, 3, 4, 5, 6],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await getReminders();
    const h = await getNotificationHistory();
    setReminders(r || []);
    setHistory(h || []);
    setLoading(false);
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
      showNotification(translateCopy("Notifikasi aktif"), translateCopy("Whenya dapat mengingatkanmu pada waktu yang kamu pilih."));
    }
  };

  const handleTestNotif = () => {
    showNotification(translateCopy("Notifikasi percobaan"), translateCopy("Jika pesan ini terlihat, pengingat sudah siap digunakan."));
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await addReminder(form);
    await refresh();
    setShowAddModal(false);
    setForm({ title: '', body: '', time: '08:00', category: 'custom', url: '/', days: [0, 1, 2, 3, 4, 5, 6] });
  };

  const handleDelete = async (id) => {
    await deleteReminder(id);
    await refresh();
  };

  const handleToggle = async (id) => {
    await toggleReminder(id);
    await refresh();
  };

  const handleAddTemplate = async (template) => {
    await addFromTemplate(template);
    await refresh();
  };

  const toggleDay = (dayIdx) => {
    setForm(prev => {
      const days = prev.days.includes(dayIdx)
        ? prev.days.filter(d => d !== dayIdx)
        : [...prev.days, dayIdx].sort();
      return { ...prev, days };
    });
  };

  const activeReminders = Array.isArray(reminders) ? reminders.filter(r => r && r.enabled).length : 0;

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        {translateCopy("Memuat data notifikasi...")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={32} color="var(--accent-purple)" /> {translateCopy("Notifikasi & Reminder")}</h1>
            <p>{translateCopy("Atur reminder brutal biar kamu nggak pernah lupa!")}</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-secondary" onClick={handleTestNotif} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FlaskConical size={16} /> {translateCopy("Test")}</button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {translateCopy("Tambah Reminder")}</button>
          </div>
        </div>
      </div>

      {/* Permission Banner */}
      {permission !== 'granted' && (
        <div className="notif-permission-banner">
          <div className="notif-permission-content">
            <div className="notif-permission-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={24} /></div>
            <div>
              <h3>{permission === 'denied' ? translateCopy("Notifikasi Diblokir") : translateCopy("Aktifkan Notifikasi")}</h3>
              <p>
                {permission === 'denied'
                  ? translateCopy("Notifikasi diblokir di browser. Buka Settings Browser → Site Settings → Notifications untuk mengaktifkan.")
                  : translateCopy("Izinkan notifikasi agar Whenya bisa mengirim reminder langsung ke device kamu — bahkan saat tab tertutup!")}
              </p>
            </div>
            {permission !== 'denied' && (
              <button className="btn btn-primary btn-lg" onClick={handleRequestPermission} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {translateCopy("Aktifkan Sekarang")} <Rocket size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(25, 63, 48, 0.15)', color: 'var(--accent-purple)' }}><Bell size={28} /></div>
          <div className="stat-info">
            <h3>{activeReminders}</h3>
            <p>{translateCopy("Reminder Aktif")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><MailCheck size={28} /></div>
          <div className="stat-info">
            <h3>{history.length}</h3>
            <p>{translateCopy("Notif Terkirim")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: permission === 'granted' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: permission === 'granted' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {permission === 'granted' ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}
          </div>
          <div className="stat-info">
            <h3>{permission === 'granted' ? translateCopy('Aktif') : 'Off'}</h3>
            <p>{translateCopy("Status Izin")}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><Zap size={28} /></div>
          <div className="stat-info">
            <h3>{reminders.length}</h3>
            <p>{translateCopy("Total Reminder")}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-2">
        <button className={`tab ${activeTab === 'reminders' ? 'active' : ''}`} onClick={() => setActiveTab('reminders')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Bell size={16} /> {translateCopy("Reminder (")}{reminders.length})
        </button>
        <button className={`tab ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => setActiveTab('templates')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={16} /> {translateCopy("Template Cepat")}
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <History size={16} /> {translateCopy("Riwayat (")}{history.length})
        </button>
      </div>

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="card card-padding">
          {reminders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><BellOff size={48} color="var(--accent-purple)" /></div>
              <h3>{translateCopy("Belum ada reminder")}</h3>
              <p>{translateCopy("Tambahkan reminder atau pakai template cepat biar kamu selalu diingetin!")}</p>
              <button className="btn btn-primary mt-2" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {translateCopy("Tambah Reminder")}</button>
            </div>
          ) : (
              <div className="reminder-list">
                {reminders.map(r => {
                  const Icon = CATEGORY_ICONS[r.category] || Bell;
                  return (
                    <div key={r.id} className={`reminder-item ${!r.enabled ? 'disabled' : ''}`}>
                      <div className="reminder-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={20} /></div>
                      <div className="reminder-info">
                        <h4>{localizeReminder(r, language).title}</h4>
                        <div className="reminder-meta">
                          <span className="reminder-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {r.time}</span>
                      <span className="reminder-days">
                        {r.days.length === 7 ? translateCopy("Setiap hari") : r.days.map(d => DAY_NAMES[d]).join(', ')}
                      </span>
                    </div>
                    {r.body && <p className="reminder-body">{localizeReminder(r, language).body}</p>}
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
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{translateCopy(t.title)}</h3>
                </div>
                <p className="text-sm text-secondary mb-2">{translateCopy(t.body)}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {t.times.map((time, j) => (
                    <span key={j} className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {time}</span>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm w-full" onClick={() => handleAddTemplate(t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Plus size={14} /> {translateCopy("Aktifkan Semua (")}{t.times.length} {translateCopy("reminder)")}
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
              <h3>{translateCopy("Belum ada riwayat")}</h3>
              <p>{translateCopy("Notifikasi yang terkirim akan muncul di sini")}</p>
            </div>
          ) : (
            history.map((h, i) => {
              const Icon = CATEGORY_ICONS[h.category] || Bell;
              return (
                <div key={i} className="activity-item">
                  <div className="activity-icon" style={{ background: 'rgba(25, 63, 48, 0.15)', color: 'var(--accent-purple)' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                  <div className="text-sm font-semibold">{localizeReminder(h, language).title}</div>
                  {h.body && <div className="text-xs text-secondary">{localizeReminder(h, language).body}</div>}
                  <div className="activity-time">
                    {new Date(h.firedAt).toLocaleString(uiLanguage === 'id' ? 'id-ID' : 'en-US', {
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
              <h2>{translateCopy("Tambah Reminder")}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddReminder}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{translateCopy("Judul Reminder")}</label>
                  <input className="form-input" value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                    placeholder={translateCopy("Contoh: Minum Air...")} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">{translateCopy("Pesan (opsional)")}</label>
                  <textarea className="form-textarea" value={form.body}
                    onChange={e => setForm({...form, body: e.target.value})}
                    placeholder={translateCopy("Pesan yang muncul di notifikasi...")}
                    style={{ minHeight: '60px' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{translateCopy("Waktu")}</label>
                    <input type="time" className="form-input" value={form.time}
                      onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{translateCopy("Kategori")}</label>
                    <select className="form-select" value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="custom">{translateCopy("🔔 Custom")}</option>
                      <option value="habit">{translateCopy("🔥 Habit")}</option>
                      <option value="task">{translateCopy("✅ Task")}</option>
                      <option value="goal">{translateCopy("🎯 Goal")}</option>
                      <option value="water">{translateCopy("💧 Water")}</option>
                      <option value="break">{translateCopy("☕ Break")}</option>
                      <option value="health">{translateCopy("💪 Health")}</option>
                      <option value="pomodoro">⏱️ Pomodoro</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{translateCopy("Hari Aktif")}</label>
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
                  <label className="form-label">{translateCopy("Link Tujuan (opsional)")}</label>
                  <select className="form-select" value={form.url}
                    onChange={e => setForm({...form, url: e.target.value})}>
                    <option value="/">{translateCopy("Dashboard")}</option>
                    <option value="/tasks">{translateCopy("Task Manager")}</option>
                    <option value="/habits">{translateCopy("Habit Tracker")}</option>
                    <option value="/pomodoro">{translateCopy("Pomodoro Timer")}</option>
                    <option value="/goals">{translateCopy("Goal Setting")}</option>
                    <option value="/finance">{translateCopy("Finance")}</option>
                    <option value="/health">{translateCopy("Health & Fitness")}</option>
                    <option value="/journal">{translateCopy("Journal")}</option>
                    <option value="/reading">{translateCopy("Reading List")}</option>
                    <option value="/calendar">{translateCopy("Calendar")}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>{translateCopy("Batal")}</button>
                <button type="submit" className="btn btn-primary">{translateCopy("Tambah Reminder")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
