'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getDaysInMonth, getFirstDayOfMonth, getToday, formatDate } from '@/lib/helpers';

const EVENT_COLORS = [
  { id: 'purple', label: 'Default', color: '#8b5cf6' },
  { id: 'blue', label: 'Kerja', color: '#3b82f6' },
  { id: 'green', label: 'Personal', color: '#10b981' },
  { id: 'red', label: 'Penting', color: '#ef4444' },
  { id: 'yellow', label: 'Reminder', color: '#f59e0b' },
  { id: 'pink', label: 'Sosial', color: '#ec4899' },
  { id: 'cyan', label: 'Kesehatan', color: '#06b6d4' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', date: getToday(), time: '09:00', colorId: 'purple' });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = getToday();

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.EVENTS);
    if (saved) setEvents(saved);
  }, []);

  const save = (e) => { setEvents(e); setData(STORAGE_KEYS.EVENTS, e); };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(getToday());
  };

  const openAdd = (date) => {
    setEditEvent(null);
    setForm({ title: '', description: '', date: date || selectedDate, time: '09:00', colorId: 'purple' });
    setShowModal(true);
  };

  const openEdit = (event) => {
    setEditEvent(event);
    setForm({ ...event });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editEvent) {
      save(events.map(ev => ev.id === editEvent.id ? { ...ev, ...form } : ev));
    } else {
      save([...events, { ...form, id: generateId(), createdAt: new Date().toISOString() }]);
    }
    setShowModal(false);
  };

  const deleteEvent = (id) => save(events.filter(e => e.id !== id));

  const getEventsForDate = (dateStr) => events.filter(e => e.date === dateStr);
  const selectedEvents = getEventsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  // Previous month days to fill
  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Upcoming events (next 7 days)
  const upcoming = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayEvents = getEventsForDate(dateStr);
    if (dayEvents.length > 0) {
      upcoming.push(...dayEvents.map(e => ({ ...e, dateStr })));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>📅 Calendar</h1>
            <p>Kelola jadwal dan event kamu</p>
          </div>
          <button className="btn btn-primary" onClick={() => openAdd()}>+ Tambah Event</button>
        </div>
      </div>

      <div className="calendar-layout" style={{ alignItems: 'start' }}>
        {/* Calendar */}
        <div className="card card-padding">
          <div className="flex justify-between items-center mb-3">
            <button className="btn btn-secondary btn-sm" onClick={prevMonth}>← Prev</button>
            <div className="text-center">
              <h2 className="font-bold">{MONTH_NAMES[month]} {year}</h2>
            </div>
            <div className="flex gap-1">
              <button className="btn btn-secondary btn-sm" onClick={goToday}>Hari Ini</button>
              <button className="btn btn-secondary btn-sm" onClick={nextMonth}>Next →</button>
            </div>
          </div>

          <div className="calendar-grid">
            {DAY_NAMES.map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {/* Previous month fill */}
            {Array.from({ length: firstDay }, (_, i) => {
              const day = prevMonthDays - firstDay + i + 1;
              return (
                <div key={`prev-${i}`} className="calendar-day other-month">
                  {day}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const dayEvents = getEventsForDate(dateStr);

              return (
                <div key={day}
                  className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(dateStr)}>
                  {day}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-1" style={{ position: 'absolute', bottom: '4px' }}>
                      {dayEvents.slice(0, 3).map((e, j) => {
                        const colorInfo = EVENT_COLORS.find(c => c.id === e.colorId);
                        return <div key={j} className="event-dot" style={{ background: colorInfo?.color || '#8b5cf6' }} />;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Next month fill */}
            {Array.from({ length: (7 - ((firstDay + daysInMonth) % 7)) % 7 }, (_, i) => (
              <div key={`next-${i}`} className="calendar-day other-month">
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-2">
          {/* Selected Day Events */}
          <div className="card card-padding">
            <div className="flex justify-between items-center mb-2">
              <div className="card-title">{formatDate(selectedDate)}</div>
              <button className="btn btn-primary btn-sm" onClick={() => openAdd(selectedDate)}>+</button>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="text-center text-muted text-sm" style={{ padding: '24px' }}>
                Tidak ada event
              </div>
            ) : (
              selectedEvents.map(event => {
                const colorInfo = EVENT_COLORS.find(c => c.id === event.colorId);
                return (
                  <div key={event.id} className="list-item" style={{ cursor: 'pointer' }} onClick={() => openEdit(event)}>
                    <div style={{ width: '4px', borderRadius: '2px', alignSelf: 'stretch', background: colorInfo?.color || '#8b5cf6' }} />
                    <div className="flex-1">
                      <div className="font-semibold" style={{ fontSize: '14px' }}>{event.title}</div>
                      <div className="text-xs text-muted">{event.time} • {colorInfo?.label || 'Default'}</div>
                      {event.description && <div className="text-xs text-secondary mt-1">{event.description}</div>}
                    </div>
                    <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}>🗑</button>
                  </div>
                );
              })
            )}
          </div>

          {/* Upcoming Events */}
          <div className="card card-padding">
            <div className="card-title mb-2">📌 Mendatang (7 hari)</div>
            {upcoming.length === 0 ? (
              <div className="text-center text-muted text-sm" style={{ padding: '16px' }}>Tidak ada event mendatang</div>
            ) : (
              upcoming.slice(0, 8).map((event, i) => {
                const colorInfo = EVENT_COLORS.find(c => c.id === event.colorId);
                return (
                  <div key={i} className="activity-item">
                    <div className="activity-icon" style={{ background: `${colorInfo?.color || '#8b5cf6'}22`, color: colorInfo?.color }}>📅</div>
                    <div>
                      <div className="text-sm font-semibold">{event.title}</div>
                      <div className="activity-time">{formatDate(event.dateStr)} • {event.time}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editEvent ? 'Edit Event' : 'Tambah Event'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Judul Event</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Nama event..." autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detail event..." style={{ minHeight: '60px' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Waktu</label>
                    <input type="time" className="form-input" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Warna / Kategori</label>
                  <div className="flex gap-1 flex-wrap">
                    {EVENT_COLORS.map(c => (
                      <button key={c.id} type="button"
                        className="btn btn-sm"
                        style={{
                          background: form.colorId === c.id ? c.color : `${c.color}22`,
                          color: form.colorId === c.id ? 'white' : c.color,
                          border: `1px solid ${c.color}`,
                        }}
                        onClick={() => setForm({...form, colorId: c.id})}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">{editEvent ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
