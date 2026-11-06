import {products} from './products';
import {SIZES} from './pricing';
import {GOVERNORATES,shippingFor} from './shipping';
import {egp} from './format';
import {sanitizeCart,type CartItem} from './cart';

export type Line={slug:string;name:string;house:string;color:string;ml:number;qty:number;unit:number;total:number};
export type Quote={lines:Line[];count:number;subtotal:number;shipping:number|null;total:number|null};
export type Customer={name:string;phone:string;address:string;notes:string};
export type FieldKey='name'|'phone'|'governorate'|'address'|'notes'|'items';
export type FieldErrors=Partial<Record<FieldKey,string>>;

const bySlug=new Map(products.map(p=>[p.slug,p]));

/** يسعّر السلة من بيانات المتجر فقط (لا يثق بأي سعر قادم من العميل). */
export function priceCart(items:CartItem[],governorate?:string):Quote{
  const lines:Line[]=[];
  for(const i of sanitizeCart(items)){
    const p=bySlug.get(i.slug),s=SIZES.find(x=>x.ml===i.ml);
    if(!p||!s)continue;
    lines.push({slug:p.slug,name:p.name,house:p.house,color:p.color,ml:i.ml,qty:i.qty,unit:s.price,total:s.price*i.qty});
  }
  const subtotal=lines.reduce((n,l)=>n+l.total,0);
  const shipping=governorate&&lines.length?shippingFor(governorate):null;
  return {lines,count:lines.reduce((n,l)=>n+l.qty,0),subtotal,shipping,total:shipping===null?null:subtotal+shipping};
}

const AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
/** رقم موبايل مصري: يقبل +20 و0020 والأرقام العربية والمسافات. */
export function normalizePhone(s:string):string{
  let d=s.replace(/[٠-٩]/g,c=>String(AR_DIGITS.indexOf(c))).replace(/\D/g,'');
  if(d.startsWith('0020'))d=d.slice(4);
  else if(d.startsWith('20')&&d.length===12)d=d.slice(2);
  if(d.length===10&&d.startsWith('1'))d='0'+d;
  return d;
}
const PHONE_RE=/^01[0125]\d{8}$/;
const clean=(v:unknown,multiline=false)=>(typeof v==='string'?v:'').replace(multiline?/[^\S\n]+/g:/\s+/g,' ').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,'').trim();

export function validateCustomer(input:unknown,governorate:unknown):{ok:true;customer:Customer;governorate:string}|{ok:false;errors:FieldErrors}{
  const c=(input&&typeof input==='object'?input:{}) as Record<string,unknown>;
  const name=clean(c.name),address=clean(c.address),notes=clean(c.notes,true),phone=normalizePhone(typeof c.phone==='string'?c.phone:'');
  const gov=typeof governorate==='string'?governorate:'';
  const errors:FieldErrors={};
  if(name.length<2||name.length>60)errors.name='اكتب اسمك (من حرفين لـ 60 حرف).';
  if(!PHONE_RE.test(phone))errors.phone='رقم الموبايل لازم يكون مصري صحيح، مثل 01012345678.';
  if(!GOVERNORATES.includes(gov))errors.governorate='اختار المحافظة.';
  if(address.length<10||address.length>250)errors.address='اكتب العنوان بالتفصيل (الشارع والمنطقة وعلامة مميزة).';
  if(notes.length>300)errors.notes='الملاحظات أطول من 300 حرف.';
  return Object.keys(errors).length?{ok:false,errors}:{ok:true,customer:{name,phone,address,notes},governorate:gov};
}

export function buildMessage(q:Quote,c:Customer,governorate:string,demo:boolean):string{
  const rows=q.lines.map((l,i)=>`${i+1}) ${l.name} - ${l.ml} مل × ${l.qty} = ${egp(l.total)}`);
  return [
    'طلب جديد من موقع كافور',
    '',
    `الاسم: ${c.name}`,
    `الموبايل: ${c.phone}`,
    `المحافظة: ${governorate}`,
    `العنوان: ${c.address}`,
    '',
    'الطلب:',
    ...rows,
    '',
    `المجموع: ${egp(q.subtotal)}`,
    `الشحن: ${q.shipping===null?'-':egp(q.shipping)}`,
    `الإجمالي: ${q.total===null?'-':egp(q.total)}`,
    ...(c.notes?['',`ملاحظات: ${c.notes}`]:[]),
    ...(demo?['','(نسخة تجريبية: الأسعار تحتاج تأكيد)']:[]),
  ].join('\n');
}

export type OrderResult={ok:true;quote:Quote;message:string;whatsappUrl:string}|{ok:false;errors:FieldErrors};

/** يتحقق من الطلب كله ويبني رابط واتساب. يستعمله /api/order على الخادم (والاختبارات). */
export function buildOrder(raw:unknown,opts:{whatsapp:string;demo:boolean}):OrderResult{
  const r=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const items=sanitizeCart(r.items);
  const v=validateCustomer(r.customer,r.governorate);
  const errors:FieldErrors=v.ok?{}:{...v.errors};
  if(!items.length)errors.items='السلة فاضية.';
  if(!v.ok||!items.length)return {ok:false,errors};
  const quote=priceCart(items,v.governorate);
  const message=buildMessage(quote,v.customer,v.governorate,opts.demo);
  return {ok:true,quote,message,whatsappUrl:`https://wa.me/${opts.whatsapp}?text=${encodeURIComponent(message)}`};
}
