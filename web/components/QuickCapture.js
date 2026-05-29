'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';

export default function QuickCapture() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

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
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('http://localhost:8080/api/v1/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memproses NLP');
      }
      const parsed = await res.json();
      
      await handleParsedData(parsed);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParsedData = async (parsed) => {
    const { module, data } = parsed;
    
    if (module === 'finance') {
      const txs = await getData(STORAGE_KEYS.TRANSACTIONS) || [];
      txs.push({
        id: 'tx_' + Date.now(),
        ...data,
        date: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TRANSACTIONS, txs);
      alert('Transaksi berhasil dicatat!');
    } else if (module === 'task') {
      const tasks = await getData(STORAGE_KEYS.TASKS) || [];
      tasks.push({
        id: 't_' + Date.now(),
        ...data,
        completed: false,
        createdAt: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TASKS, tasks);
      alert('Tugas berhasil ditambahkan!');
    } else if (module === 'journal') {
      const journals = await getData(STORAGE_KEYS.JOURNAL) || [];
      journals.push({
        id: 'j_' + Date.now(),
        content: data.entry,
        date: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.JOURNAL, journals);
      alert('Jurnal berhasil disimpan!');
    } else {
      alert(`Berhasil diparsing ke modul ${module}, namun penyimpanan belum diimplementasi.`);
    }
    
    window.dispatchEvent(new Event('storage_update'));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setIsOpen(false)} style={{ zIndex: 100000, backdropFilter: 'blur(4px)' }}>
      <div className="quick-capture-modal" onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-card)',
        width: '600px',
        maxWidth: '90%',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border-color)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <span style={{ fontSize: '24px', opacity: 0.5 }}>✨</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Apa yang ingin kamu catat? (Coba: 'beli makan siang 50rb')"
              disabled={loading}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '20px',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          {loading && (
            <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '14px', fontStyle: 'italic' }}>
              Memproses dengan AI...
            </div>
          )}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
            <span>Tekan <strong>Enter</strong> untuk submit</span>
            <span>Tekan <strong>Esc</strong> untuk menutup</span>
          </div>
        </form>
      </div>
    </div>
  );
}
