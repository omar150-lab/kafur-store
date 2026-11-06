import type {Product} from './products';
import {governoratesOf,shippingFor,type Tier} from './shipping';
import {egp} from './format';
import {sanitizeCart,type CartItem} from './cart';

/** أقل بيانات يحتاجها التسعير: تُمرَّر للمتصفح في صفحة السلة بدل الكتالوج كله. */
export type PricedProduct=Pick<Product,'slug'|'name'|'house'|'color'|'prices'>;
export type CatalogLite={products:PricedProduct[];tiers:Tier[]};

export type Line={slug:string;name:string;house:string;color:string;ml:number;qty:number;unit:number;total:number};
export type Quote={lines:Line[];count:number;subtotal:number;shipping:number|null;total:number|null};
export type Customer={name:string;phone:string;address:string;notes:string};
export type FieldKey='name'|'phone'|'governorate'|'address'|'notes'|'items';
export type FieldErrors=Partial<Record<FieldKey,string>>;

/** يسعّر السلة من الكتالوج فقط (لا يثق بأي سعر قادم من العميل) ويتخطى المنتجات غير المتاحة. */
export function priceCart(items:CartItem[],catalog:CatalogLite,governorate?:string):Quote{
  const bySlug=new Map(catalog.products.map(p=>[p.slug,p]));
  const lines:Line[]=[];
  for(const i of sanitizeCart(items)){
    const p=bySlug.get(i.slug),unit=p?.prices[i.ml];
    if(!p||!unit)continue;
    lines.push({slug:p.slug,name:p.name,house:p.house,color:p.color,ml:i.ml,qty:i.qty,unit,total:unit*i.qty});
  }
  const subtotal=lines.reduce((n,l)=>n+l.total,0);
  const shipping=governorate&&lines.length?shippingFor(governorate,catalog.tiers):null;
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

export function validateCustomer(input:unknown,governorate:unknown,governorates:string[]=governoratesOf()):{ok:true;customer:Customer;governorate:string}|{ok:false;errors:FieldErrors}{
  const c=(input&&typeof input==='object'?input:{}) as Record<string,unknown>;
  const name=clean(c.name),address=clean(c.address),notes=clean(c.notes,true),phone=normalizePhone(typeof c.phone==='string'?c.phone:'');
  const gov=typeof governorate==='string'?governorate:'';
  const errors:FieldErrors={};
  if(name.length<2||name.length>60)errors.name='اكتب اسمك (من حرفين لـ 60 حرف).';
  if(!PHONE_RE.test(phone))errors.phone='رقم الموبايل لازم يكون مصري صحيح، مثل 01012345678.';
  if(!governorates.includes(gov))errors.governorate='اختار المحافظة.';
  if(address.length<10||address.length>250)errors.address='اكتب العنوان بالتفصيل (الشارع والمنطقة وعلامة مميزة).';
  if(notes.length>300)errors.notes='الملاحظات أطول من 300 حرف.';
  return Object.keys(errors).length?{ok:false,errors}:{ok:true,customer:{name,phone,address,notes},governorate:gov};
}

export function buildMessage(q:Quote,c:Customer,governorate:string,demo:boolean,orderNo?:string|null):string{
  const rows=q.lines.map((l,i)=>`${i+1}) ${l.name} - ${l.ml} مل × ${l.qty} = ${egp(l.total)}`);
  return [
    orderNo?`طلب جديد من موقع كافور (${orderNo})`:'طلب جديد من موقع كافور',
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
