'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {Minus,Plus,Trash2} from 'lucide-react';
import Bottle from './Bottle';
import {useCart} from './CartProvider';
import {MAX_QTY} from '@/lib/cart';
import {priceCart,validateCustomer,type CatalogLite,type FieldErrors} from '@/lib/order';
import {governoratesOf} from '@/lib/shipping';
import {egp} from '@/lib/format';
import {site} from '@/lib/config';

const field='w-full rounded-sm border bg-ivory px-3 py-2.5 text-sm focus:border-champagne';
const empty={name:'',phone:'',governorate:'',address:'',notes:''};

export default function CartView({catalog}:{catalog:CatalogLite}){
  const {items,ready,setQty,remove,clear}=useCart();
  const [form,setForm]=useState(empty);
  const [errors,setErrors]=useState<FieldErrors>({});
  const [status,setStatus]=useState<'idle'|'sending'|'done'|'error'>('idle');
  const [message,setMessage]=useState('');
  const [waUrl,setWaUrl]=useState('');
  const [orderNo,setOrderNo]=useState<string|null>(null);

  const quote=useMemo(()=>priceCart(items,catalog,form.governorate),[items,catalog,form.governorate]);
  const set=(k:keyof typeof empty)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>{setForm(f=>({...f,[k]:e.target.value}));if(errors[k])setErrors(x=>({...x,[k]:undefined}));};

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(status==='sending')return;
    const v=validateCustomer(form,form.governorate,governoratesOf(catalog.tiers));
    if(!v.ok){setErrors(v.errors);setMessage('راجع الحقول المعلّمة.');setStatus('error');return;}
    setErrors({});setMessage('');setStatus('sending');
    try{
      const res=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items,governorate:form.governorate,customer:form})});
      const data=await res.json();
      if(!res.ok||!data.ok){setErrors(data.errors??{});setMessage(data.message??'حصلت مشكلة، جرّب تاني.');setStatus('error');return;}
      setWaUrl(data.whatsappUrl);setOrderNo(data.orderNo??null);setStatus('done');
      window.location.assign(data.whatsappUrl);
    }catch{setMessage('تعذر الاتصال بالخادم. اتأكد من النت وجرّب تاني.');setStatus('error');}
  }

  if(!ready)return <p className="py-20 text-center text-ink/60" role="status">جارٍ تحميل السلة…</p>;
  if(!quote.lines.length)return(
    <div className="border border-dashed border-ink/25 px-6 py-20 text-center">
      <p className="font-display text-3xl">السلة فاضية</p>
      <p className="mt-2 text-sm text-ink/60">اختار عطرك وحجمه وضيفه للسلة.</p>
      <Link href="/shop" className="btn-dark mt-8">تصفّح العطور</Link>
    </div>
  );

  const err=(k:keyof typeof empty)=>errors[k]?{'aria-invalid':true,'aria-describedby':`e-${k}`}:{};
  const border=(k:keyof typeof empty)=>errors[k]?'border-red-700':'border-ink/25';
  const Err=({k}:{k:keyof typeof empty})=>errors[k]?<p id={`e-${k}`} className="mt-1 text-xs text-red-700">{errors[k]}</p>:null;

  return(
    <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
      <section aria-labelledby="items-h">
        <h2 id="items-h" className="sr-only">محتويات السلة</h2>
        <ul className="divide-y divide-stone border-y border-stone">
          {quote.lines.map(l=>(
            <li key={`${l.slug}-${l.ml}`} className="flex gap-4 py-5">
              <Link href={`/product/${l.slug}`} className="stage h-28 w-20 shrink-0 rounded-sm !pb-1" aria-label={l.name}><Bottle tint={l.color} className="h-4/5 w-auto"/></Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/product/${l.slug}`} className="font-display text-xl hover:text-champagne">{l.name}</Link>
                <p className="text-xs text-ink/60">{l.house} · {l.ml} مل · {egp(l.unit)} للقطعة</p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center border border-ink/25" role="group" aria-label={`الكمية: ${l.name} ${l.ml} مل`}>
                    <button type="button" className="p-2 hover:text-champagne" aria-label="تقليل الكمية" onClick={()=>setQty(l.slug,l.ml,l.qty-1)}><Minus className="size-4"/></button>
                    <span className="min-w-8 text-center text-sm" aria-live="polite">{l.qty}</span>
                    <button type="button" className="p-2 hover:text-champagne disabled:opacity-30" aria-label="زيادة الكمية" disabled={l.qty>=MAX_QTY} onClick={()=>setQty(l.slug,l.ml,l.qty+1)}><Plus className="size-4"/></button>
                  </div>
                  <p className="font-display text-xl">{egp(l.total)}</p>
                </div>
              </div>
              <button type="button" className="self-start p-2 text-ink/50 hover:text-red-700" aria-label={`حذف ${l.name} ${l.ml} مل`} onClick={()=>remove(l.slug,l.ml)}><Trash2 className="size-5"/></button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink/50">أقصى كمية لكل صنف {MAX_QTY}. للكميات الأكبر كلمنا على واتساب.</p>
      </section>

      <form onSubmit={submit} noValidate className="h-fit border border-ink/15 bg-ivory p-6 lg:sticky lg:top-24" aria-labelledby="order-h">
        <h2 id="order-h" className="font-display text-2xl">بيانات الطلب</h2>
        <div className="mt-5 space-y-4">
          <label className="block text-sm">الاسم<input value={form.name} onChange={set('name')} autoComplete="name" maxLength={60} className={`${field} ${border('name')} mt-1`} {...err('name')}/><Err k="name"/></label>
          <label className="block text-sm">رقم الموبايل<input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="01012345678" maxLength={20} className={`${field} ${border('phone')} mt-1 text-end`} {...err('phone')}/><Err k="phone"/></label>
          <label className="block text-sm">المحافظة
            <select value={form.governorate} onChange={set('governorate')} className={`${field} ${border('governorate')} mt-1`} {...err('governorate')}>
              <option value="">اختار المحافظة</option>
              {catalog.tiers.map(t=><optgroup key={t.id} label={`${t.label} · الشحن ${egp(t.fee)}`}>{t.governorates.map(g=><option key={g} value={g}>{g}</option>)}</optgroup>)}
            </select><Err k="governorate"/>
          </label>
          <label className="block text-sm">العنوان بالتفصيل<textarea value={form.address} onChange={set('address')} autoComplete="street-address" rows={3} maxLength={250} className={`${field} ${border('address')} mt-1`} {...err('address')}/><Err k="address"/></label>
          <label className="block text-sm">ملاحظات (اختياري)<textarea value={form.notes} onChange={set('notes')} rows={2} maxLength={300} className={`${field} ${border('notes')} mt-1`} {...err('notes')}/><Err k="notes"/></label>
        </div>

        <dl className="mt-6 space-y-2 border-t border-stone pt-5 text-sm">
          <div className="flex justify-between"><dt>المجموع ({quote.count} قطعة)</dt><dd>{egp(quote.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>الشحن</dt><dd>{quote.shipping===null?'يتحدد باختيار المحافظة':egp(quote.shipping)}</dd></div>
          <div className="flex items-baseline justify-between border-t border-stone pt-3"><dt>الإجمالي</dt><dd className="font-display text-3xl">{quote.total===null?'-':egp(quote.total)}</dd></div>
        </dl>
        {site.demo&&<p className="mt-2 text-xs text-champagne">الأسعار وتكلفة الشحن تجريبية وتُؤكَّد معاك على واتساب.</p>}

        {message&&<p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
        <button type="submit" disabled={status==='sending'} className="btn-dark mt-5 w-full disabled:opacity-60">{status==='sending'?'جارٍ تجهيز الطلب…':'أرسل الطلب عبر واتساب'}</button>
        <p className="mt-3 text-xs text-ink/60">هيتفتح واتساب برسالة جاهزة فيها طلبك. الطلب بيتأكد لما ترسلها لنا.</p>

        {status==='done'&&(
          <div className="mt-5 border border-champagne/50 p-4 text-sm" role="status">
            {orderNo&&<p className="mb-2">رقم طلبك: <strong>{orderNo}</strong></p>}
            <p>لو واتساب ما اتفتحش لوحده، اضغط هنا:</p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-line mt-3 w-full">افتح واتساب</a>
            <button type="button" className="mt-3 w-full text-xs text-ink/60 underline" onClick={()=>{clear();setForm(empty);setOrderNo(null);setStatus('idle');}}>بعد ما تبعت الرسالة: فضّي السلة</button>
          </div>
        )}
      </form>
    </div>
  );
}
