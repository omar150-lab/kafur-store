'use client';
import {useState} from 'react';
import {MessageCircle} from 'lucide-react';
import {SIZES} from '@/lib/pricing';
import {egp} from '@/lib/format';
import {site,waLink} from '@/lib/config';

export default function ProductBuy({slug,name}:{slug:string;name:string}){
  const [ml,setMl]=useState<number>(SIZES[1]?.ml??SIZES[0].ml);
  const size=SIZES.find(s=>s.ml===ml)??SIZES[0];
  const link=`${site.url}/product/${slug}`;
  const text=`مرحبًا كافور، عايز أطلب عطر ${name} حجم ${size.ml} مل (${egp(size.price)})${site.url.includes('localhost')?'':`\n${link}`}`;
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
      {wa
        ?<a href={wa} target="_blank" rel="noopener noreferrer" className="btn-dark mt-5 w-full"><MessageCircle className="me-2 size-5" aria-hidden/>اطلب {size.ml} مل عبر واتساب</a>
        :<p className="mt-5 border border-dashed border-ink/25 p-4 text-center text-sm text-ink/60">الطلب عبر واتساب سيتاح بعد ضبط رقم المتجر.</p>}
      <p className="mt-3 text-xs text-ink/60">السلة وإتمام الطلب بالتفصيل تأتي في المرحلة التالية. حاليًا يصلك الطلب مباشرة على واتساب.</p>
    </div>
  );
}
