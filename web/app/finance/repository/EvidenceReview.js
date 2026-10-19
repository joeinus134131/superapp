'use client';
import { useRef, useState } from 'react';
import { getCloudAccessToken } from '@superapp/shared/cloud-auth';
import { API_URL } from '@/lib/apiConfig';
import styles from './repository.module.css';
import { useLanguage } from "@superapp/shared/language";


export default function EvidenceReview({ item, entity, accounts, onReviewed }) {
  const { tx: translateCopy } = useLanguage();
  const [action, setAction] = useState('unresolved');
  const [reason, setReason] = useState('');
  const [journal, setJournal] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef(null);
  async function submit(event) {
    event.preventDefault(); setError('');
    const request = { expected_revision: item.revision, action, reason };
    if (action === 'match_existing') request.existing_journal_id = journal;
    if (action === 'accept_new') {
      const debitAccount = accounts.find(account => account.id === debit);
      const creditAccount = accounts.find(account => account.id === credit);
      if (!debitAccount || !creditAccount || debit === credit || debitAccount.currency !== creditAccount.currency || !/^(0|[1-9][0-9]{0,25})(\.[0-9]{1,8})?$/.test(amount) || !/[1-9]/.test(amount)) {
        setError(translateCopy("Pilih dua rekening berbeda, mata uang sama, dan nominal positif tanpa pemisah ribuan.")); return;
      }
      request.journal = { kind: 'standard', effective_date: date, lines: [
        { account_id: debit, side: 'debit', money: { amount, currency: debitAccount.currency } },
        { account_id: credit, side: 'credit', money: { amount, currency: debitAccount.currency } },
      ] };
    }
    const body = JSON.stringify(request);
    if (attempt.current?.body !== body) attempt.current = { body, key: crypto.randomUUID() };
    setBusy(true);
    try {
      const token = await getCloudAccessToken();
      if (!token) throw new Error(translateCopy("Hubungkan kembali akun cloud untuk meninjau bukti."));
      const response = await fetch(`${API_URL}/finance/entities/${entity}/imports/${item.id}/review`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current.key }, body,
      });
      if (!response.ok) throw new Error(response.status === 409 ? translateCopy("Bukti sudah berubah atau ditinjau. Muat ulang sebelum melanjutkan.") : translateCopy("Keputusan belum dikonfirmasi server. Coba lagi dengan isian sama."));
      await response.json(); onReviewed();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <details className={styles.review}><summary>{translateCopy("Tinjau bukti · revisi")} {item.revision}</summary><form onSubmit={submit}>
    <p>{translateCopy("Periksa sumber, lalu hubungkan ke catatan yang sudah Anda periksa atau simpan alasan bukti belum dapat dipastikan.")}</p>
    <label>{translateCopy("Keputusan")}<select value={action} onChange={event => setAction(event.target.value)} disabled={busy}>
      <option value="accept_new">{translateCopy("Catat jurnal baru setelah saya periksa")}</option><option value="unresolved">{translateCopy("Tetap perlu ditinjau")}</option><option value="reject">{translateCopy("Tolak bukti")}</option><option value="match_existing">{translateCopy("Hubungkan ke jurnal existing")}</option>
    </select></label>
    {action === 'match_existing' && <label>{translateCopy("ID jurnal existing")}<input required value={journal} onChange={event => setJournal(event.target.value)} disabled={busy} placeholder={translateCopy("UUID jurnal pada buku ini")} /></label>}
    {action === 'accept_new' && <>
      <label>{translateCopy("Tanggal transaksi")}<input type="date" required value={date} onChange={event => setDate(event.target.value)} disabled={busy} /></label>
      <label>{translateCopy("Rekening debit")}<select required value={debit} onChange={event => setDebit(event.target.value)} disabled={busy}><option value="">{translateCopy("Pilih rekening")}</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.display_name} · {account.kind} · {account.currency}</option>)}</select></label>
      <label>{translateCopy("Rekening kredit")}<select required value={credit} onChange={event => setCredit(event.target.value)} disabled={busy}><option value="">{translateCopy("Pilih rekening")}</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.display_name} · {account.kind} · {account.currency}</option>)}</select></label>
      <label>{translateCopy("Nominal")}<input required inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} placeholder="250000" /></label>
      <p>{translateCopy("Contoh belanja: debit rekening beban, kredit rekening bank. Jurnal baru terposting hanya setelah server mengonfirmasi.")}</p>
    </>}
    <label>{translateCopy("Alasan keputusan")}<textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} /></label>
    {error && <p role="alert">{translateCopy(error)}</p>}
    <button type="submit" disabled={busy}>{busy ? translateCopy("Menunggu konfirmasi server…") : translateCopy("Simpan keputusan")}</button>
  </form></details>;
}
