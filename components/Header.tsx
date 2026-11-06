'use client';
import {useState} from 'react';
import Link from 'next/link';
import {Menu,ShoppingBag,X} from 'lucide-react';
import {useCart} from './CartProvider';
import {waLink} from '@/lib/config';
const links=[['المتجر','/shop'],['المجموعة الشتوية','/#winter'],['الأحجام والأسعار','/#sizes'],['قصة كافور','/#story'],['تواصل','/#contact']] as const;
export default function Header(){
  const [open,setOpen]=useState(false);
  const {count}=useCart();
  const wa=waLink('مرحبًا كافور، عايز أستفسر عن العطور');
  return(
    <header className="sticky top-0 z-40 border-b border-stone/70 bg-ivory/90 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 py-3">
        <nav className="hidden gap-7 text-sm md:flex" aria-label="التنقل الرئيسي">
          {links.map(([t,h])=><Link key={h} href={h} className="hover:text-champagne">{t}</Link>)}
        </nav>
        <button className="justify-self-start md:hidden" aria-label={open?'إغلاق القائمة':'فتح القائمة'} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
        <Link href="/" className="font-logo text-xl tracking-[.4em] md:text-2xl">KAFUR</Link>
        <div className="flex items-center gap-3 justify-self-end"><Link href="/cart" className="relative p-2" aria-label={count>0?`السلة، ${count} قطعة`:'السلة'}><ShoppingBag className="size-6" aria-hidden/>{count>0&&<span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-champagne px-1 text-[11px] leading-5 text-ivory">{count}</span>}</Link>{wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="btn-dark hidden !px-4 !py-2 text-sm sm:inline-flex">اطلب عبر واتساب</a>}</div>
      </div>
      {open&&<nav className="flex flex-col gap-4 border-t border-stone px-5 py-4 md:hidden" aria-label="القائمة">
        {links.map(([t,h])=><Link key={h} href={h} onClick={()=>setOpen(false)}>{t}</Link>)}
      </nav>}
    </header>
  );
}
