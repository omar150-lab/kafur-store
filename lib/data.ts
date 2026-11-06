import {cache} from 'react';
import {products as seedProducts,type Product} from './products';
import {SHIPPING_TIERS,type Tier} from './shipping';
import {readConfig,sbRequest,type SbConfig} from './supabase';

export type Catalog={products:Product[];tiers:Tier[];source:'db'|'seed'};

const CONC=new Set(['edp','extrait','parfum']);
const str=(v:unknown)=>typeof v==='string'&&v.trim()?v.trim():'';
const keys=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&/^[a-z0-9]{1,12}$/.test(x)):[];
const rec=(v:unknown)=>(v&&typeof v==='object'?v:{}) as Record<string,unknown>;

/** يحوّل صفوف القاعدة إلى منتجات سليمة، ويتخطى أي صف ناقص أو تالف بدل أن يكسر الموقع. */
export function mapProducts(raw:unknown):Product[]{
  if(!Array.isArray(raw))return [];
  const out:Product[]=[];
  for(const item of raw){
    const r=rec(item);
    const slug=str(r.slug),name=str(r.name),house=str(r.house);
    if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)||!name||!house||!CONC.has(String(r.concentration)))continue;
    const prices:Product['prices']={};
    for(const s of Array.isArray(r.product_sizes)?r.product_sizes:[]){
      const x=rec(s),ml=Number(x.ml),price=Number(x.price);
      if(Number.isInteger(ml)&&ml>0&&Number.isInteger(price)&&price>0)prices[ml]=price;
    }
    if(!Object.keys(prices).length)continue;
    const n=rec(r.notes);
    out.push({
      slug,name,house,
      concentration:r.concentration as Product['concentration'],
      tagline:str(r.tagline),
      color:/^#[0-9a-fA-F]{6}$/.test(String(r.color))?String(r.color):'#888888',
      season:r.season==='winter'||r.season==='summer'?r.season:undefined,
      featured:r.featured===true,
      notes:{top:keys(n.top),heart:keys(n.heart),base:keys(n.base)},
      prices,
    });
  }
  return out;
}

export function mapTiers(raw:unknown):Tier[]{
  if(!Array.isArray(raw))return [];
  const groups=new Map<string,Tier>();
  for(const item of raw){
    const r=rec(item),gov=str(r.governorate),label=str(r.tier_label);
    const id=Number(r.tier_id),fee=Number(r.fee);
    if(!gov||!label||!Number.isInteger(id)||!Number.isInteger(fee)||fee<0)continue;
    const k=`${id}|${fee}|${label}`;
    const g=groups.get(k)??{id,label,fee,governorates:[]};
    g.governorates.push(gov);groups.set(k,g);
  }
  return [...groups.values()].sort((a,b)=>a.id-b.id||a.fee-b.fee);
}

const seedCatalog=():Catalog=>({products:seedProducts,tiers:SHIPPING_TIERS,source:'seed'});

export async function loadCatalog(cfg:SbConfig|null,fetchImpl?:typeof fetch):Promise<Catalog>{
  if(!cfg)return seedCatalog();
  try{
    const [rows,rates]=await Promise.all([
      sbRequest<unknown>(cfg,'products?select=slug,name,house,concentration,tagline,color,season,featured,notes,product_sizes(ml,price)&active=eq.true&order=sort_order.asc,name.asc',{fetchImpl}),
      sbRequest<unknown>(cfg,'shipping_rates?select=governorate,tier_id,tier_label,fee&order=tier_id.asc,governorate.asc',{fetchImpl}),
    ]);
    const products=mapProducts(rows),tiers=mapTiers(rates);
    if(!products.length||!tiers.length)throw new Error('قاعدة البيانات لا تحتوي منتجات أو أسعار شحن صالحة (هل شُغّل ملف setup.sql؟)');
    return {products,tiers,source:'db'};
  }catch(e){
    console.error('catalog: using bundled fallback data',e);
    return seedCatalog();
  }
}

// ذاكرة قصيرة داخل العملية: بيانات عامة، فتخفف الضغط على القاعدة، وتظهر تعديلات اللوحة خلال ثوانٍ.
const TTL_OK=30_000,TTL_FALLBACK=5_000;
let memo:{at:number;ttl:number;value:Catalog}|null=null;
async function memoized():Promise<Catalog>{
  if(memo&&Date.now()-memo.at<memo.ttl)return memo.value;
  const value=await loadCatalog(readConfig());
  memo={at:Date.now(),ttl:value.source==='db'?TTL_OK:TTL_FALLBACK,value};
  return value;
}
/** المصدر الوحيد للكتالوج في الصفحات وواجهات API (مع إزالة التكرار داخل الطلب الواحد). */
export const getCatalog=cache(memoized);
