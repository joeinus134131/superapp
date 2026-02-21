'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId } from '@/lib/helpers';
import {
  Library, BookOpen, CheckCircle2, Bookmark,
  Star, Book, Trash2, X, Plus
} from 'lucide-react';
import { useLanguage } from '@/lib/language';

const BOOK_COLORS = [
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #ec4899, #db2777)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #3b82f6, #2563eb)',
  'linear-gradient(135deg, #ef4444, #dc2626)',
  'linear-gradient(135deg, #6366f1, #4f46e5)',
];

export default function ReadingPage() {
  const { t } = useLanguage();
  const [books, setBooks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({
    title: '', author: '', status: 'wishlist', rating: 0, notes: '', pagesRead: 0, totalPages: 0
  });

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.READING);
    if (saved) setBooks(saved);
  }, []);

  const save = (b) => { setBooks(b); setData(STORAGE_KEYS.READING, b); };

  const openAdd = () => {
    setEditBook(null);
    setForm({ title: '', author: '', status: 'wishlist', rating: 0, notes: '', pagesRead: 0, totalPages: 0 });
    setShowModal(true);
  };

  const openEdit = (book) => {
    setEditBook(book);
    setForm({ ...book });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (editBook) {
      save(books.map(b => b.id === editBook.id ? { ...b, ...form } : b));
    } else {
      const colorIndex = books.length % BOOK_COLORS.length;
      save([{ ...form, id: generateId(), color: BOOK_COLORS[colorIndex], createdAt: new Date().toISOString() }, ...books]);
    }
    setShowModal(false);
  };

  const deleteBook = (id) => save(books.filter(b => b.id !== id));

  const filtered = activeTab === 'all' ? books : books.filter(b => b.status === activeTab);
  const reading = books.filter(b => b.status === 'reading').length;
  const completed = books.filter(b => b.status === 'completed').length;
  const wishlist = books.filter(b => b.status === 'wishlist').length;
  const avgRating = books.filter(b => b.rating > 0).length > 0
    ? (books.filter(b => b.rating > 0).reduce((s, b) => s + b.rating, 0) / books.filter(b => b.rating > 0).length).toFixed(1)
    : '—';

  const StarRating = ({ rating, onRate, size = 20 }) => (
    <div className="star-rating" style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className="star"
          style={{ cursor: onRate ? 'pointer' : 'default', lineHeight: 0, display: 'inline-block' }}
          onClick={() => onRate && onRate(s)}>
          <Star size={size} fill={s <= rating ? 'var(--accent-yellow)' : 'none'} color={s <= rating ? 'var(--accent-yellow)' : 'var(--border-color)'} />
        </span>
      ))}
    </div>
  );

  const STATUS_LABELS = {
    reading: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={12} /> {t('reading.status_reading')}</span>,
    completed: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={12} /> {t('reading.status_completed')}</span>,
    wishlist: <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bookmark size={12} /> {t('reading.status_wishlist')}</span>
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={32} color="var(--accent-purple)" /> {t('reading.title')}</h1>
            <p>{t('reading.desc')}</p>
          </div>
          <button className="btn btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('reading.add_book')}</button>
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}><BookOpen size={28} /></div>
          <div className="stat-info">
            <h3>{reading}</h3>
            <p>{t('reading.status_reading')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><CheckCircle2 size={28} /></div>
          <div className="stat-info">
            <h3>{completed}</h3>
            <p>{t('reading.status_completed')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><Bookmark size={28} /></div>
          <div className="stat-info">
            <h3>{wishlist}</h3>
            <p>{t('reading.status_wishlist')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><Star size={28} fill="currentColor" /></div>
          <div className="stat-info">
            <h3>{avgRating}</h3>
            <p>{t('reading.avg_rating')}</p>
          </div>
        </div>
      </div>

      <div className="tabs mb-2">
        <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Library size={16} /> {t('reading.tab_all')} ({books.length})</button>
        <button className={`tab ${activeTab === 'reading' ? 'active' : ''}`} onClick={() => setActiveTab('reading')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><BookOpen size={16} /> {t('reading.tab_reading')} ({reading})</button>
        <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} /> {t('reading.status_completed')} ({completed})</button>
        <button className={`tab ${activeTab === 'wishlist' ? 'active' : ''}`} onClick={() => setActiveTab('wishlist')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Bookmark size={16} /> {t('reading.status_wishlist')} ({wishlist})</button>
      </div>

      {filtered.length === 0 ? (
        <div className="card card-padding">
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Library size={48} color="var(--accent-purple)" /></div>
            <h3>{t('reading.no_books_yet')}</h3>
            <p>{t('reading.start_adding')}</p>
            <button className="btn btn-primary mt-2" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('reading.add_book')}</button>
          </div>
        </div>
      ) : (
        <div className="grid-auto">
          {filtered.map(book => (
            <div key={book.id} className="book-card" onClick={() => openEdit(book)} style={{ cursor: 'pointer' }}>
              <div className="book-cover" style={{ background: book.color || BOOK_COLORS[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Book size={24} color="rgba(255,255,255,0.8)" /></div>
              <div className="book-info">
                <h3>{book.title}</h3>
                <p>{book.author}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="badge" style={{
                    background: book.status === 'reading' ? 'rgba(59,130,246,0.15)' : book.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                    color: book.status === 'reading' ? 'var(--accent-blue)' : book.status === 'completed' ? 'var(--accent-green)' : 'var(--accent-yellow)',
                    fontSize: '10px'
                  }}>
                    {STATUS_LABELS[book.status]}
                  </span>
                </div>
                {book.status === 'reading' && book.totalPages > 0 && (
                  <div className="mt-1">
                    <div className="progress-bar" style={{ height: '4px' }}>
                      <div className="progress-fill" style={{ width: `${(book.pagesRead / book.totalPages) * 100}%` }} />
                    </div>
                    <span className="text-xs text-muted">{book.pagesRead}/{book.totalPages} {t('reading.pages')}</span>
                  </div>
                )}
                {book.rating > 0 && <StarRating rating={book.rating} size={14} />}
              </div>
              <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteBook(book.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editBook ? t('reading.edit_book') : t('reading.add_book')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('reading.book_title')}</label>
                  <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder={t('reading.title_placeholder')} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('reading.author')}</label>
                  <input className="form-input" value={form.author} onChange={e => setForm({...form, author: e.target.value})} placeholder={t('reading.author_placeholder')} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('reading.status')}</label>
                    <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                      <option value="wishlist">🔖 {t('reading.status_wishlist')}</option>
                      <option value="reading">📖 {t('reading.status_reading')}</option>
                      <option value="completed">✅ {t('reading.status_completed')}</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('reading.rating')}</label>
                    <StarRating rating={form.rating} onRate={(r) => setForm({...form, rating: r})} />
                  </div>
                </div>
                {form.status === 'reading' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">{t('reading.pages_read')}</label>
                      <input type="number" className="form-input" value={form.pagesRead} onChange={e => setForm({...form, pagesRead: Number(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('reading.total_pages')}</label>
                      <input type="number" className="form-input" value={form.totalPages} onChange={e => setForm({...form, totalPages: Number(e.target.value)})} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{t('reading.notes')}</label>
                  <textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder={t('reading.notes_placeholder')} style={{ minHeight: '60px' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('reading.cancel')}</button>
                <button type="submit" className="btn btn-primary">{editBook ? t('reading.save') : t('reading.add')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
