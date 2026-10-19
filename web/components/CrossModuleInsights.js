'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { API_URL } from '@/lib/apiConfig';
import { useLanguage } from "@superapp/shared/language";


export default function CrossModuleInsights() {
  const { tx: translateCopy } = useLanguage();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('superapp_session_token');
      if (!token) {
        setInsights([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${API_URL}/insights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setInsights(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('superapp_session_token');
      if (!token) {
        setLoading(false);
        return;
      }
      await fetch(`${API_URL}/insights/generate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchInsights();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading && insights.length === 0) {
    return (
      <div className="card card-padding mb-4" style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={20} className="spinner" /> {translateCopy("Menyiapkan ringkasan aktivitasmu…")}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="card card-padding mb-4" style={{ background: 'var(--bg-glass)', border: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
        <Lightbulb size={28} color="var(--accent-purple)" style={{ marginBottom: '10px' }} />
        <h3 style={{ marginBottom: '4px' }}>{translateCopy("Belum ada pola yang cukup")}</h3>
        <p className="text-secondary" style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px' }}>{translateCopy("Setelah beberapa aktivitas tercatat, Whenya akan merangkum pola yang mungkin berguna untukmu.")}</p>
        <button className="btn btn-secondary" onClick={generateInsights}>{translateCopy("Periksa lagi")}</button>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={20} color="var(--accent-purple)" />
          {translateCopy("Pola yang mungkin berguna")}
        </h2>
        <button onClick={generateInsights} style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>{translateCopy("Perbarui")}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {insights.map((insight) => (
          <div key={insight.id} className="card card-padding" style={{
            borderLeft: `4px solid ${insight.insight_type === 'warning' ? 'var(--accent-red)' : insight.insight_type === 'praise' ? 'var(--accent-green)' : 'var(--accent-purple)'}`,
            background: 'var(--bg-glass)'
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>
                {insight.insight_type === 'warning' ? '⚠️' : insight.insight_type === 'praise' ? '🏆' : '💡'}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                  {insight.content}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  {insight.related_modules && insight.related_modules.split(',').map(m => (
                    <span key={m} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                      {m.trim()}
                    </span>
                  ))}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{translateCopy("Kecocokan pola")} {insight.confidence_score}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
