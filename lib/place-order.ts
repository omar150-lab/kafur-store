import {sanitizeCart} from './cart';
import {buildMessage,priceCart,validateCustomer,type CatalogLite,type FieldErrors,type Line,type Quote} from './order';
import {governoratesOf} from './shipping';
import {SbError,sbRequest,type SbConfig} from './supabase';

export type PlaceDeps={catalog:CatalogLite;whatsapp:string;demo:boolean;admin:SbConfig|null;ipHash?:string|null;fetchImpl?:typeof fetch};
export type PlaceResult=
  |{ok:true;quote:Quote;orderNo:string|null;saved:boolean;whatsappUrl:string}
  |{ok:false;status:number;message:string;errors:FieldErrors};

const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null;

/** يقرأ نتيجة create_order من القاعدة (هي المرجع النهائي للأسعار) ويرجّعها بشكل Quote. */
export function quoteFromRpc(raw:unknown,local:Quote):{quote:Quote;orderNo:string}{
  const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const orderNo=typeof r.order_no==='string'&&/^KF-\d+$/.test(r.order_no)?r.order_no:null;
  const subtotal=num(r.subtotal),shipping=num(r.shipping),total=num(r.total);
  if(!orderNo||subtotal===null||shipping===null||total===null||!Array.isArray(r.lines))throw new Error('unexpected create_order response');
  const meta=new Map(local.lines.map(l=>[l.slug,l]));
  const lines:Line[]=r.lines.map(x=>{
    const l=(x&&typeof x==='object'?x:{}) as Record<string,unknown>;
    const slug=String(l.slug),ml=num(l.ml),qty=num(l.qty),unit=num(l.unit),t=num(l.total);
    if(ml===null||qty===null||unit===null||t===null)throw new Error('unexpected line in create_order response');
    const m=meta.get(slug);
    return {slug,name:String(l.name??m?.name??slug),house:m?.house??'',color:m?.color??'#888888',ml,qty,unit,total:t};
  });
  return {orderNo,quote:{lines,count:lines.reduce((n,l)=>n+l.qty,0),subtotal,shipping,total}};
}

/**
 * يتحقق من الطلب، يحفظه في Supabase (إن كان مضبوطًا) ويبني رسالة واتساب.
 * تعذّر الحفظ لسبب تقني لا يمنع الزبون من إرسال طلبه على واتساب (يُسجَّل الخطأ ويُرجَع saved:false).
 */
export async function placeOrder(raw:unknown,deps:PlaceDeps):Promise<PlaceResult>{
  const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const items=sanitizeCart(r.items);
  const v=validateCustomer(r.customer,r.governorate,governoratesOf(deps.catalog.tiers));
  const errors:FieldErrors=v.ok?{}:{...v.errors};
  if(!items.length)errors.items='السلة فاضية.';
  if(!v.ok||!items.length)return {ok:false,status:400,message:'راجع البيانات المطلوبة.',errors};

  const local=priceCart(items,deps.catalog,v.governorate);
  if(!local.lines.length||local.lines.length<items.length)
    return {ok:false,status:409,message:'في منتج في السلة لم يعد متاحًا بهذا الحجم. راجع السلة وحاول تاني.',errors:{items:'راجع السلة.'}};

  let quote=local,orderNo:string|null=null,saved=false;
  if(deps.admin){
    try{
      const res=await sbRequest<unknown>(deps.admin,'rpc/create_order',{method:'POST',timeoutMs:8000,fetchImpl:deps.fetchImpl,body:{
        p_name:v.customer.name,p_phone:v.customer.phone,p_governorate:v.governorate,p_address:v.customer.address,p_notes:v.customer.notes,
        p_items:items,p_demo:deps.demo,p_ip_hash:deps.ipHash??null,
      }});
      ({quote,orderNo}=quoteFromRpc(res,local));saved=true;
    }catch(e){
      if(e instanceof SbError&&e.message==='rate_limited')
        return {ok:false,status:429,message:'طلبات كتيرة في وقت قصير. جرّب بعد شوية أو كلمنا مباشرة على واتساب.',errors:{}};
      if(e instanceof SbError&&(e.message==='invalid_items'||e.message==='invalid_governorate'))
        return {ok:false,status:409,message:'في منتج في السلة لم يعد متاحًا. راجع السلة وحاول تاني.',errors:{items:'راجع السلة.'}};
      console.error('order was NOT saved to Supabase',e);
    }
  }
  const message=buildMessage(quote,v.customer,v.governorate,deps.demo,orderNo);
  return {ok:true,quote,orderNo,saved,whatsappUrl:`https://wa.me/${deps.whatsapp}?text=${encodeURIComponent(message)}`};
}
