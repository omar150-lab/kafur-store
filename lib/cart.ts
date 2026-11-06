import {products} from './products';
import {SIZES} from './pricing';

export type CartItem={slug:string;ml:number;qty:number};
export const MAX_QTY=10;
export const MAX_LINES=20;

const validSlugs=new Set(products.map(p=>p.slug));
const validMl=new Set<number>(SIZES.map(s=>s.ml));

/** ينظّف أي بيانات قادمة من التخزين أو من الشبكة: يرفض المجهول، يدمج المكرر، ويحدّ الكميات. */
export function sanitizeCart(raw:unknown):CartItem[]{
  if(!Array.isArray(raw))return [];
  const out:CartItem[]=[];
  for(const r of raw){
    if(!r||typeof r!=='object')continue;
    const {slug,ml,qty}=r as Record<string,unknown>;
    if(typeof slug!=='string'||!validSlugs.has(slug))continue;
    if(typeof ml!=='number'||!validMl.has(ml))continue;
    const q=typeof qty==='number'&&Number.isFinite(qty)?Math.floor(qty):0;
    if(q<1)continue;
    const same=out.find(i=>i.slug===slug&&i.ml===ml);
    if(same)same.qty=Math.min(MAX_QTY,same.qty+q);
    else if(out.length<MAX_LINES)out.push({slug,ml,qty:Math.min(MAX_QTY,q)});
  }
  return out;
}

export const addToCart=(items:CartItem[],slug:string,ml:number,qty=1)=>sanitizeCart([...items,{slug,ml,qty}]);
export const removeFromCart=(items:CartItem[],slug:string,ml:number)=>items.filter(i=>!(i.slug===slug&&i.ml===ml));
export const setQty=(items:CartItem[],slug:string,ml:number,qty:number)=>
  qty<1?removeFromCart(items,slug,ml):sanitizeCart(items.map(i=>i.slug===slug&&i.ml===ml?{...i,qty}:i));
export const cartCount=(items:CartItem[])=>items.reduce((n,i)=>n+i.qty,0);
