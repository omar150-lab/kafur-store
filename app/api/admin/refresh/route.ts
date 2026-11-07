import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE_RT,gotrueToken,safeNext} from '@/lib/admin';
import {clearSession,setSession} from '@/lib/admin-cookies';
import {readConfig} from '@/lib/supabase';

export const dynamic='force-dynamic';
// تجديد الجلسة: الصفحات (Server Components) لا تستطيع كتابة كوكيز، فتحوّل هنا ثم نرجع للصفحة.
export async function GET(req:Request){
  const url=new URL(req.url);
  const next=safeNext(url.searchParams.get('next'));
  const rt=(await cookies()).get(COOKIE_RT)?.value,cfg=readConfig();
  const toLogin=()=>clearSession(NextResponse.redirect(new URL('/admin/login',url)));
  if(!rt||!cfg)return toLogin();
  try{
    const t=await gotrueToken(cfg,'refresh_token',{refresh_token:rt});
    return setSession(NextResponse.redirect(new URL(next,url)),t,{refreshed:true});
  }catch{return toLogin();}
}
