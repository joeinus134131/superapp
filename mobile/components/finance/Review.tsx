import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { financeRepository } from '../../lib/financeRepository';
import type { Source, Account } from '../../../shared/finance/client';
import { useLanguage } from "../../context/languageContext";


type Props={repository:ReturnType<typeof financeRepository>;entity:string;source:Source;accounts:Account[];onConfirmed:()=>void};
export function MobileReview({repository,entity,source,accounts,onConfirmed}:Props){
  const { tx: translateCopy } = useLanguage();
 const {isDark}=useTheme();const c=useColors(isDark);
 const [action,setAction]=useState('unresolved');const [reason,setReason]=useState('');const [match,setMatch]=useState('');
 const [debit,setDebit]=useState('');const [credit,setCredit]=useState('');const [amount,setAmount]=useState('');const [date,setDate]=useState('');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const attempt=useRef<{body:string;key:string}|null>(null);const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function submit(){
  if(!reason.trim()){setError(translateCopy("Alasan keputusan wajib diisi."));return;}
  const request:Record<string,unknown>={expected_revision:source.revision,action,reason};
  if(action==='match_existing')request.existing_journal_id=match;
  if(action==='accept_new'){
   const a=accounts.find(x=>x.id===debit),b=accounts.find(x=>x.id===credit);
   if(!a || !b || debit===credit || a.currency!==b.currency || !/^(0|[1-9][0-9]{0,25})(\.[0-9]{1,8})?$/.test(amount) || !/[1-9]/.test(amount) || !/^\d{4}-\d{2}-\d{2}$/.test(date)){setError(translateCopy("Periksa dua rekening berbeda, mata uang sama, nominal positif dan tanggal YYYY-MM-DD."));return;}
   request.journal={kind:'standard',effective_date:date,lines:[{account_id:debit,side:'debit',money:{amount,currency:a.currency}},{account_id:credit,side:'credit',money:{amount,currency:a.currency}}]};
  }
  const body=JSON.stringify(request);if(attempt.current?.body!==body)attempt.current={body,key:Crypto.randomUUID()};
  const next=new AbortController();controller.current=next;setBusy(true);setError('');
  try{await repository.review(entity,source.id,request,attempt.current.key,next.signal);if(!next.signal.aborted)onConfirmed();}
  catch(err){if(!next.signal.aborted)setError(err instanceof Error?err.message:translateCopy("Keputusan belum dikonfirmasi."));}
  finally{if(!next.signal.aborted)setBusy(false);}
 }
 return <View style={{gap:12}}>
  <Text style={{color:c.textPrimary,fontWeight:'700'}}>{translateCopy("Tinjau revisi")} {source.revision}</Text>
  {(['unresolved','reject','match_existing','accept_new'] as const).map(value=><Button key={value} label={`${action===value?'✓ ':''}${{unresolved:translateCopy("Tetap perlu ditinjau"),reject:'Tolak',match_existing:translateCopy("Hubungkan jurnal existing"),accept_new:translateCopy("Catat jurnal baru")}[value]}`} onPress={()=>setAction(value)} variant="secondary" disabled={busy}/>)}
  {action==='match_existing'&&<Input label={translateCopy("ID jurnal existing")} value={match} onChangeText={setMatch} autoCapitalize="none" editable={!busy}/>}
  {action==='accept_new'&&<>
   <Input label={translateCopy("Tanggal YYYY-MM-DD")} value={date} onChangeText={setDate} editable={!busy}/>
   <Text style={{color:c.textPrimary}}>{translateCopy("Rekening debit")}</Text>{accounts.map(a=><Button key={a.id} label={`${debit===a.id?'✓ ':''}${a.display_name} · ${a.kind} · ${a.currency}`} onPress={()=>setDebit(a.id)} variant="secondary" disabled={busy}/>)}
   <Text style={{color:c.textPrimary}}>{translateCopy("Rekening kredit")}</Text>{accounts.map(a=><Button key={a.id} label={`${credit===a.id?'✓ ':''}${a.display_name} · ${a.kind} · ${a.currency}`} onPress={()=>setCredit(a.id)} variant="secondary" disabled={busy}/>)}
   <Input label={translateCopy("Nominal tanpa pemisah ribuan")} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy}/>
   <Text style={{color:c.textSecondary}}>{translateCopy("Contoh belanja: debit beban, kredit bank. Jurnal terposting hanya sesudah konfirmasi server.")}</Text>
  </>}
  <Input label={translateCopy("Alasan keputusan")} value={reason} onChangeText={setReason} multiline maxLength={1000} editable={!busy}/>
  {!!error&&<Text accessibilityRole="alert" style={{color:c.red}}>{translateCopy(error)}</Text>}
  <Button label={translateCopy("Simpan keputusan")} onPress={submit} loading={busy}/>
 </View>;
}
