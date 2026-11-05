import {NOTES,CONCENTRATION,type Product} from './products';

export const SEASON_LABEL={winter:'شتوي',summer:'صيفي'} as const;
export type Season=keyof typeof SEASON_LABEL;
export type Concentration=Product['concentration'];
export type SortKey='featured'|'name'|'house';
export const SORT_OPTIONS:{key:SortKey;label:string}[]=[
  {key:'featured',label:'الافتراضي'},
  {key:'name',label:'الاسم (أ → ي)'},
  {key:'house',label:'الدار (أ → ي)'},
];
// ملاحظة: لا يوجد ترتيب بالسعر حاليًا لأن السعر يتبع الحجم وليس العطر. يُضاف عند وجود أسعار لكل عطر (المرحلة ٥).

export type Filters={q:string;season?:Season;conc?:Concentration;house?:string;note?:string;sort:SortKey};
export const DEFAULT_FILTERS:Filters={q:'',sort:'featured'};

export const noteName=(k:string):string|null=>NOTES[k]??null;
export const allNoteKeys=(p:Product)=>[...new Set([...p.notes.top,...p.notes.heart,...p.notes.base])];

/** توحيد النص العربي للبحث: يشيل التشكيل والتطويل، يوحّد الألف والياء والتاء المربوطة والأرقام. */
export function normalize(s:string):string{
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g,'')
    .replace(/[أإآٱ]/g,'ا')
    .replace(/ى/g,'ي').replace(/ئ/g,'ي').replace(/ؤ/g,'و').replace(/ة/g,'ه')
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g,' ')
    .trim();
}

/** النص القابل للبحث: الاسم، الدار، الوصف، النوتات، التركيز، الموسم، والمعرّف اللاتيني (slug). */
export function haystack(p:Product):string{
  const parts=[p.name,p.house,p.tagline,CONCENTRATION[p.concentration],p.season?SEASON_LABEL[p.season]:'',p.slug.replace(/-/g,' ')];
  for(const k of allNoteKeys(p)){const n=noteName(k);if(n)parts.push(n);}
  return normalize(parts.join(' '));
}

export function matchesQuery(p:Product,q:string):boolean{
  const tokens=normalize(q).split(' ').filter(Boolean);
  if(!tokens.length)return true;
  const h=haystack(p);
  return tokens.every(t=>h.includes(t));
}

export function filterProducts(products:Product[],f:Filters):Product[]{
  return products.filter(p=>
    matchesQuery(p,f.q)&&
    (!f.season||p.season===f.season)&&
    (!f.conc||p.concentration===f.conc)&&
    (!f.house||p.house===f.house)&&
    (!f.note||allNoteKeys(p).includes(f.note))
  );
}

const ar=(a:string,b:string)=>a.localeCompare(b,'ar');
export function sortProducts(list:Product[],sort:SortKey):Product[]{
  const out=[...list];
  if(sort==='name')return out.sort((a,b)=>ar(a.name,b.name));
  if(sort==='house')return out.sort((a,b)=>ar(a.house,b.house)||ar(a.name,b.name));
  return out.sort((a,b)=>Number(!!b.featured)-Number(!!a.featured)); // ترتيب مستقر: المميز أولًا ثم الترتيب الأصلي
}

export const houses=(products:Product[])=>[...new Set(products.map(p=>p.house))].sort(ar);

export function noteOptions(products:Product[]):{key:string;name:string}[]{
  const keys=new Set(products.flatMap(allNoteKeys));
  return [...keys].flatMap(key=>{const name=noteName(key);return name?[{key,name}]:[];}).sort((a,b)=>ar(a.name,b.name));
}

export const getProduct=(products:Product[],slug:string)=>products.find(p=>p.slug===slug);

/** عطور قريبة: نفس الدار أولًا، ثم نفس الموسم، ثم عدد النوتات المشتركة. */
export function relatedProducts(products:Product[],p:Product,limit=4):Product[]{
  const mine=new Set(allNoteKeys(p));
  return products
    .filter(o=>o.slug!==p.slug)
    .map(o=>({o,score:(o.house===p.house?3:0)+(p.season&&o.season===p.season?1:0)+allNoteKeys(o).filter(k=>mine.has(k)).length}))
    .filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.o);
}

/* ---------- حالة الفلاتر في الرابط ---------- */
type Raw=Record<string,string|string[]|undefined>;
const first=(v:string|string[]|undefined)=>Array.isArray(v)?v[0]:v;

export function parseFilters(raw:Raw):Filters{
  const season=first(raw.season),conc=first(raw.conc),sort=first(raw.sort);
  return {
    q:(first(raw.q)??'').slice(0,80),
    season:season==='winter'||season==='summer'?season:undefined,
    conc:conc&&conc in CONCENTRATION?(conc as Concentration):undefined,
    house:first(raw.house)||undefined,
    note:first(raw.note)||undefined,
    sort:SORT_OPTIONS.some(o=>o.key===sort)?(sort as SortKey):'featured',
  };
}

export function serializeFilters(f:Filters):string{
  const sp=new URLSearchParams();
  if(f.q.trim())sp.set('q',f.q.trim());
  if(f.season)sp.set('season',f.season);
  if(f.conc)sp.set('conc',f.conc);
  if(f.house)sp.set('house',f.house);
  if(f.note)sp.set('note',f.note);
  if(f.sort!=='featured')sp.set('sort',f.sort);
  return sp.toString();
}

export const activeFilterCount=(f:Filters)=>[f.season,f.conc,f.house,f.note].filter(Boolean).length+(f.q.trim()?1:0);
