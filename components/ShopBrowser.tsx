'use client';
import {useMemo,useState} from 'react';
import {Search,SlidersHorizontal,X} from 'lucide-react';
import ProductCard from './ProductCard';
import {CONCENTRATION,type Product} from '@/lib/products';
import {SEASON_LABEL,SORT_OPTIONS,activeFilterCount,filterProducts,houses,noteOptions,serializeFilters,sortProducts,type Filters,type SortKey} from '@/lib/catalog';

const chip=(on:boolean,disabled:boolean)=>`rounded-full border px-4 py-1.5 text-sm transition ${on?'border-ink bg-ink text-ivory':'border-ink/25 hover:border-champagne hover:text-champagne'} ${disabled?'pointer-events-none opacity-35':''}`;
const field='w-full rounded-sm border border-ink/25 bg-ivory px-3 py-2 text-sm focus:border-champagne';

export default function ShopBrowser({products,initial}:{products:Product[];initial:Filters}){
  const [f,setF]=useState<Filters>(initial);
  const [open,setOpen]=useState(false);

  const update=(patch:Partial<Filters>)=>{
    const next={...f,...patch};
    setF(next);
    // نحدّث الرابط بدون تنقل: الفلاتر قابلة للمشاركة والنسخ.
    const qs=serializeFilters(next);
    window.history.replaceState(null,'',qs?`?${qs}`:window.location.pathname);
  };
  const toggle=<K extends 'season'|'conc'>(k:K,v:Filters[K])=>update({[k]:f[k]===v?undefined:v} as Partial<Filters>);

  const results=useMemo(()=>sortProducts(filterProducts(products,f),f.sort),[products,f]);
  // العدّاد بجانب كل خيار = عدد النتائج لو اخترته مع باقي الفلاتر الحالية.
  const count=(patch:Partial<Filters>)=>filterProducts(products,{...f,...patch}).length;
  const houseList=useMemo(()=>houses(products),[products]);
  const noteList=useMemo(()=>noteOptions(products),[products]);
  const active=activeFilterCount(f);

  return(
    <div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative block">
          <span className="sr-only">ابحث عن عطر</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink/50" aria-hidden/>
          <input type="search" value={f.q} onChange={e=>update({q:e.target.value})} placeholder="ابحث بالاسم أو الدار أو النوتة (مثال: عود، ديور، sauvage)" className={`${field} ps-10`} maxLength={80}/>
        </label>
        <div className="flex gap-3">
          <label className="flex-1 md:flex-none">
            <span className="sr-only">الترتيب</span>
            <select value={f.sort} onChange={e=>update({sort:e.target.value as SortKey})} className={field}>{SORT_OPTIONS.map(o=><option key={o.key} value={o.key}>ترتيب: {o.label}</option>)}</select>
          </label>
          <button type="button" className="btn-line !px-4 !py-2 text-sm md:hidden" aria-expanded={open} aria-controls="filters" onClick={()=>setOpen(!open)}><SlidersHorizontal className="me-2 size-4" aria-hidden/>الفلاتر{active>0&&` (${active})`}</button>
        </div>
      </div>

      <div id="filters" className={`${open?'block':'hidden'} mt-5 space-y-5 border-y border-stone py-5 md:block`}>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <fieldset><legend className="mb-2 text-xs text-ink/60">الموسم</legend>
            <div className="flex flex-wrap gap-2">{(Object.keys(SEASON_LABEL) as (keyof typeof SEASON_LABEL)[]).map(s=>{const n=count({season:s});return <button key={s} type="button" aria-pressed={f.season===s} className={chip(f.season===s,n===0&&f.season!==s)} onClick={()=>toggle('season',s)}>{SEASON_LABEL[s]} <span className="text-xs opacity-60">{n}</span></button>;})}</div>
          </fieldset>
          <fieldset><legend className="mb-2 text-xs text-ink/60">التركيز</legend>
            <div className="flex flex-wrap gap-2">{(Object.keys(CONCENTRATION) as (keyof typeof CONCENTRATION)[]).map(c=>{const n=count({conc:c});return <button key={c} type="button" aria-pressed={f.conc===c} className={chip(f.conc===c,n===0&&f.conc!==c)} onClick={()=>toggle('conc',c)}>{CONCENTRATION[c]} <span className="text-xs opacity-60">{n}</span></button>;})}</div>
          </fieldset>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:max-w-2xl">
          <label className="block text-xs text-ink/60">الدار
            <select value={f.house??''} onChange={e=>update({house:e.target.value||undefined})} className={`${field} mt-2 text-ink`}>
              <option value="">كل الدور</option>
              {houseList.map(h=>{const n=count({house:h});return <option key={h} value={h} disabled={n===0&&f.house!==h}>{h} ({n})</option>;})}
            </select>
          </label>
          <label className="block text-xs text-ink/60">النوتة
            <select value={f.note??''} onChange={e=>update({note:e.target.value||undefined})} className={`${field} mt-2 text-ink`}>
              <option value="">كل النوتات</option>
              {noteList.map(n=>{const c=count({note:n.key});return <option key={n.key} value={n.key} disabled={c===0&&f.note!==n.key}>{n.name} ({c})</option>;})}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <p aria-live="polite" role="status">{results.length===products.length?`${results.length} عطر`:`${results.length} من ${products.length} عطر`}</p>
        {active>0&&<button type="button" className="inline-flex items-center gap-1 text-champagne hover:underline" onClick={()=>update({q:'',season:undefined,conc:undefined,house:undefined,note:undefined})}><X className="size-4" aria-hidden/>مسح الفلاتر</button>}
      </div>

      {results.length>0
        ?<div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{results.map(p=><ProductCard key={p.slug} p={p}/>)}</div>
        :<div className="mt-10 border border-dashed border-ink/25 px-6 py-16 text-center"><p className="font-display text-2xl">لا يوجد عطر بهذه المواصفات</p><p className="mt-2 text-sm text-ink/60">جرّب كلمة أقصر، أو خفّف بعض الفلاتر.</p></div>}
    </div>
  );
}
