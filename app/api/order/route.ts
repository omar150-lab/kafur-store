import {NextResponse} from 'next/server';
import {buildOrder} from '@/lib/order';
import {site} from '@/lib/config';

export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store'};
const fail=(status:number,message:string,errors={})=>NextResponse.json({ok:false,message,errors},{status,headers:noStore});

// المرحلة ٤: يتحقق من الطلب ويعيد حساب الأسعار والشحن على الخادم ثم يرجّع رابط واتساب.
// المرحلة ٥: هنا يُحفظ الطلب في Supabase قبل إرجاع الرابط.
export async function POST(req:Request){
  if(!site.whatsapp)return fail(503,'الطلب عبر واتساب غير متاح حاليًا.');
  const len=Number(req.headers.get('content-length')??0);
  if(len>20_000)return fail(413,'الطلب كبير جدًا.');
  let body:unknown;
  try{body=await req.json();}catch{return fail(400,'بيانات غير صالحة.');}
  const res=buildOrder(body,{whatsapp:site.whatsapp,demo:site.demo});
  if(!res.ok)return fail(400,'راجع البيانات المطلوبة.',res.errors);
  return NextResponse.json({ok:true,quote:res.quote,whatsappUrl:res.whatsappUrl},{headers:noStore});
}
