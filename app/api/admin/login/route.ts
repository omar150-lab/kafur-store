import {NextResponse} from 'next/server';
import {gotrueToken,sameOrigin} from '@/lib/admin';
import {resolveAdmin} from '@/lib/admin-session';
import {setSession} from '@/lib/admin-cookies';
import {SbError,readConfig} from '@/lib/supabase';

export const dynamic='force-dynamic';
const out=(status:number,message:string)=>NextResponse.json({ok:false,message},{status,headers:{'Cache-Control':'no-store'}});

export async function POST(req:Request){
  if(!sameOrigin(req))return out(403,'طلب غير مسموح.');
  const cfg=readConfig();
  if(!cfg)return out(503,'لوحة التحكم غير مفعّلة بعد.');
  let b:{email?:unknown;password?:unknown};
  try{b=await req.json();}catch{return out(400,'بيانات غير صالحة.');}
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const password=typeof b.password==='string'?b.password:'';
  if(!email.includes('@')||email.length>254||!password||password.length>200)return out(400,'اكتب الإيميل وكلمة السر.');
  try{
    const t=await gotrueToken(cfg,'password',{email,password});
    // لا نعطي جلسة لحساب غير مسجّل كمدير.
    const st=await resolveAdmin(t.access_token,undefined,cfg);
    if(st.status!=='ok')return out(403,'الحساب ده مش مسجّل كمدير.');
    return setSession(NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}}),t);
  }catch(e){
    if(e instanceof SbError&&e.status===429)return out(429,'محاولات كتيرة. استنى شوية وحاول تاني.');
    if(e instanceof SbError&&(e.status===400||e.status===401||e.status===422))return out(401,'الإيميل أو كلمة السر غير صحيحة.');
    console.error('admin login failed',e);
    return out(502,'تعذر الاتصال بالخادم. جرّب بعد شوية.');
  }
}
