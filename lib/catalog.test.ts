import {describe,expect,it} from 'vitest';
import {products} from './products';
import {DEFAULT_FILTERS,filterProducts,getProduct,matchesQuery,normalize,parseFilters,relatedProducts,serializeFilters,sortProducts} from './catalog';

const f=(patch:Partial<typeof DEFAULT_FILTERS>)=>({...DEFAULT_FILTERS,...patch});
const slugs=(l:typeof products)=>l.map(p=>p.slug);

describe('normalize',()=>{
  it('يوحّد الهمزات والتاء المربوطة والياء والتشكيل والأرقام',()=>{
    expect(normalize('  أَنجلز  ')).toBe('انجلز');
    expect(normalize('خمرة')).toBe('خمره');
    expect(normalize('٥٤٠')).toBe('540');
    expect(normalize('SAUVAGE')).toBe('sauvage');
  });
});

describe('search',()=>{
  it('يفرغ البحث = كل المنتجات',()=>{expect(filterProducts(products,f({}))).toHaveLength(products.length);});
  it('يلاقي بالاسم العربي حتى بدون همزة',()=>{expect(slugs(filterProducts(products,f({q:'انجلز'})))).toEqual(['angels-share']);});
  it('يلاقي بالاسم اللاتيني عبر الـ slug',()=>{expect(slugs(filterProducts(products,f({q:'sauvage'}))).sort()).toEqual(['sauvage','sauvage-elixir']);});
  it('يلاقي بالرقم العربي',()=>{expect(slugs(filterProducts(products,f({q:'٥٤٠'})))).toEqual(['baccarat-rouge-540']);});
  it('يلاقي بالنوتة',()=>{const r=filterProducts(products,f({q:'زعفران'}));expect(r.length).toBeGreaterThan(0);expect(r.every(p=>[...p.notes.top,...p.notes.heart,...p.notes.base].includes('sf'))).toBe(true);});
  it('كل الكلمات لازم تتطابق',()=>{expect(matchesQuery(products[0],'توباكو ديور')).toBe(false);});
});

describe('filters',()=>{
  it('الموسم',()=>{const r=filterProducts(products,f({season:'summer'}));expect(r.length).toBeGreaterThan(0);expect(r.every(p=>p.season==='summer')).toBe(true);});
  it('التركيز',()=>{expect(filterProducts(products,f({conc:'parfum'})).every(p=>p.concentration==='parfum')).toBe(true);});
  it('الدار + الموسم معًا (AND)',()=>{expect(slugs(filterProducts(products,f({house:'ديور',season:'winter'}))).sort()).toEqual(['dior-homme-intense','sauvage-elixir']);});
  it('النوتة',()=>{expect(filterProducts(products,f({note:'ou'})).every(p=>[...p.notes.top,...p.notes.heart,...p.notes.base].includes('ou'))).toBe(true);});
});

describe('sort',()=>{
  it('الافتراضي: المميز أولًا',()=>{const r=sortProducts(products,'featured');const lastFeatured=r.map(p=>!!p.featured).lastIndexOf(true);expect(r.slice(0,lastFeatured+1).every(p=>p.featured)).toBe(true);});
  it('بالاسم',()=>{const r=sortProducts(products,'name').map(p=>p.name);expect(r).toEqual([...r].sort((a,b)=>a.localeCompare(b,'ar')));});
  it('لا يعدّل المصفوفة الأصلية',()=>{const before=slugs(products);sortProducts(products,'name');expect(slugs(products)).toEqual(before);});
});

describe('related',()=>{
  it('لا يتضمن العطر نفسه ويبدأ بنفس الدار',()=>{
    const p=getProduct(products,'sauvage')!;
    const r=relatedProducts(products,p);
    expect(r.length).toBeGreaterThan(0);expect(r.length).toBeLessThanOrEqual(4);
    expect(r.some(x=>x.slug===p.slug)).toBe(false);
    expect(r[0].house).toBe(p.house);
  });
});

describe('url state',()=>{
  it('ذهابًا وإيابًا',()=>{
    const s=serializeFilters(f({q:'عود',season:'winter',sort:'name'}));
    expect(parseFilters(Object.fromEntries(new URLSearchParams(s)))).toEqual(f({q:'عود',season:'winter',sort:'name'}));
  });
  it('يتجاهل القيم الغريبة',()=>{
    expect(parseFilters({season:'x',conc:'zzz',sort:'price'})).toEqual(DEFAULT_FILTERS);
  });
  it('الافتراضي = رابط فاضي',()=>{expect(serializeFilters(DEFAULT_FILTERS)).toBe('');});
});
