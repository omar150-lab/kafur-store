'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {ORDER_STATUSES,STATUS_LABEL,type OrderStatus} from '@/lib/admin';

export default function OrderStatus({id,status}:{id:string;status:OrderStatus}){
  const router=useRouter();
  const [value,setValue]=useState(status);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  async function change(next:OrderStatus){
    const prev=value;
    setValue(next);setBusy(true);setError('');
    try{
      const res=await fetch(`/api/admin/orders/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:next})});
      const d=await res.json().catch(()=>({}));
      if(res.status===401){window.location.assign('/admin/login');return;}
      if(!res.ok||!d.ok){setValue(prev);setError(d.message??'تعذر الحفظ.');}
      else router.refresh();
    }catch{setValue(prev);setError('تعذر الاتصال.');}
    setBusy(false);
  }
  return(
    <div>
      <label className="sr-only" htmlFor={`st-${id}`}>حالة الطلب</label>
      <select id={`st-${id}`} value={value} disabled={busy} onChange={e=>change(e.target.value as OrderStatus)} className="rounded-sm border border-ink/25 bg-ivory px-3 py-2 text-sm disabled:opacity-60">
        {ORDER_STATUSES.map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
      </select>
      {error&&<p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
