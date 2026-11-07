'use client';
import {useState} from 'react';

export default function AdminLogin({notice}:{notice?:string}){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState(notice??'');
  const [busy,setBusy]=useState(false);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(busy)return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const d=await res.json().catch(()=>({}));
      if(res.ok&&d.ok){window.location.assign('/admin');return;}
      setError(d.message??'تعذر تسجيل الدخول.');
    }catch{setError('تعذر الاتصال. اتأكد من النت وجرّب تاني.');}
    setBusy(false);
  }
  const f='w-full rounded-sm border border-ink/25 bg-ivory px-3 py-2.5 text-sm focus:border-champagne';
  return(
    <form onSubmit={submit} className="w-full max-w-sm border border-ink/15 bg-ivory p-8" aria-labelledby="login-h">
      <p className="font-logo text-xl tracking-[.4em]">KAFUR</p>
      <h1 id="login-h" className="mt-3 font-display text-3xl">لوحة التحكم</h1>
      <label className="mt-6 block text-sm">الإيميل<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" dir="ltr" required maxLength={254} className={`${f} mt-1 text-end`}/></label>
      <label className="mt-4 block text-sm">كلمة السر<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" dir="ltr" required maxLength={200} className={`${f} mt-1 text-end`}/></label>
      {error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="btn-dark mt-6 w-full disabled:opacity-60">{busy?'جارٍ الدخول…':'دخول'}</button>
    </form>
  );
}
