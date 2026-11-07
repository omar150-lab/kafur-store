import Link from 'next/link';
import {redirect} from 'next/navigation';
import AdminLogout from '@/components/AdminLogout';
import OrderStatus from '@/components/OrderStatus';
import {ORDER_STATUSES,STATUS_LABEL,isStatus,mapOrders,type AdminOrder} from '@/lib/admin';
import {requireAdmin} from '@/lib/admin-guard';
import {readConfig,sbRequest} from '@/lib/supabase';
import {egp} from '@/lib/format';

export const dynamic='force-dynamic';
const SELECT='id,order_no,status,customer_name,phone,governorate,address,notes,subtotal,shipping,total,demo,created_at,order_items(product_name,ml,qty,unit_price,line_total)';
const fmt=new Intl.DateTimeFormat('ar-EG-u-nu-latn',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'});
const when=(iso:string)=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':fmt.format(d);};
const BADGE:Record<string,string>={new:'bg-champagne text-ivory',confirmed:'bg-ink text-ivory',shipped:'bg-ink/70 text-ivory',delivered:'border border-ink/40',cancelled:'border border-red-700/50 text-red-700'};

function waLink(o:AdminOrder){
  const msg=`أهلاً ${o.name}، معاك كافور. طلبك رقم ${o.orderNo} وصلنا بإجمالي ${egp(o.total)}. نأكد معاك العنوان ونبدأ التجهيز؟`;
  return `https://wa.me/20${o.phone.replace(/^0/,'')}?text=${encodeURIComponent(msg)}`;
}

export default async function AdminOrders({searchParams}:{searchParams:Promise<{status?:string}>}){
  const sp=await searchParams;
  const filter=isStatus(sp.status)?sp.status:undefined;
  const admin=await requireAdmin(filter?`/admin?status=${filter}`:'/admin');
  const cfg=readConfig();
  if(!cfg)redirect('/admin/login?e=config');
  let orders:AdminOrder[]=[];
  let failed=false;
  try{orders=mapOrders(await sbRequest<unknown>(cfg,`orders?select=${SELECT}&order=created_at.desc&limit=200`,{bearer:admin.token}));}
  catch(e){console.error('admin: loading orders failed',e);failed=true;}
  const count=(s:string)=>orders.filter(o=>o.status===s).length;
  const shown=filter?orders.filter(o=>o.status===filter):orders;
  const tab=(active:boolean)=>`rounded-full border px-4 py-1.5 text-sm ${active?'border-ink bg-ink text-ivory':'border-ink/25 hover:border-champagne'}`;

  return(
    <div className="mx-auto max-w-5xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone pb-5">
        <div><p className="font-logo text-xl tracking-[.4em]">KAFUR</p><h1 className="font-display text-3xl">الطلبات</h1></div>
        <div className="text-end text-sm"><p dir="ltr" className="text-ink/70">{admin.email}</p><AdminLogout/></div>
      </header>

      <nav aria-label="تصفية الطلبات" className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin" className={tab(!filter)}>الكل ({orders.length})</Link>
        {ORDER_STATUSES.map(s=><Link key={s} href={`/admin?status=${s}`} className={tab(filter===s)}>{STATUS_LABEL[s]} ({count(s)})</Link>)}
      </nav>
      {orders.length>=200&&<p className="mt-3 text-xs text-ink/60">يظهر آخر 200 طلب فقط.</p>}
      {failed&&<p role="alert" className="mt-6 border border-red-700/40 p-4 text-sm text-red-700">تعذر تحميل الطلبات. حدّث الصفحة بعد شوية.</p>}

      {!failed&&shown.length===0&&<div className="mt-8 border border-dashed border-ink/25 px-6 py-16 text-center"><p className="font-display text-2xl">لا توجد طلبات{filter?` بحالة «${STATUS_LABEL[filter]}»`:''}</p></div>}

      <ul className="mt-6 space-y-5">
        {shown.map(o=>(
          <li key={o.id} className="border border-ink/15 bg-ivory p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2"><span className="font-display text-2xl">{o.orderNo}</span><span className={`rounded-full px-3 py-0.5 text-xs ${BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>{o.demo&&<span className="rounded-full border border-champagne px-3 py-0.5 text-xs text-champagne">تجريبي</span>}</p>
                <p className="mt-1 text-xs text-ink/60">{when(o.createdAt)}</p>
              </div>
              <OrderStatus key={`${o.id}-${o.status}`} id={o.id} status={o.status}/>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="text-sm">
                <p className="font-medium">{o.name}</p>
                <p dir="ltr" className="text-end md:text-start"><a href={`tel:${o.phone}`} className="hover:text-champagne">{o.phone}</a></p>
                <p className="mt-1 text-ink/70">{o.governorate}، {o.address}</p>
                {o.notes&&<p className="mt-2 border-s-2 border-champagne ps-3 text-ink/70">ملاحظات: {o.notes}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={waLink(o)} target="_blank" rel="noopener noreferrer" className="btn-line !px-4 !py-1.5 text-xs">كلّم الزبون على واتساب</a>
                  <a href={`tel:${o.phone}`} className="btn-line !px-4 !py-1.5 text-xs">اتصال</a>
                </div>
              </div>
              <div className="text-sm">
                <ul className="divide-y divide-stone border-y border-stone">
                  {o.items.map((i,k)=><li key={k} className="flex justify-between gap-3 py-2"><span>{i.name} · {i.ml} مل × {i.qty}</span><span>{egp(i.total)}</span></li>)}
                </ul>
                <dl className="mt-3 space-y-1">
                  <div className="flex justify-between"><dt className="text-ink/60">المجموع</dt><dd>{egp(o.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-ink/60">الشحن</dt><dd>{egp(o.shipping)}</dd></div>
                  <div className="flex justify-between font-display text-xl"><dt>الإجمالي</dt><dd>{egp(o.total)}</dd></div>
                </dl>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
