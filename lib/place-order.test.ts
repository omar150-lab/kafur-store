import {describe,expect,it,vi} from 'vitest';
import {placeOrder,quoteFromRpc} from './place-order';
import {priceCart} from './order';
import {products} from './products';
import {SHIPPING_TIERS} from './shipping';

const catalog={products,tiers:SHIPPING_TIERS};
const body={items:[{slug:'sauvage',ml:50,qty:2}],governorate:'أسوان',customer:{name:'عمر',phone:'01012345678',address:'شارع النيل بجوار المسجد أسوان',notes:''}};
const base={catalog,whatsapp:'201279269784',demo:true};
const admin={url:'https://x.supabase.co',key:'sb_secret_x'};
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json'}});
const rpcOk={order_no:'KF-1042',number:1042,subtotal:700,shipping:40,total:740,lines:[{slug:'sauvage',name:'سوفاج',ml:50,qty:2,unit:350,total:700}]};
const msg=(url:string)=>decodeURIComponent(url.split('text=')[1]);

describe('placeOrder',()=>{
  it('بدون Supabase: يعمل بالتسعير المحلي ولا يحفظ',async()=>{
    const r=await placeOrder(body,{...base,admin:null});
    expect(r.ok).toBe(true);if(!r.ok)return;
    expect(r.saved).toBe(false);expect(r.orderNo).toBeNull();expect(r.quote.total).toBe(740);
    expect(msg(r.whatsappUrl)).not.toContain('KF-');
  });
  it('مع Supabase: يحفظ ويضع رقم الطلب في الرسالة، والإجمالي من القاعدة',async()=>{
    const f=vi.fn(async()=>json({...rpcOk,total:741}));
    const r=await placeOrder(body,{...base,admin,ipHash:'abc',fetchImpl:f as never});
    expect(r.ok).toBe(true);if(!r.ok)return;
    expect(r.saved).toBe(true);expect(r.orderNo).toBe('KF-1042');expect(r.quote.total).toBe(741);
    expect(msg(r.whatsappUrl)).toContain('(KF-1042)');expect(msg(r.whatsappUrl)).toContain('741');
    const [url,init]=f.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/create_order');
    const sent=JSON.parse(String(init.body));
    expect(sent).toMatchObject({p_name:'عمر',p_phone:'01012345678',p_governorate:'أسوان',p_demo:true,p_ip_hash:'abc'});
    expect(sent.p_items).toEqual([{slug:'sauvage',ml:50,qty:2}]); // لا أسعار تُرسل للقاعدة
  });
  it('فشل تقني في الحفظ: الطلب يكمل على واتساب بدون رقم',async()=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    for(const f of [async()=>{throw new Error('net');},async()=>json({message:'boom'},500),async()=>json({weird:true})]){
      const r=await placeOrder(body,{...base,admin,fetchImpl:f as never});
      expect(r.ok).toBe(true);if(r.ok){expect(r.saved).toBe(false);expect(r.orderNo).toBeNull();}
    }
  });
  it('rate_limited => 429، invalid_items => 409',async()=>{
    const a=await placeOrder(body,{...base,admin,fetchImpl:(async()=>json({code:'P0001',message:'rate_limited'},400)) as never});
    expect(a).toMatchObject({ok:false,status:429});
    const b=await placeOrder(body,{...base,admin,fetchImpl:(async()=>json({code:'P0001',message:'invalid_items'},400)) as never});
    expect(b).toMatchObject({ok:false,status:409});
  });
  it('تحقق من المدخلات قبل أي اتصال بالقاعدة',async()=>{
    const f=vi.fn();
    const r=await placeOrder({items:[],governorate:'',customer:{}},{...base,admin,fetchImpl:f as never});
    expect(r).toMatchObject({ok:false,status:400});
    if(!r.ok)expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['items','name','phone','governorate','address']));
    expect(f).not.toHaveBeenCalled();
  });
  it('منتج غير موجود في الكتالوج => 409 بدون اتصال بالقاعدة',async()=>{
    const f=vi.fn();
    const r=await placeOrder({...body,items:[{slug:'ghost',ml:50,qty:1}]},{...base,admin,fetchImpl:f as never});
    expect(r).toMatchObject({ok:false,status:409});expect(f).not.toHaveBeenCalled();
  });
  it('مدخلات غريبة لا تكسر',async()=>{for(const x of [null,undefined,1,'a',[],{items:'x'}])expect((await placeOrder(x,{...base,admin:null})).ok).toBe(false);});
});

describe('quoteFromRpc',()=>{
  const local=priceCart([{slug:'sauvage',ml:50,qty:2}],catalog,'أسوان');
  it('يقرأ الرد ويحتفظ بالدار واللون من الكتالوج',()=>{
    const {quote,orderNo}=quoteFromRpc(rpcOk,local);
    expect(orderNo).toBe('KF-1042');expect(quote.lines[0]).toMatchObject({house:'ديور',unit:350,total:700});expect(quote.count).toBe(2);
  });
  it('يرفض ردًا غير متوقع',()=>{
    for(const x of [null,{},{...rpcOk,order_no:'x'},{...rpcOk,lines:[{slug:'a'}]},{...rpcOk,total:'1'}])expect(()=>quoteFromRpc(x,local)).toThrow();
  });
});
