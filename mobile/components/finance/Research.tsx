import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { financeRepository } from '../../lib/financeRepository';
import type { ResearchJob, ResearchReport } from '../../../shared/finance/client';
import syntheticRequest from '../../../shared/finance/research-request-v1.synthetic.json';
import { useLanguage } from "../../context/languageContext";


type Props = { repository: ReturnType<typeof financeRepository>; entity: string; canSubmit: boolean };
export function MobileResearch({ repository, entity, canSubmit }: Props) {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme(); const c = useColors(isDark);
  const [mode, setMode] = useState<'synthetic'|'market'>('synthetic');
  const [universe, setUniverse] = useState('BBCA.JK');
  const [asOf, setAsOf] = useState(''); const [budget, setBudget] = useState(''); const [horizon, setHorizon] = useState('12');
  const [id, setId] = useState(''); const [job, setJob] = useState<ResearchJob|null>(null); const [report, setReport] = useState<ResearchReport|null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const attempt = useRef<{body: string; key: string}|null>(null); const controller = useRef<AbortController|null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function perform(work: (signal: AbortSignal) => Promise<void>) {
    controller.current?.abort(); const next = new AbortController(); controller.current = next; setBusy(true); setError('');
    try { await work(next.signal); } catch (err) { if (!next.signal.aborted) setError(err instanceof Error ? err.message : translateCopy("Riset gagal dimuat.")); }
    finally { if (!next.signal.aborted) setBusy(false); }
  }
  function submit() { perform(async signal => {
    let body: Record<string, unknown> = syntheticRequest;
    if (mode === 'market') {
      if (!/^[0-9]{1,18}(\.[0-9]{1,2})?$/.test(budget) || !/[1-9]/.test(budget)) throw new Error(translateCopy("Nominal positif tanpa pemisah ribuan diperlukan."));
      body = {schema_version:'1',as_of:new Date(asOf).toISOString(),universe:universe.split(',').map(t=>t.trim().toUpperCase()),analysis:{kind:'screening',include_laya:false},constraints:{base_currency:'IDR',budget:{amount:budget,currency:'IDR'},horizon_months:Number(horizon)}};
    }
    const encoded=JSON.stringify(body); if(attempt.current?.body!==encoded) attempt.current={body:encoded,key:Crypto.randomUUID()};
    const result=await repository.submitResearch(entity,body,attempt.current.key,signal); if(signal.aborted)return; setId(result.job_id);setJob(result);setReport(null);
  }); }
  function poll() { perform(async signal => {
    const result=await repository.researchStatus(entity,id,signal);if(signal.aborted)return;setJob(result);setReport(null);
    if(result.report_available){const output=await repository.researchReport(entity,id,signal);if(!signal.aborted)setReport(output);}
  }); }
  return <View style={{gap:14}}>
    <Text style={{color:c.textSecondary,lineHeight:22}}>{translateCopy("Riset read-only. Hasil tidak mengubah jurnal, kepemilikan aset, atau mengirim order.")}</Text>
    {canSubmit && <>
      <Button label={mode==='synthetic'?translateCopy("Sumber: contoh sintetis"):translateCopy("Sumber: provider pasar")} variant="secondary" onPress={()=>setMode(mode==='synthetic'?'market':'synthetic')} disabled={busy}/>
      {mode==='synthetic'?<Text style={{color:c.textSecondary}}>{translateCopy("Contoh BBCA.JK: 100 baris harga buatan, as-of 1 Mei 2025, anggaran konteks IDR 10000000 dan horizon 12 bulan. Bukan posisi Anda.")}</Text>:<>
        <Input label={translateCopy("Simbol IDX, pisahkan koma")} value={universe} onChangeText={setUniverse} autoCapitalize="characters" editable={!busy}/>
        <Input label={translateCopy("Waktu acuan RFC3339 dengan timezone")} placeholder="2026-10-16T00:00:00+07:00" value={asOf} onChangeText={setAsOf} autoCapitalize="none" editable={!busy}/>
        <Input label={translateCopy("Anggaran konteks IDR")} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" editable={!busy}/>
        <Input label={translateCopy("Horizon bulan")} value={horizon} onChangeText={setHorizon} keyboardType="number-pad" editable={!busy}/>
      </>}
      <Button label={translateCopy("Mulai riset")} onPress={submit} loading={busy}/>
    </>}
    <Input label={translateCopy("ID pekerjaan riset Anda")} value={id} onChangeText={setId} autoCapitalize="none" editable={!busy}/>
    <Button label={translateCopy("Baca status dan laporan")} onPress={poll} disabled={busy || !id} variant="secondary"/>
    {!!error && <Text accessibilityRole="alert" style={{color:c.red}}>{translateCopy(error)}</Text>}
    {job && <Text style={{color:c.textPrimary}}>{translateCopy("Status:")} {job.state}{job.failure_code?` · ${job.failure_code}`:''}</Text>}
    {report && <Card style={{padding:18,gap:12}}>
      <Text style={{color:c.textPrimary,fontWeight:'700'}}>{translateCopy("Laporan ·")} {report.baseline}</Text>
      <Text style={{color:c.textSecondary}}>{translateCopy("Data sampai")} {report.data_as_of}{'\n'}{translateCopy("Acuan")} {report.input.as_of}{'\n'}{translateCopy("Versi")} {report.engine_version}</Text>
      <Text style={{color:c.textPrimary}}>{report.rl_executed?translateCopy("RL dijalankan"):translateCopy("RL tidak dijalankan")} · Laya: {report.laya.state}</Text>
      {report.sources.map((source,i)=><Text key={i} style={{color:c.textPrimary}}>{source.provider} · {source.synthetic?'SINTETIS':translateCopy("Data provider")} · {source.rows} {translateCopy("baris")}</Text>)}
      <Text style={{color:c.textPrimary,fontWeight:'700'}}>{translateCopy("Keterbatasan")}</Text>{report.limitations.map((text,i)=><Text key={i} style={{color:c.textSecondary,lineHeight:22}}>• {text}</Text>)}
      <Text style={{color:c.textSecondary}}>{translateCopy("Skor/confidence adalah keluaran metode riset, bukan peluang keuntungan.")}</Text>
      {report.screening.map((row,i)=><Text key={i} style={{color:c.textPrimary}}>{row.ticker}: {row.label} {translateCopy("· skor")} {row.score??translateCopy("tidak tersedia")} · confidence {row.confidence??translateCopy("tidak tersedia")}</Text>)}
    </Card>}
  </View>;
}
