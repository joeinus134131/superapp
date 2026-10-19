'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { localDate } from '@superapp/shared/insights';
import { useRouter } from 'next/navigation';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { API_URL } from '@/lib/apiConfig';
import { Plus, Send, X } from 'lucide-react';

import { useToast } from '@/lib/toastContext';
import { useLanguage } from "@superapp/shared/language";


export default function QuickCapture() {
  const { tx: translateCopy } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('auto');
  const inputRef = useRef(null);
  const router = useRouter();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-quick-capture', handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-capture', handleOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
      setCategory('auto');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Direct category override or AI parse
      if (category === 'task') {
        await handleParsedData({ module: translateCopy("task"), data: { title: query.trim(), priority: 'P3' } });
        setIsOpen(false);
        return;
      }
      if (category === 'journal') {
        await handleParsedData({ module: 'journal', data: { entry: query.trim() } });
        setIsOpen(false);
        return;
      }

      const rawToken = localStorage.getItem('superapp_session_token');
      let token = rawToken || '';
      try { token = JSON.parse(rawToken) || ''; } catch { /* legacy plain token */ }
      const res = await fetch(`${API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) {
        // Fallback: save as a quick task if AI parse endpoint fails or returns error
        await handleParsedData({ module: translateCopy("task"), data: { title: query.trim(), priority: 'P3' } });
        setIsOpen(false);
        return;
      }
      const parsed = await res.json();
      await handleParsedData(parsed);
      setIsOpen(false);
    } catch (err) {
      // Graceful fallback to creating a task locally
      await handleParsedData({ module: translateCopy("task"), data: { title: query.trim(), priority: 'P3' } });
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleParsedData = async (parsed) => {
    const { module, data } = parsed;

    if (module === 'finance') {
      const txId = 'tx_' + Date.now();
      const txs = await getData(STORAGE_KEYS.TRANSACTIONS) || [];
      txs.push({
        id: txId,
        ...data,
        date: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TRANSACTIONS, txs);
      window.dispatchEvent(new Event('storage_update'));

      showSuccess(translateCopy("Transaksi \"{0}\" dicatat", [data.description || 'Baru']), {
        label: 'Batalkan',
        onClick: async () => {
          const currentTxs = await getData(STORAGE_KEYS.TRANSACTIONS) || [];
          await setData(STORAGE_KEYS.TRANSACTIONS, currentTxs.filter(t => t.id !== txId));
          window.dispatchEvent(new Event('storage_update'));
        }
      });
    } else if (module === 'task') {
      const taskId = 't_' + Date.now();
      const tasks = await getData(STORAGE_KEYS.TASKS) || [];
      tasks.push({
        id: taskId,
        ...data,
        status: data.status || 'todo',
        category: data.category || translateCopy("Personal"),
        completed: false,
        createdAt: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TASKS, tasks);
      window.dispatchEvent(new Event('storage_update'));

      showSuccess(translateCopy("Tugas \"{0}\" ditambahkan", [data.title || 'Baru']), {
        label: 'Batalkan',
        onClick: async () => {
          const currentTasks = await getData(STORAGE_KEYS.TASKS) || [];
          await setData(STORAGE_KEYS.TASKS, currentTasks.filter(t => t.id !== taskId));
          window.dispatchEvent(new Event('storage_update'));
        }
      });
    } else if (module === 'journal') {
      const journalId = 'j_' + Date.now();
      const journals = await getData(STORAGE_KEYS.JOURNAL) || [];
      journals.push({
        id: journalId,
        title: data.title || (data.entry || query).slice(0, 70),
        content: data.entry || query,
        mood: data.mood || 'good',
        date: localDate(),
        createdAt: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.JOURNAL, journals);
      window.dispatchEvent(new Event('storage_update'));

      showSuccess(translateCopy("Catatan jurnal tersimpan"), {
        label: 'Batalkan',
        onClick: async () => {
          const currentJournals = await getData(STORAGE_KEYS.JOURNAL) || [];
          await setData(STORAGE_KEYS.JOURNAL, currentJournals.filter(j => j.id !== journalId));
          window.dispatchEvent(new Event('storage_update'));
        }
      });
    } else {
      showError(translateCopy("Modul {0} belum didukung.", [module]));
    }
  };

  if (!isOpen) {
    return (
      <button type="button" className="quick-capture-trigger" onClick={() => setIsOpen(true)} aria-label={translateCopy("Buka catatan cepat")} title={translateCopy("Catatan cepat (Ctrl/⌘ K)")}>
        <Plus size={20} aria-hidden="true" />
        <span>{translateCopy("Catat cepat")}</span>
      </button>
    );
  }

  return (
    <div className="modal-overlay quick-capture-overlay" onClick={() => setIsOpen(false)}>
      <div className="quick-capture-modal" role="dialog" aria-modal="true" aria-labelledby="quick-capture-title" onClick={e => e.stopPropagation()}>
        <div className="quick-capture-heading">
          <div><span className="eyebrow">{translateCopy("CATATAN CEPAT")}</span><h2 id="quick-capture-title">{translateCopy("Apa yang ingin kamu simpan?")}</h2></div>
          <button type="button" className="icon-button" onClick={() => setIsOpen(false)} aria-label={translateCopy("Tutup catatan cepat")}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              className={`btn btn-sm ${category === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategory('auto')}
            >
              {translateCopy("✨ Otomatis (AI)")}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${category === 'task' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategory(translateCopy("task"))}
            >
              {translateCopy("☑️ Tugas")}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${category === 'journal' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategory('journal')}
            >
              {translateCopy("📝 Jurnal")}
            </button>
          </div>

          <nav className="whenya-segment" aria-label={translateCopy("Tambah aktivitas lain")} style={{ marginBottom: 12 }}>
            {[{ href: '/finance', label: translateCopy("+ Transaksi") }, { href: '/habits', label: translateCopy("+ Kebiasaan") }, { href: '/goals', label: translateCopy("+ Tujuan") }, { href: '/calendar', label: translateCopy("+ Event") }].map(item => <Link key={item.href} href={item.href} className="btn btn-secondary btn-sm" onClick={() => setIsOpen(false)}>{item.label}</Link>)}
          </nav>
          <div className="quick-capture-input-row">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={
                category === 'task'
                  ? translateCopy("Contoh: Selesaikan laporan Q3")
                  : category === 'journal'
                  ? translateCopy("Apa yang sedang kamu pikirkan hari ini?")
                  : translateCopy("Contoh: beli makan siang 50 ribu, atau baca buku bab 4")
              }
              aria-label={translateCopy("Isi catatan cepat")}
              disabled={loading}
            />
            <button type="submit" className="quick-capture-send" disabled={loading || !query.trim()} aria-label={translateCopy("Simpan catatan")}><Send size={19} /></button>
          </div>
          {loading && (
            <p className="quick-capture-status" role="status">{translateCopy("Mengenali jenis catatan…")}</p>
          )}
          <div className="quick-capture-hint">
            <span>{translateCopy("Bisa untuk tugas, pengeluaran, atau jurnal langsung dengan undo.")}</span>
            <span><kbd>{translateCopy("Enter")}</kbd> {translateCopy("simpan ·")} <kbd>Esc</kbd> {translateCopy("tutup")}</span>
          </div>
        </form>
      </div>
    </div>
  );
}
