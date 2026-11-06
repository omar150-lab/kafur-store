export type CartItem={slug:string;ml:number;qty:number};
export const MAX_QTY=10;
export const MAX_LINES=20;
const SLUG_RE=/^[a-z0-9][a-z0-9-]{0,79}$/;

/**
 * تنظيف بنيوي لأي بيانات قادمة من التخزين أو الشبكة (بدون معرفة الكتالوج):
 * يرفض الشكل الغلط، يدمج المكرر، ويحدّ الكميات. وجود المنتج وسعره يتحقق منهما priceCart/الخادم.
 */
export function sanitizeCart(raw:unknown):CartItem[]{
  if(!Array.isArray(raw))return [];
  const out:CartItem[]=[];
  for(const r of raw){
    if(!r||typeof r!=='object')continue;
    const {slug,ml,qty}=r as Record<string,unknown>;
    if(typeof slug!=='string'||!SLUG_RE.test(slug))continue;
    if(typeof ml!=='number'||!Number.isInteger(ml)||ml<1||ml>1000)continue;
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
