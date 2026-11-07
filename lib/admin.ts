import {SbError,type SbConfig} from './supabase';

export const COOKIE_AT='kf_at';   // access token (ساعة)
export const COOKIE_RT='kf_rt';   // refresh token
export const COOKIE_RF='kf_rf';   // علامة قصيرة تمنع حلقة إعادة التحويل عند فشل التجديد

export const ORDER_STATUSES=['new','confirmed','shipped','delivered','cancelled'] as const;
export type OrderStatus=(typeof ORDER_STATUSES)[number];
export const STATUS_LABEL:Record<OrderStatus,string>={new:'جديد',confirmed:'مؤكد',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي'};
export const isStatus=(v:unknown):v is OrderStatus=>typeof v==='string'&&(ORDER_STATUSES as readonly string[]).includes(v);
export const isUuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

/** وقت انتهاء التوكن (ثوانٍ) بدون التحقق من التوقيع: التحقق الحقيقي تفعله القاعدة عند كل طلب. */
export function jwtExp(token:string):number|null{
  const part=token.split('.')[1];
  if(!part)return null;
  try{
    const json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));
    const exp=(JSON.parse(json) as {exp?:unknown}).exp;
    return typeof exp==='number'?exp:null;
  }catch{return null;}
}

/** وجهة ما بعد التجديد: مسارات /admin الداخلية فقط (يمنع التحويل لمواقع خارجية). */
export function safeNext(next:string|null|undefined):string{
  if(!next||/[\\\r\n]/.test(next)||next.startsWith('//'))return '/admin';
  return /^\/admin(?:[/?].*)?$/.test(next)?next:'/admin';
}

/** حماية CSRF للطلبات المغيِّرة: لازم Origin موجود ويطابق موقعنا. */
export function sameOrigin(req:Request):boolean{
  const origin=req.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).origin===new URL(req.url).origin;}catch{return false;}
}

export type Tokens={access_token:string;refresh_token:string;expires_in:number};
export async function gotrueToken(cfg:SbConfig,grant:'password'|'refresh_token',body:Record<string,string>,fetchImpl?:typeof fetch):Promise<Tokens>{
  const res=await (fetchImpl??fetch)(`${cfg.url}/auth/v1/token?grant_type=${grant}`,{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const d=((await res.json().catch(()=>null))??{}) as Record<string,unknown>;
  if(!res.ok||typeof d.access_token!=='string'||typeof d.refresh_token!=='string')
    throw new SbError(res.status,String(d.error_code??d.error??''),String(d.msg??d.error_description??res.statusText));
  return {access_token:d.access_token,refresh_token:d.refresh_token,expires_in:typeof d.expires_in==='number'?d.expires_in:3600};
}

export type AdminOrder={id:string;orderNo:string;status:OrderStatus;name:string;phone:string;governorate:string;address:string;notes:string;subtotal:number;shipping:number;total:number;demo:boolean;createdAt:string;items:{name:string;ml:number;qty:number;unit:number;total:number}[]};
const rec=(v:unknown)=>(v&&typeof v==='object'?v:{}) as Record<string,unknown>;
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;
export function mapOrders(raw:unknown):AdminOrder[]{
  if(!Array.isArray(raw))return [];
  const out:AdminOrder[]=[];
  for(const x of raw){
    const r=rec(x);
    if(!isUuid(r.id)||!isStatus(r.status)||typeof r.order_no!=='string')continue;
    out.push({
      id:r.id as string,orderNo:r.order_no,status:r.status,
      name:String(r.customer_name??''),phone:String(r.phone??''),governorate:String(r.governorate??''),address:String(r.address??''),notes:String(r.notes??''),
      subtotal:n(r.subtotal),shipping:n(r.shipping),total:n(r.total),demo:r.demo===true,createdAt:String(r.created_at??''),
      items:(Array.isArray(r.order_items)?r.order_items:[]).map(i=>{const q=rec(i);return {name:String(q.product_name??''),ml:n(q.ml),qty:n(q.qty),unit:n(q.unit_price),total:n(q.line_total)};}),
    });
  }
  return out;
}
