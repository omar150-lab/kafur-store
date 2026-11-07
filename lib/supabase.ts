// عميل REST خفيف لـ Supabase (PostgREST) بدون مكتبات: يعمل على Cloudflare Workers.
export type SbConfig={url:string;key:string};
const DEFAULT_URL='https://knmmwgfuekbyuvafsxee.supabase.co';
const env=(k:string)=>{const v=process.env[k];return v&&v.trim()?v.trim():undefined;};

export const supabaseUrl=()=>(env('SUPABASE_URL')??DEFAULT_URL).replace(/\/+$/,'');
/** مفتاح القراءة العام (Publishable/anon): آمن للقراءة فقط بسبب RLS. */
export const readConfig=():SbConfig|null=>{const key=env('SUPABASE_PUBLISHABLE_KEY')??env('SUPABASE_ANON_KEY');return key?{url:supabaseUrl(),key}:null;};
/** المفتاح السري (Secret/service_role): للخادم فقط. لا يُستعمل أبدًا في كود المتصفح. */
export const adminConfig=():SbConfig|null=>{const key=env('SUPABASE_SECRET_KEY')??env('SUPABASE_SERVICE_ROLE_KEY');return key?{url:supabaseUrl(),key}:null;};

export class SbError extends Error{
  constructor(public status:number,public code:string,message:string){super(message);this.name='SbError';}
}

export async function sbRequest<T>(cfg:SbConfig,path:string,opts:{method?:string;body?:unknown;timeoutMs?:number;fetchImpl?:typeof fetch;bearer?:string;prefer?:string}={}):Promise<T>{
  const headers:Record<string,string>={apikey:cfg.key,Accept:'application/json'};
  // المفاتيح القديمة (JWT) تحتاج Authorization أيضًا؛ المفاتيح الجديدة (sb_...) تكفيها apikey.
  if(opts.bearer)headers.Authorization=`Bearer ${opts.bearer}`; // توكن المستخدم (المدير): تُطبَّق عليه سياسات RLS
  else if(cfg.key.startsWith('eyJ'))headers.Authorization=`Bearer ${cfg.key}`;
  if(opts.prefer)headers.Prefer=opts.prefer;
  if(opts.body!==undefined)headers['Content-Type']='application/json';
  const ctl=new AbortController();
  const timer=setTimeout(()=>ctl.abort(),opts.timeoutMs??5000);
  try{
    const res=await (opts.fetchImpl??fetch)(`${cfg.url}/rest/v1/${path}`,{method:opts.method??'GET',headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body),signal:ctl.signal});
    const text=await res.text();
    let data:unknown=null;
    try{data=text?JSON.parse(text):null;}catch{}
    if(!res.ok){const d=(data&&typeof data==='object'?data:{}) as Record<string,unknown>;throw new SbError(res.status,String(d.code??''),String(d.message??res.statusText));}
    return data as T;
  }finally{clearTimeout(timer);}
}
