import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/themeContext';
import { useSettings } from '../../context/settingsContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { financeRepository } from '../../lib/financeRepository';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MobileReview } from '../../components/finance/Review';
import { MobileResearch } from '../../components/finance/Research';
import type { Entity, Account, Balance, Source } from '../../../shared/finance/client';
import { useLanguage } from "../../context/languageContext";


type Snapshot={accounts:Account[];balances:Balance[];sources:Source[]};
export default function FinanceRepositoryScreen(){
  const { tx: translateCopy } = useLanguage();
 const {user,loading}=useAuth();const {isDark}=useTheme();const c=useColors(isDark);
 if(loading)return <ActivityIndicator accessibilityLabel={translateCopy("Memuat sesi")}/>;
 if(!user)return <Text style={{color:c.textPrimary,padding:24}}>{translateCopy("Masuk untuk membuka buku keuangan.")}</Text>;
 return <RepositoryView key={user.id} userId={user.id}/>;
}
function RepositoryView({userId}:{userId:string}){
  const { tx: translateCopy } = useLanguage();
 const {isDark}=useTheme();const c=useColors(isDark);const layout=useMobileLayout();const router=useRouter();const {settings}=useSettings();
 const repository=useMemo(()=>financeRepository(userId),[userId]);
 const [entities,setEntities]=useState<Entity[]>([]);const [entity,setEntity]=useState('');const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [tab,setTab]=useState<'accounts'|'inbox'|'research'>('accounts');const [refresh,setRefresh]=useState(0);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const [selected,setSelected]=useState('');const [name,setName]=useState('');const [kind,setKind]=useState('personal');const [busy,setBusy]=useState(false);
 const creation=useRef<{name:string;kind:string;id:string}|null>(null);
 useEffect(()=>{const controller=new AbortController();setError('');setLoading(true);
  repository.entities(controller.signal).then(data=>{if(controller.signal.aborted)return;setEntities(data.entities||[]);setEntity(previous=>data.entities?.some(e=>e.id===previous)?previous:data.entities?.[0]?.id||'');}).catch(err=>{if(!controller.signal.aborted)setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[repository,refresh]);
 useEffect(()=>{if(!entity){setSnapshot(null);return;}const controller=new AbortController();setSnapshot(null);setSelected('');setLoading(true);setError('');
  Promise.all([repository.accounts(entity,controller.signal),repository.balances(entity,controller.signal),repository.sources(entity,controller.signal)]).then(([a,b,s])=>{if(!controller.signal.aborted)setSnapshot({accounts:a.accounts||[],balances:b.balances||[],sources:s.imports||[]});}).catch(err=>{if(!controller.signal.aborted)setError(err.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[entity,refresh,repository]);
 async function create(){if(!name.trim())return;setBusy(true);setError('');if(creation.current?.name!==name || creation.current?.kind!==kind)creation.current={name,kind,id:Crypto.randomUUID()};try{await repository.createEntity({id:creation.current.id,kind,display_name:name,base_currency:'IDR'});setName('');setRefresh(x=>x+1);}catch(err){setError(err instanceof Error?err.message:translateCopy("Buku belum dikonfirmasi."));}finally{setBusy(false);}}
 const current=entities.find(e=>e.id===entity);const canWrite=current?.role==='owner'||current?.role==='editor';
 return (
  <View style={{flex:1,backgroundColor:c.bgPrimary}}>
   <WhenyaHeader
    title={translateCopy("Buku Keuangan")}
    subtitle={translateCopy("Data kanonikal server & rekening")}
    showBack={true}
    onBack={()=>router.back()}
   />
   <ScrollView style={{flex:1,backgroundColor:c.bgPrimary}} contentContainerStyle={{padding:20,paddingTop:14,paddingBottom:120,gap:18}} refreshControl={<RefreshControl refreshing={loading} onRefresh={()=>setRefresh(x=>x+1)}/>} keyboardShouldPersistTaps="handled">
    <Text style={{color:c.textSecondary,lineHeight:22}}>{translateCopy("Data canonical dari server. Bukti, jurnal terposting, dan riset ditampilkan terpisah.")}</Text>
  {!!error&&<Text accessibilityRole="alert" style={{color:c.red}}>{translateCopy(error)}</Text>}
  <View style={{gap:8}}>{entities.map(book=><Button key={book.id} label={`${entity===book.id?'✓ ':''}${book.display_name} · ${book.role}`} variant="secondary" onPress={()=>setEntity(book.id)}/>)}</View>
  {!loading&&!entities.length&&!error&&<Card style={{padding:20,gap:12}}>
   <Text style={{color:c.textPrimary}}>{translateCopy("Buat buku setelah Anda menentukan pemiliknya. Tidak ada rekening BRI/BNI yang dibuat otomatis.")}</Text>
   <Input label={translateCopy("Nama buku")} value={name} onChangeText={setName} editable={!busy}/>
   <Button label={translateCopy("Jenis: {0}", [kind==='personal'?'pribadi':'bisnis'])} variant="secondary" onPress={()=>setKind(kind==='personal'?'business':'personal')} disabled={busy}/>
   <Text style={{color:c.textSecondary}}>{translateCopy("Mata uang dasar IDR")}</Text><Button label={translateCopy("Buat buku")} onPress={create} loading={busy}/>
  </Card>}
  {!!entity&&<>
   <View style={{gap:8,flexDirection:'row',flexWrap:'wrap'}}>{(['accounts','inbox','research'] as const).map(value=><Button key={value} label={{accounts:translateCopy("Rekening"),inbox:'Inbox',research:'Riset'}[value]} variant={tab===value?'primary':'secondary'} onPress={()=>setTab(value)} size="small"/>)}</View>
   {tab==='accounts'&&snapshot&&<Card style={{padding:20,gap:16}}>
    <Text style={{color:c.textSecondary}}>{translateCopy("Debit dikurangi kredit dari jurnal terposting. Cakupan rekening belum tentu lengkap; bukan saldo tersedia dari bank.")}</Text>
    {!snapshot.accounts.length&&<Text style={{color:c.textPrimary}}>{translateCopy("Belum ada rekening. Saldo keseluruhan belum diketahui.")}</Text>}
    {snapshot.accounts.map(account=><View key={account.id} style={{gap:5}}><Text style={{color:c.textPrimary,fontWeight:'700'}}>{account.display_name} · {account.kind}</Text><Text style={{color:c.textSecondary,fontVariant:['tabular-nums']}}>{settings.hideFinanceBalance?'******':snapshot.balances.find(b=>b.account_id===account.id)?.debit_less_credit??translateCopy("Belum tersedia")} {account.currency}</Text></View>)}
    {canWrite&&<AccountCreator key={entity} repository={repository} entity={entity} onCreated={()=>setRefresh(x=>x+1)}/>}
   </Card>}
   {tab==='inbox'&&snapshot&&<View style={{gap:14}}>
    <Text style={{color:c.textSecondary}}>{translateCopy("Bukti masuk belum berarti uang terposting. BRI/BNI tetap perlu mapping dan review yang Anda konfirmasi.")}</Text>
    {!snapshot.sources.length&&<Text style={{color:c.textPrimary}}>{translateCopy("Belum ada bukti.")}</Text>}
    {snapshot.sources.map(source=><Card key={source.id} style={{padding:18,gap:12}}>
     <Text style={{color:c.textPrimary,fontWeight:'700'}}>{source.source_kind} · {source.review_state||source.state}</Text>
     <Text selectable style={{color:c.textSecondary,lineHeight:22}}>{source.text}</Text><Text selectable style={{color:c.textMuted}}>ID: {source.id} {translateCopy("· cuplikan maks. 4000 karakter")}</Text>
     {canWrite&&source.review_state==='needs_review'&&source.revision&&<Button label={selected===source.id?translateCopy("Tutup tinjauan"):translateCopy("Tinjau bukti")} variant="secondary" onPress={()=>setSelected(selected===source.id?'':source.id)}/>}
     {selected===source.id&&<MobileReview key={`${source.id}-${source.revision}`} repository={repository} entity={entity} source={source} accounts={snapshot.accounts} onConfirmed={()=>{setSelected('');setRefresh(x=>x+1);}}/>}
    </Card>)}
   </View>}
   {tab==='research'&&<MobileResearch key={entity} repository={repository} entity={entity} canSubmit={canWrite}/>}
  </>}
  </ScrollView>
 </View>
);
}
function AccountCreator({repository,entity,onCreated}:{repository:ReturnType<typeof financeRepository>;entity:string;onCreated:()=>void}){
  const { tx: translateCopy } = useLanguage();
 const [name,setName]=useState('');const [kind,setKind]=useState('bank');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const {isDark}=useTheme();const c=useColors(isDark);const attempt=useRef<{name:string;kind:string;id:string}|null>(null);
 async function create(){if(!name.trim())return;if(attempt.current?.name!==name||attempt.current?.kind!==kind)attempt.current={name,kind,id:Crypto.randomUUID()};setBusy(true);setError('');try{await repository.createAccount(entity,{id:attempt.current.id,kind,display_name:name,currency:'IDR'});onCreated();}catch(err){setError(err instanceof Error?err.message:translateCopy("Rekening belum dikonfirmasi."));}finally{setBusy(false);}}
 return <View style={{gap:10}}><Text style={{color:c.textPrimary,fontWeight:'700'}}>{translateCopy("Tambah rekening IDR")}</Text><Input label={translateCopy("Nama rekening pilihan Anda")} value={name} onChangeText={setName} editable={!busy}/><View style={{gap:8}}>{['bank','cash','ewallet','expense','income','equity','asset','liability'].map(value=><Button key={value} label={`${kind===value?'✓ ':''}${value}`} variant="secondary" onPress={()=>setKind(value)} disabled={busy}/>)}</View><Text style={{color:c.textSecondary}}>{translateCopy("Pembuatan rekening tidak mengasumsikan saldo pembukaan.")}</Text>{!!error&&<Text accessibilityRole="alert" style={{color:c.red}}>{translateCopy(error)}</Text>}<Button label={translateCopy("Buat rekening")} onPress={create} loading={busy}/></View>;
}
