import {describe,expect,it,vi} from 'vitest';
import {loadCatalog,mapProducts,mapTiers} from './data';
import {products as seed} from './products';
import {SbError,sbRequest} from './supabase';

const row=(o:Record<string,unknown>={})=>({slug:'a-b',name:'اسم',house:'دار',concentration:'edp',tagline:'',color:'#112233',season:'winter',featured:true,notes:{top:['ou'],heart:[],base:['mk']},product_sizes:[{ml:50,price:300},{ml:30,price:200}],...o});
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});

describe('mapProducts',()=>{
  it('يحوّل صفًا سليمًا',()=>{
    const [p]=mapProducts([row()]);
    expect(p).toMatchObject({slug:'a-b',season:'winter',featured:true,prices:{30:200,50:300},notes:{top:['ou'],heart:[],base:['mk']}});
  });
  it('يتخطى الصفوف التالفة ولا يكسر',()=>{
    expect(mapProducts([row({slug:'Bad Slug'}),row({concentration:'x'}),row({product_sizes:[]}),row({product_sizes:[{ml:50,price:-1}]}),null,'x',row({slug:'ok'})]).map(p=>p.slug)).toEqual(['ok']);
    expect(mapProducts(null)).toEqual([]);
  });
  it('قيم افتراضية آمنة للون والموسم والنوتات',()=>{
    const [p]=mapProducts([row({color:'red;x',season:'spring',notes:null})]);
    expect(p.color).toBe('#888888');expect(p.season).toBeUndefined();expect(p.notes).toEqual({top:[],heart:[],base:[]});
  });
});

describe('mapTiers',()=>{
  it('يجمّع المحافظات حسب الشريحة والسعر ويرتّب',()=>{
    const t=mapTiers([{governorate:'ب',tier_id:2,tier_label:'ثانية',fee:60},{governorate:'أ',tier_id:1,tier_label:'أولى',fee:40},{governorate:'ج',tier_id:2,tier_label:'ثانية',fee:60},{governorate:'x',tier_id:3,tier_label:'z',fee:-5}]);
    expect(t.map(x=>[x.id,x.fee,x.governorates])).toEqual([[1,40,['أ']],[2,60,['ب','ج']]]);
  });
});

describe('sbRequest',()=>{
  it('يرسل apikey فقط للمفاتيح الجديدة، ويضيف Authorization للـ JWT',async()=>{
    const f=vi.fn(async()=>json([]));
    await sbRequest({url:'https://x.supabase.co',key:'sb_publishable_abc'},'products',{fetchImpl:f as never});
    await sbRequest({url:'https://x.supabase.co',key:'eyJhbGciOi.x.y'},'products',{fetchImpl:f as never});
    const [a,b]=f.mock.calls.map(c=>(c as unknown as [string,RequestInit])[1].headers as Record<string,string>);
    expect(a.apikey).toBe('sb_publishable_abc');expect(a.Authorization).toBeUndefined();
    expect(b.Authorization).toBe('Bearer eyJhbGciOi.x.y');
  });
  it('يحوّل الأخطاء إلى SbError برسالة القاعدة',async()=>{
    const f=async()=>json({code:'P0001',message:'rate_limited'},400);
    await expect(sbRequest({url:'https://x',key:'k'},'rpc/x',{method:'POST',body:{},fetchImpl:f as never})).rejects.toMatchObject({status:400,message:'rate_limited'});
    expect(new SbError(500,'','x')).toBeInstanceOf(Error);
  });
});

describe('loadCatalog',()=>{
  const cfg={url:'https://x.supabase.co',key:'k'};
  const rates=[{governorate:'أسوان',tier_id:1,tier_label:'أسوان',fee:40}];
  it('بدون إعدادات: بيانات أولية',async()=>{expect((await loadCatalog(null)).source).toBe('seed');});
  it('من القاعدة',async()=>{
    const f=vi.fn(async(url:string)=>json(String(url).includes('shipping_rates')?rates:[row()]));
    const c=await loadCatalog(cfg,f as never);
    expect(c.source).toBe('db');expect(c.products).toHaveLength(1);expect(c.tiers[0].fee).toBe(40);
    expect(f.mock.calls.map(x=>String(x[0])).join(' ')).toContain('active=eq.true');
  });
  it('احتياطي عند فشل الشبكة أو الخطأ أو الرد الفاضي',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    for(const f of [async()=>{throw new Error('net');},async()=>json({message:'x'},500),async()=>json([])]){
      const c=await loadCatalog(cfg,f as never);
      expect(c.source).toBe('seed');expect(c.products).toBe(seed);
    }
  });
});
