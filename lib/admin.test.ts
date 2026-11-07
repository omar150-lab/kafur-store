import {describe,expect,it,vi} from 'vitest';
import {gotrueToken,isStatus,isUuid,jwtExp,mapOrders,safeNext,sameOrigin} from './admin';
import {resolveAdmin} from './admin-session';
import {sbRequest} from './supabase';

const b64=(o:unknown)=>Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt=(exp:number)=>`${b64({alg:'HS256'})}.${b64({exp,sub:'u'})}.sig`;
const json=(b:unknown,status=200)=>new Response(JSON.stringify(b),{status,headers:{'Content-Type':'application/json'}});
const cfg={url:'https://x.supabase.co',key:'sb_publishable_k'};
const now=1_800_000_000_000;
const future=jwt(now/1000+3600),expired=jwt(now/1000-10),soon=jwt(now/1000+10);

describe('helpers',()=>{
  it('jwtExp',()=>{expect(jwtExp(future)).toBe(now/1000+3600);expect(jwtExp('x')).toBeNull();expect(jwtExp('a.b.c')).toBeNull();});
  it('safeNext يسمح بمسارات /admin فقط',()=>{
    expect(safeNext('/admin?status=new')).toBe('/admin?status=new');
    expect(safeNext('/admin/orders')).toBe('/admin/orders');
    for(const bad of ['https://evil.com','//evil.com','/administrator','/shop','/admin\\evil','/admin\r\nx',null,undefined,''])expect(safeNext(bad as never)).toBe('/admin');
  });
  it('sameOrigin',()=>{
    const r=(h:Record<string,string>)=>new Request('https://kafur.dev/api/admin/login',{method:'POST',headers:h});
    expect(sameOrigin(r({origin:'https://kafur.dev'}))).toBe(true);
    expect(sameOrigin(r({origin:'https://evil.com'}))).toBe(false);
    expect(sameOrigin(r({}))).toBe(false);
    expect(sameOrigin(r({origin:'null'}))).toBe(false);
  });
  it('isStatus / isUuid',()=>{
    expect(isStatus('new')).toBe(true);expect(isStatus('hacked')).toBe(false);expect(isStatus(1)).toBe(false);
    expect(isUuid('11111111-1111-1111-1111-111111111111')).toBe(true);expect(isUuid('1 or 1=1')).toBe(false);expect(isUuid("x'; drop")).toBe(false);
  });
});

describe('mapOrders',()=>{
  const row={id:'11111111-1111-1111-1111-111111111111',order_no:'KF-1001',status:'new',customer_name:'عمر',phone:'01012345678',governorate:'أسوان',address:'شارع النيل',notes:'',subtotal:350,shipping:40,total:390,demo:true,created_at:'2026-11-07T14:50:08Z',order_items:[{product_name:'سوفاج',ml:50,qty:1,unit_price:350,line_total:350}]};
  it('يحوّل صفًا سليمًا',()=>{const [o]=mapOrders([row]);expect(o).toMatchObject({orderNo:'KF-1001',status:'new',total:390,demo:true,items:[{name:'سوفاج',ml:50,qty:1,total:350}]});});
  it('يتخطى التالف',()=>{expect(mapOrders([{...row,id:'x'},{...row,status:'zzz'},null,{...row,order_no:5},row])).toHaveLength(1);expect(mapOrders(null)).toEqual([]);});
});

describe('gotrueToken',()=>{
  it('ينجح ويرجّع التوكنات',async()=>{
    const f=vi.fn(async()=>json({access_token:'a',refresh_token:'r',expires_in:3600}));
    expect(await gotrueToken(cfg,'password',{email:'e',password:'p'},f as never)).toEqual({access_token:'a',refresh_token:'r',expires_in:3600});
    const [url,init]=f.mock.calls[0] as unknown as [string,RequestInit];
    expect(url).toBe('https://x.supabase.co/auth/v1/token?grant_type=password');
    expect((init.headers as Record<string,string>).apikey).toBe('sb_publishable_k');
  });
  it('يرمي خطأ عند بيانات غلط',async()=>{await expect(gotrueToken(cfg,'password',{},(async()=>json({error_code:'invalid_credentials',msg:'bad'},400)) as never)).rejects.toMatchObject({status:400});});
  it('يرمي خطأ لو الرد ناقص',async()=>{await expect(gotrueToken(cfg,'refresh_token',{},(async()=>json({access_token:'a'})) as never)).rejects.toThrow();});
});

describe('sbRequest مع توكن المستخدم',()=>{
  it('يرسل bearer المستخدم وapikey المفتاح العام',async()=>{
    const f=vi.fn(async()=>json([]));
    await sbRequest(cfg,'orders',{bearer:'USER.JWT.X',prefer:'return=representation',method:'PATCH',body:{status:'new'},fetchImpl:f as never});
    const h=(f.mock.calls[0] as unknown as [string,RequestInit])[1].headers as Record<string,string>;
    expect(h.Authorization).toBe('Bearer USER.JWT.X');expect(h.apikey).toBe('sb_publishable_k');expect(h.Prefer).toBe('return=representation');
  });
});

describe('resolveAdmin',()=>{
  const admin=async()=>json([{email:'o@x.com',role:'owner'}]);
  it('بدون إعدادات',async()=>{expect((await resolveAdmin(future,'r',null,undefined,now)).status).toBe('unconfigured');});
  it('بدون كوكيز: دخول',async()=>{expect((await resolveAdmin(undefined,undefined,cfg,undefined,now)).status).toBe('login');});
  it('بدون access لكن فيه refresh: تجديد',async()=>{expect((await resolveAdmin(undefined,'r',cfg,undefined,now)).status).toBe('refresh');});
  it('توكن منتهٍ أو قرب ينتهي: تجديد أو دخول',async()=>{
    expect((await resolveAdmin(expired,'r',cfg,undefined,now)).status).toBe('refresh');
    expect((await resolveAdmin(soon,'r',cfg,undefined,now)).status).toBe('refresh');
    expect((await resolveAdmin(expired,undefined,cfg,undefined,now)).status).toBe('login');
  });
  it('مدير سليم',async()=>{
    const f=vi.fn(admin);
    expect(await resolveAdmin(future,'r',cfg,f as never,now)).toEqual({status:'ok',token:future,email:'o@x.com',role:'owner'});
    expect(((f.mock.calls[0] as unknown as [string,RequestInit])[1].headers as Record<string,string>).Authorization).toBe(`Bearer ${future}`);
  });
  it('حساب ليس مديرًا',async()=>{expect((await resolveAdmin(future,'r',cfg,(async()=>json([])) as never,now)).status).toBe('forbidden');});
  it('401 من القاعدة: تجديد',async()=>{expect((await resolveAdmin(future,'r',cfg,(async()=>json({message:'JWT expired'},401)) as never,now)).status).toBe('refresh');});
  it('أخطاء أخرى تُرمى',async()=>{await expect(resolveAdmin(future,'r',cfg,(async()=>json({message:'boom'},500)) as never,now)).rejects.toThrow();});
});
