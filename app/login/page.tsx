'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {client} from '@/lib/supabase/browser';
export default function Login(){
const router=useRouter();const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const {error:authError}=await client().auth.signInWithPassword({email,password});setBusy(false);if(authError){setError(authError.message);return}router.push('/home');router.refresh()}
return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><form onSubmit={submit} style={{width:'100%',maxWidth:390,padding:30,borderRadius:20,background:'#153122',display:'grid',gap:14}}><h1>CloserAI 3.0</h1><p>Entre na sua conta.</p><label htmlFor='email'>E-mail</label><input id='email' type='email' required value={email} onChange={e=>setEmail(e.target.value)}/><label htmlFor='password'>Senha</label><input id='password' type='password' required value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p role='alert'>{error}</p>}<button disabled={busy} type='submit'>{busy?'Entrando…':'Entrar'}</button></form></main>}
