'use client';
import {useState} from 'react';
import Link from 'next/link';
import {MessageCircle,ShoppingBag} from 'lucide-react';
import {useCart} from './CartProvider';
import {SIZES} from '@/lib/pricing';
import {egp} from '@/lib/format';
import {site,waLink} from '@/lib/config';

export default function ProductBuy({slug,name}:{slug:string;name:string}){
  const [ml,setMl]=useState<number>(SIZES[1]?.ml??SIZES[0].ml);
  const {add}=useCart();
  const [added,setAdded]=useState<number|null>(null);
  const size=SIZES.find(s=>s.ml===ml)??SIZES[0];
  const link=`${site.url}/product/${slug}`;
  const text=`مرحبًا كافور، عايز أستفسر عن عطر ${name} حجم ${size.ml} مل (${egp(size.price)})${site.url.includes('localhost')?'':`\n${link}`}`;
  const wa=waLink(text);
  return(
    <div>
      <fieldset>
        <legend className="mb-3 text-sm text-ink/60">اختر الحجم</legend>
        <div className="grid grid-cols-3 gap-3">
          {SIZES.map(s=>(
            <label key={s.ml} className={`cursor-pointer border px-3 py-4 text-center transition has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-ivory has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-champagne ${s.ml===ml?'':'border-ink/25 hover:border-champagne'}`}>
              <input type="radio" name="size" value={s.ml} checked={s.ml===ml} onChange={()=>setMl(s.ml)} className="sr-only"/>
              <span className="block font-display text-2xl">{s.ml}<span className="text-sm"> مل</span></span>
              <span className="mt-1 block text-xs opacity-70">{egp(s.price)}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex items-baseline justify-between border-t border-stone pt-5">
        <span className="text-sm text-ink/60">السعر</span>
        <p aria-live="polite"><span className="font-display text-4xl">{egp(size.price)}</span>{site.demo&&<span className="ms-2 text-xs text-champagne">سعر تجريبي</span>}</p>
      </div>
      <button type="button" className="btn-dark mt-5 w-full" onClick={()=>{add(slug,size.ml);setAdded(size.ml);}}><ShoppingBag className="me-2 size-5" aria-hidden/>أضف {size.ml} مل للسلة</button>
      <p className="mt-3 min-h-5 text-sm" role="status" aria-live="polite">{added!==null&&<>تمت إضافة {name} ({added} مل). <Link href="/cart" className="text-champagne underline">عرض السلة وإتمام الطلب</Link></>}</p>
      {wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="btn-line mt-2 w-full"><MessageCircle className="me-2 size-5" aria-hidden/>اسأل عن هذا الحجم على واتساب</a>}
    </div>
  );
}
