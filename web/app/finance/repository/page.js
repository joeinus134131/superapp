'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getCloudAccessToken } from '@superapp/shared/cloud-auth';
import { API_URL } from '@/lib/apiConfig';
import styles from './repository.module.css';
import EvidenceReview from './EvidenceReview';
import ResearchPanel from './ResearchPanel';
import { useLanguage } from "@superapp/shared/language";




export default function FinanceRepository() {
  const { tx: translateCopy } = useLanguage();
const read = useCallback(async (path, signal) => {
  const token = await getCloudAccessToken();
  if (!token) throw new Error(translateCopy("Hubungkan akun cloud untuk membuka buku keuangan."));
  const response = await fetch(`${API_URL}/finance${path}`, { signal, headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(response.status === 403 ? translateCopy("Akses buku ini sudah tidak tersedia.") : translateCopy("Buku keuangan belum dapat dimuat. Coba lagi setelah konfigurasi server diperiksa."));
  return response.json();
}, [translateCopy]);
const stateLabels = { received: translateCopy("Bukti diterima"), processing: translateCopy("Sedang diproses"), needs_review: translateCopy("Perlu ditinjau"), completed: translateCopy("Pemrosesan selesai"), failed: translateCopy("Pemrosesan gagal") };


  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    read('/entities', controller.signal).then(data => { setEntities(data.entities || []); setEntity(previous => previous || data.entities?.[0]?.id || ''); }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, read]);
  useEffect(() => {
    if (!entity) return;
    const controller = new AbortController();
    setLoading(true); setSnapshot(null); setError('');
    Promise.all(['/accounts', '/balances', '/imports'].map(path => read(`/entities/${entity}${path}`, controller.signal)))
      .then(([accounts, balances, imports]) => { if (!controller.signal.aborted) setSnapshot({ accounts: accounts.accounts || [], balances: balances.balances || [], imports: imports.imports || [] }); })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [entity, refresh, read]);
  return <main className={styles.page}>
    <Link href="/finance">{translateCopy("← Catatan keuangan")}</Link>
    <header><p className={styles.eyebrow}>{translateCopy("Buku keuangan · Preview")}</p><h1>{translateCopy("Setiap angka punya sumber.")}</h1><p>{translateCopy("Rekening dan bukti dipisahkan agar Anda dapat meninjau data dengan tenang.")}</p></header>
    <div className={styles.controls}><label>{translateCopy("Buku")} <select value={entity} onChange={event => setEntity(event.target.value)}><option value="">{translateCopy("Pilih buku")}</option>{entities.map(item => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></label><button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading}>{translateCopy("Muat ulang")}</button></div>
    {error && <p role="alert" className={styles.notice}>{translateCopy(error)}</p>}
    {loading && <p role="status">{translateCopy("Memuat buku keuangan…")}</p>}
    {!loading && !error && !entities.length && <section className={styles.card}><h2>{translateCopy("Buku Anda belum dibuat")}</h2><p>{translateCopy("Pembuatan entitas dan rekening tersedia melalui API staging. Hubungkan pemilik buku sebelum memasukkan bukti nyata.")}</p></section>}
    {entity && <ResearchPanel key={entity} entity={entity} canSubmit={['owner', 'editor'].includes(entities.find(book => book.id === entity)?.role)} />}
    {snapshot && <>
      <section className={styles.card}><h2>{translateCopy("Rekening terkonfigurasi")}</h2><p>{translateCopy("Angka berikut adalah debit dikurangi kredit dari jurnal terposting. Cakupan rekening dapat belum lengkap; angka ini bukan saldo tersedia dari bank.")}</p>
        {!snapshot.accounts.length ? <p>{translateCopy("Belum ada rekening. Saldo keseluruhan belum diketahui.")}</p> : <div className={styles.tableWrap}><table><thead><tr><th>{translateCopy("Rekening")}</th><th>{translateCopy("Jenis")}</th><th>{translateCopy("Debit − kredit")}</th></tr></thead><tbody>{snapshot.accounts.map(account => <tr key={account.id}><td>{account.display_name}</td><td>{account.kind}</td><td className={styles.money}>{snapshot.balances.find(balance => balance.account_id === account.id)?.debit_less_credit ?? translateCopy("Belum tersedia")} {account.currency}</td></tr>)}</tbody></table></div>}
      </section>
      <section className={styles.card}><h2>{translateCopy("Inbox bukti")}</h2><p>{translateCopy("Bukti yang diterima belum menjadi transaksi terposting. Periksa sumber sebelum menolak atau menghubungkannya ke jurnal existing.")}</p>
        {!snapshot.imports.length ? <p>{translateCopy("Belum ada bukti pada buku ini.")}</p> : <ul className={styles.inbox}>{snapshot.imports.map(item => <li key={item.id}><div><strong>{item.source_kind}</strong><span className={styles.badge}>{stateLabels[item.state] || item.state}</span></div><p className={styles.evidence}>{item.text}</p><small>{translateCopy("ID bukti:")} {item.id} · {item.review_state || translateCopy("Belum masuk antrean review")} {translateCopy("· Cuplikan maksimal 4.000 karakter")}</small>{item.review_state === 'needs_review' && item.revision && entities.find(book => book.id === entity)?.role !== 'viewer' && <EvidenceReview key={`${item.id}-${item.revision}`} item={item} entity={entity} accounts={snapshot.accounts} onReviewed={() => setRefresh(value => value + 1)} />}</li>)}</ul>}
      </section>
    </>}
  </main>;
}
