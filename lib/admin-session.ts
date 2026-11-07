import {jwtExp} from './admin';
import {SbError,sbRequest,type SbConfig} from './supabase';

export type AdminState=
  |{status:'ok';token:string;email:string;role:string}
  |{status:'login'}|{status:'refresh'}|{status:'forbidden'}|{status:'unconfigured'};

/**
 * يحدّد حالة الزائر من الكوكيز: مدير سليم، أو يحتاج تجديد الجلسة، أو دخول، أو حساب ليس مديرًا.
 * الفحص الفعلي للصلاحية يتم في القاعدة: نقرأ صف المدير بتوكن المستخدم نفسه فتطبّق RLS.
 */
export async function resolveAdmin(at:string|undefined,rt:string|undefined,cfg:SbConfig|null,fetchImpl?:typeof fetch,now=Date.now()):Promise<AdminState>{
  if(!cfg)return {status:'unconfigured'};
  const retry:AdminState=rt?{status:'refresh'}:{status:'login'};
  if(!at)return retry;
  const exp=jwtExp(at);
  if(exp===null||exp*1000<=now+30_000)return retry;
  try{
    const rows=await sbRequest<unknown>(cfg,'admins?select=email,role&limit=1',{bearer:at,fetchImpl});
    const r=(Array.isArray(rows)?rows[0]:undefined) as {email?:unknown;role?:unknown}|undefined;
    if(!r)return {status:'forbidden'};
    return {status:'ok',token:at,email:String(r.email??''),role:String(r.role??'admin')};
  }catch(e){
    if(e instanceof SbError&&e.status===401)return retry;
    throw e;
  }
}
