'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, getToday, MOOD_EMOJIS } from '@/lib/helpers';
import { addXP, checkAchievements } from '@/lib/gamification';
import { playTaskComplete } from '@/lib/sounds';
import Confetti from '@/components/Confetti';
import LevelUpModal from '@/components/LevelUpModal';
import {
  NotebookPen, Plus, Notebook, Trash2, Edit3,
  BookOpen, X, Save
} from 'lucide-react';
import { useLanguage } from '@/lib/language';

export default function JournalPage() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [form, setForm] = useState({ title: '', content: '', mood: 'good', date: getToday() });
  const [showEditor, setShowEditor] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [xpToast, setXpToast] = useState(null);

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.JOURNAL);
    if (saved) setEntries(saved);
  }, []);

  const save = (e) => { 
    setEntries(e); 
    setData(STORAGE_KEYS.JOURNAL, e); 
  };

  const createNew = () => {
    setForm({ title: '', content: '', mood: 'good', date: getToday() });
    setShowEditor(true);
  };

  const selectEntry = (entry) => {
    setSelected(entry);
  };

  const openEdit = () => {
    if (!selected) return;
    setForm({ ...selected });
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.content.trim()) return;
    
    const existingIndex = entries.findIndex(e => e.id === form.id);

    if (existingIndex !== -1) {
      const updated = [...entries];
      updated[existingIndex] = { ...form, updatedAt: new Date().toISOString() };
      save(updated);
      setSelected(updated[existingIndex]);
    } else {
      const newEntry = { ...form, id: generateId(), createdAt: new Date().toISOString() };
      const updated = [newEntry, ...entries];
      save(updated);
      setSelected(newEntry);
      
      // XP Rewards for new entry
      playTaskComplete();
      const result = addXP('JOURNAL_WRITE');
      if (result.levelUp) {
        setLevelUpData(result.newLevel);
        setShowConfetti(true);
      }
      setXpToast(`+${result.xpGained} XP`);
      setTimeout(() => setXpToast(null), 2000);
      checkAchievements();
    }
    setShowEditor(false);
  };

  const deleteEntry = (id) => {
    const updated = entries.filter(e => e.id !== id);
    save(updated);
    if (selected && selected.id === id) {
      setSelected(null);
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
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {xpToast && <div className="xp-toast">⚡ {xpToast}</div>}
      
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><NotebookPen size={32} color="var(--accent-purple)" /> {t('journal.title')}</h1>
            <p>{t('journal.desc')}</p>
          </div>
          <button className="btn btn-primary" onClick={createNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('journal.write_new')}</button>
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><Notebook size={28} /></div>
          <div className="stat-info">
            <h3>{entries.length}</h3>
            <p>{t('journal.total_notes')}</p>
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

      <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0, 320px) 1fr', alignItems: 'start' }}>
        {/* Entry List */}
        <div className="card" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <input className="form-input" placeholder={t('journal.search_placeholder')} value={search} onChange={e => { setSearch(e.target.value); setListPage(1); }} />
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <p className="text-muted text-sm">{t('journal.no_notes_yet')}</p>
            </div>
          ) : (
            <>
                {filtered.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(entry => (
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
                    <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                  </div>
                ))}
                {filtered.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-between items-center p-3 border-t border-color" style={{ background: 'var(--bg-card)' }}>
                        <span className="text-xs text-secondary">{t('journal.page')} {listPage} {t('journal.of')} {Math.ceil(filtered.length / ITEMS_PER_PAGE)}</span>
                        <div className="flex gap-2">
                            <button className="btn btn-sm btn-secondary" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>{t('journal.prev_short')}</button>
                            <button className="btn btn-sm btn-secondary" disabled={listPage * ITEMS_PER_PAGE >= filtered.length} onClick={() => setListPage(p => p + 1)}>{t('journal.next_short')}</button>
                        </div>
                    </div>
                )}
            </>
          )}
        </div>

        {/* Entry View (Reader) */}
        <div className="card card-padding" style={{ minHeight: '400px' }}>
          {selected ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, wordBreak: 'break-word' }}>{selected.title}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted">
                    <span style={{ textTransform: 'capitalize' }}>{MOOD_EMOJIS[selected.mood]} {selected.mood}</span>
                    <span>•</span>
                    <span>{formatDate(selected.date)}</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={openEdit} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Edit3 size={14} /> {t('journal.edit')}</button>
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '16px', color: 'var(--text-secondary)' }}>
                {selected.content}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ height: '300px' }}>
              <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><BookOpen size={48} color="var(--accent-purple)" /></div>
              <h3>{t('journal.select_note')}</h3>
              <p>{t('journal.select_note_desc')}</p>
              <button className="btn btn-primary mt-2" onClick={createNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('journal.write_new')}</button>
            </div>
          )}
        </div>
      </div>

      {/* Popup Editor Modal */}
      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95vw', height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h2>{form.id ? t('journal.edit_note') : t('journal.write_new')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowEditor(false)}><X size={16} /></button>
            </div>
            
            <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">{t('journal.note_title')}</label>
                <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder={t('journal.title_placeholder')} style={{ fontSize: '18px', fontWeight: '600' }} autoFocus />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('journal.mood')}</label>
                  <div className="mood-selector">
                    {Object.entries(MOOD_EMOJIS).map(([key, emoji]) => (
                      <button key={key} type="button" className={`mood-btn ${form.mood === key ? 'selected' : ''}`} onClick={() => setForm({...form, mood: key})}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('journal.date')}</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={{ width: 'auto' }} />
                </div>
              </div>

              <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label className="form-label">{t('journal.note_content')}</label>
                <textarea className="form-textarea" value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  placeholder={t('journal.content_placeholder')}
                  style={{ flex: 1, minHeight: '200px', fontSize: '16px', lineHeight: '1.6', resize: 'none' }} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditor(false)}>{t('journal.cancel')}</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={16} /> {t('journal.save_note')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
