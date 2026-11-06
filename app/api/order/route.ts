import {NextResponse} from 'next/server';
import {placeOrder} from '@/lib/place-order';
import {getCatalog} from '@/lib/data';
import {adminConfig} from '@/lib/supabase';
import {site} from '@/lib/config';

export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const fail=(status:number,message:string,errors={})=>NextResponse.json({ok:false,message,errors},{status,headers:noStore});

/** بصمة مجهولة للـ IP لتحديد الإزعاج (rate limit) في القاعدة بدون تخزين العنوان نفسه. */
async function ipHash(req:Request):Promise<string|null>{
  const ip=req.headers.get('cf-connecting-ip')??req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if(!ip)return null;
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`kafur:${ip}`));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,32);
}

export async function POST(req:Request){
  if(!site.whatsapp)return fail(503,'الطلب عبر واتساب غير متاح حاليًا.');
  if(Number(req.headers.get('content-length')??0)>20_000)return fail(413,'الطلب كبير جدًا.');
  let body:unknown;
  try{body=await req.json();}catch{return fail(400,'بيانات غير صالحة.');}
  const catalog=await getCatalog();
  const res=await placeOrder(body,{catalog,whatsapp:site.whatsapp,demo:site.demo,admin:adminConfig(),ipHash:await ipHash(req)});
  if(!res.ok)return fail(res.status,res.message,res.errors);
  return NextResponse.json({ok:true,orderNo:res.orderNo,saved:res.saved,quote:res.quote,whatsappUrl:res.whatsappUrl},{headers:noStore});
}
