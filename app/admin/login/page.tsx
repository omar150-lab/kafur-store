import {redirect} from 'next/navigation';
import AdminLogin from '@/components/AdminLogin';
import {cookies} from 'next/headers';
import {COOKIE_AT} from '@/lib/admin';
import {resolveAdmin} from '@/lib/admin-session';
import {readConfig} from '@/lib/supabase';

export const dynamic='force-dynamic';
const NOTICE:Record<string,string>={
  forbidden:'الحساب ده مش مسجّل كمدير.',
  config:'لوحة التحكم غير مفعّلة بعد (مفاتيح Supabase غير مضبوطة).',
  down:'تعذر الاتصال بالخادم. جرّب بعد شوية.',
};
export default async function LoginPage({searchParams}:{searchParams:Promise<{e?:string}>}){
  const {e}=await searchParams;
  if(!e){ // لو داخل بالفعل نوديه للوحة
    const jar=await cookies();
    let signedIn=false;
    try{signedIn=(await resolveAdmin(jar.get(COOKIE_AT)?.value,undefined,readConfig())).status==='ok';}catch{}
    if(signedIn)redirect('/admin');
  }
  return <main className="grid min-h-screen place-items-center px-5"><AdminLogin notice={e?NOTICE[e]:undefined}/></main>;
}
