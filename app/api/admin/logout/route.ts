import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE_AT,sameOrigin} from '@/lib/admin';
import {clearSession} from '@/lib/admin-cookies';
import {readConfig} from '@/lib/supabase';

export const dynamic='force-dynamic';
export async function POST(req:Request){
  if(!sameOrigin(req))return NextResponse.json({ok:false},{status:403});
  const cfg=readConfig(),at=(await cookies()).get(COOKIE_AT)?.value;
  if(cfg&&at){try{await fetch(`${cfg.url}/auth/v1/logout`,{method:'POST',headers:{apikey:cfg.key,Authorization:`Bearer ${at}`}});}catch{}} // best-effort
  return clearSession(NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}}));
}
