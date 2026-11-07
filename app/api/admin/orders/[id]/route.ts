import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {COOKIE_AT,isStatus,isUuid,sameOrigin} from '@/lib/admin';
import {SbError,readConfig,sbRequest} from '@/lib/supabase';

export const dynamic='force-dynamic';
const out=(status:number,body:Record<string,unknown>)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});

// تغيير حالة طلب. الحماية الحقيقية في القاعدة: التوكن توكن المدير نفسه، وسياسات RLS تسمح بتعديل عمود الحالة فقط.
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  if(!sameOrigin(req))return out(403,{ok:false,message:'طلب غير مسموح.'});
  const {id}=await params;
  if(!isUuid(id))return out(400,{ok:false,message:'رقم طلب غير صالح.'});
  let b:{status?:unknown};
  try{b=await req.json();}catch{return out(400,{ok:false,message:'بيانات غير صالحة.'});}
  if(!isStatus(b.status))return out(400,{ok:false,message:'حالة غير معروفة.'});
  const cfg=readConfig(),at=(await cookies()).get(COOKIE_AT)?.value;
  if(!cfg||!at)return out(401,{ok:false,message:'سجّل الدخول من جديد.'});
  try{
    const rows=await sbRequest<unknown[]>(cfg,`orders?id=eq.${id}&select=id,status`,{method:'PATCH',body:{status:b.status},bearer:at,prefer:'return=representation'});
    if(!Array.isArray(rows)||rows.length===0)return out(404,{ok:false,message:'الطلب غير موجود أو لا تملك صلاحية تعديله.'});
    return out(200,{ok:true,status:b.status});
  }catch(e){
    if(e instanceof SbError&&e.status===401)return out(401,{ok:false,message:'انتهت الجلسة. سجّل الدخول من جديد.'});
    console.error('admin: status update failed',e);
    return out(502,{ok:false,message:'تعذر حفظ التغيير. جرّب تاني.'});
  }
}
