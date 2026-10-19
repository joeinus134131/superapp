'use client';
import { useEffect, useRef, useState } from 'react';
import { getCloudAccessToken } from '@superapp/shared/cloud-auth';
import { API_URL } from '@/lib/apiConfig';
import syntheticRequest from '../../../../shared/finance/research-request-v1.synthetic.json';
import styles from './repository.module.css';
import { useLanguage } from "@superapp/shared/language";




export default function ResearchPanel({ entity, canSubmit }) {
  const { tx: translateCopy } = useLanguage();
/**
 * @param {string} entity
 * @param {string} suffix
 * @param {{ method?: string, body?: string, key?: string, signal?: AbortSignal }} [options]
 */
async function request(entity, suffix, options = {}) {
  const { method = 'GET', body, key, signal } = options;
  const token = await getCloudAccessToken();
  if (!token) throw new Error(translateCopy("Hubungkan akun cloud untuk membuka riset."));
  const response = await fetch(`${API_URL}/finance/entities/${entity}/research/jobs${suffix}`, {
    method, signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json', 'Idempotency-Key': key } : {}) }, ...(body ? { body } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.code === 'report_not_available' ? translateCopy("Laporan belum tersedia. Periksa status pekerjaan.") : data.error?.code === 'research_not_configured' ? translateCopy("Layanan riset belum terhubung. Minta pengelola mengonfigurasi koneksi FinLab.") : translateCopy("Riset belum dapat dimuat ({0}).", [data.error?.code || response.status]));
    throw error;
  }
  return data;
}


  const [mode, setMode] = useState('synthetic');
  const [universe, setUniverse] = useState('BBCA.JK');
  const [asOf, setAsOf] = useState('');
  const [budget, setBudget] = useState('');
  const [horizon, setHorizon] = useState('12');
  const [jobId, setJobId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [job, setJob] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const attempt = useRef(null);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  async function perform(work) {
    active.current?.abort(); const controller = new AbortController(); active.current = controller;
    setBusy(true); setError('');
    try { await work(controller.signal); }
    catch (err) { if (!controller.signal.aborted) setError(err.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    perform(async signal => {
      /** @type {any} */
      /** @type {Record<string, any>} */
      let input = syntheticRequest;
      if (mode === 'market') {
        if (!/^[0-9]{1,18}(\.[0-9]{1,2})?$/.test(budget) || !/[1-9]/.test(budget)) throw new Error(translateCopy("Isi anggaran positif tanpa pemisah ribuan."));
        input = { schema_version: '1', as_of: new Date(asOf).toISOString(), universe: universe.split(',').map(value => value.trim().toUpperCase()), analysis: { kind: 'screening', include_laya: false }, constraints: { base_currency: 'IDR', budget: { amount: budget, currency: 'IDR' }, horizon_months: Number(horizon) } };
      }
      const body = JSON.stringify(input);
      if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
      const result = await request(entity, '', { method: 'POST', body, key: attempt.current.key, signal });
      if (signal.aborted) return;
      setJobId(result.job_id); setLookupId(result.job_id); setJob(result); setReport(null);
    });
  }
  function poll(id) {
    perform(async signal => {
      const result = await request(entity, `/${encodeURIComponent(id)}`, { signal });
      if (signal.aborted) return;
      setJobId(result.job_id); setLookupId(result.job_id); setJob(result); setReport(null);
      if (result.report_available) {
        const output = await request(entity, `/${encodeURIComponent(id)}/report`, { signal });
        if (!signal.aborted) setReport(output);
      }
    });
  }
  return <section className={styles.card}><h2>{translateCopy("Riset FinLab")}</h2><p>{translateCopy("Riset membantu memahami data. Hasilnya tidak mengubah saldo, kepemilikan aset, atau mengirim order.")}</p>
    {canSubmit && <form className={styles.researchForm} onSubmit={submit}>
      <label>{translateCopy("Sumber analisis")}<select value={mode} onChange={event => setMode(event.target.value)} disabled={busy}><option value="synthetic">{translateCopy("Contoh sintetis · bukan data pasar nyata")}</option><option value="market">{translateCopy("Data pasar dari provider")}</option></select></label>
      {mode === 'synthetic' ? <p>{translateCopy("Contoh BBCA.JK memakai 100 baris harga buatan. Asumsi anggaran IDR 10000000, horizon 12 bulan, as-of 1 Mei 2025. Tidak menggambarkan posisi Anda.")}</p> : <>
        <label>{translateCopy("Simbol IDX (pisahkan dengan koma)")}<input required value={universe} onChange={event => setUniverse(event.target.value)} disabled={busy} placeholder="BBCA.JK, BBRI.JK" /></label>
        <label>{translateCopy("Waktu acuan")}<input required type="datetime-local" value={asOf} onChange={event => setAsOf(event.target.value)} disabled={busy} /></label>
        <label>{translateCopy("Anggaran konteks (IDR)")}<input required inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} disabled={busy} placeholder="10000000" /></label>
        <label>{translateCopy("Horizon (bulan)")}<input required type="number" min="1" max="600" value={horizon} onChange={event => setHorizon(event.target.value)} disabled={busy} /></label>
        <p>{translateCopy("Anggaran adalah konteks riset. Kelengkapan dan ketersediaan data provider ditunjukkan dalam laporan; kegagalan sumber ditampilkan sebagai kegagalan riset.")}</p>
      </>}
      <button disabled={busy} type="submit">{busy ? translateCopy("Menunggu layanan riset…") : translateCopy("Mulai riset")}</button>
    </form>}
    <form className={styles.researchForm} onSubmit={event => { event.preventDefault(); poll(lookupId); }}><label>{translateCopy("ID pekerjaan riset Anda")}<input required value={lookupId} onChange={event => setLookupId(event.target.value)} disabled={busy} placeholder={translateCopy("UUID pekerjaan")} /></label><button disabled={busy} type="submit">{translateCopy("Baca status dan laporan")}</button></form>
    {error && <p role="alert" className={styles.notice}>{translateCopy(error)}</p>}
    {job && <div aria-live="polite"><p>ID: <code>{jobId}</code></p><p>{translateCopy("Status:")} <strong>{job.state}</strong>{job.failure_code && ` · ${job.failure_code}`}</p>{job.data_as_of && <p>{translateCopy("Data sampai:")} {job.data_as_of}</p>}{!report && <button disabled={busy} type="button" onClick={() => poll(jobId)}>{translateCopy("Periksa perkembangan")}</button>}</div>}
    {report && <div className={styles.researchReport}>
      <h3>{translateCopy("Laporan riset")}</h3><p>{translateCopy("Metode:")} {report.baseline} {translateCopy("· Versi:")} {report.engine_version}</p><p>{translateCopy("Data sampai:")} {report.data_as_of} {translateCopy("· Acuan permintaan:")} {report.input?.as_of}</p>
      <p><strong>{report.rl_executed ? translateCopy("RL dijalankan") : translateCopy("RL tidak dijalankan")}</strong> · Laya: {report.laya?.state || translateCopy("Tidak diketahui")}</p>
      <h4>{translateCopy("Sumber")}</h4><ul>{(report.sources || []).map((source, index) => <li key={index}>{source.provider} · {source.synthetic ? 'SINTETIS' : translateCopy("Data provider")} · {source.rows} {translateCopy("baris")}</li>)}</ul>
      <h4>{translateCopy("Keterbatasan")}</h4><ul>{(report.limitations || []).map((text, index) => <li key={index}>{text}</li>)}</ul>
      <h4>{translateCopy("Screening")}</h4><p>{translateCopy("Skor dan confidence adalah keluaran metode riset, bukan peluang keuntungan.")}</p><div className={styles.tableWrap}><table><thead><tr><th>{translateCopy("Simbol")}</th><th>{translateCopy("Skor")}</th><th>{translateCopy("Confidence")}</th><th>{translateCopy("Klasifikasi")}</th></tr></thead><tbody>{(report.screening || []).map((row, index) => <tr key={row.ticker || index}><td>{row.ticker}</td><td>{row.score ?? translateCopy("Belum tersedia")}</td><td>{row.confidence ?? translateCopy("Belum tersedia")}</td><td>{row.label}</td></tr>)}</tbody></table></div>
      <details><summary>{translateCopy("Jejak versi dan sumber")}</summary><p className={styles.reportHash}>Input SHA-256: {report.input_sha256}<br />Engine SHA-256: {report.engine_sha256}</p></details>
    </div>}
  </section>;
}
