import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {COOKIE_AT,COOKIE_RF,COOKIE_RT} from './admin';
import {resolveAdmin} from './admin-session';
import {readConfig} from './supabase';

/** يُستدعى أول كل صفحة إدارة. إمّا يرجّع المدير أو يحوّل (redirect). */
export async function requireAdmin(path:string){
  const jar=await cookies();
  let st;
  try{st=await resolveAdmin(jar.get(COOKIE_AT)?.value,jar.get(COOKIE_RT)?.value,readConfig());}
  catch(e){console.error('admin: session check failed',e);redirect('/admin/login?e=down');}
  if(st.status==='ok')return st;
  if(st.status==='refresh'&&!jar.get(COOKIE_RF))redirect(`/api/admin/refresh?next=${encodeURIComponent(path)}`);
  if(st.status==='forbidden')redirect('/admin/login?e=forbidden');
  if(st.status==='unconfigured')redirect('/admin/login?e=config');
  redirect('/admin/login');
}
