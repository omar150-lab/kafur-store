import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import Bottle from '@/components/Bottle';
import NotesPyramid from '@/components/NotesPyramid';
import ProductBuy from '@/components/ProductBuy';
import ProductCard from '@/components/ProductCard';
import {products,CONCENTRATION} from '@/lib/products';
import {SEASON_LABEL,allNoteKeys,getProduct,noteName,relatedProducts} from '@/lib/catalog';
import {SHIPPING_TIERS} from '@/lib/shipping';
import {egp} from '@/lib/format';
import {site} from '@/lib/config';

export const dynamicParams=false;
export const generateStaticParams=()=>products.map(p=>({slug:p.slug}));

type Props={params:Promise<{slug:string}>};

export async function generateMetadata({params}:Props):Promise<Metadata>{
  const p=getProduct(products,(await params).slug);
  if(!p)return {};
  const notes=allNoteKeys(p).map(noteName).filter(Boolean).slice(0,5).join('، ');
  const description=`${p.name} من كافور (${CONCENTRATION[p.concentration]}) مستوحى من عطر ${p.house}.${notes?` نوتات: ${notes}.`:''} بأحجام 30 و50 و100 مل.`;
  return {title:p.name,description,alternates:{canonical:`/product/${p.slug}`},openGraph:{title:`${p.name} | ${site.name}`,description,type:'website',locale:'ar_EG'}};
}

export default async function ProductPage({params}:Props){
  const p=getProduct(products,(await params).slug);
  if(!p)notFound();
  const related=relatedProducts(products,p);
  const fees=SHIPPING_TIERS.map(t=>t.fee);
  const [minFee,maxFee]=[Math.min(...fees),Math.max(...fees)];
  return(
    <>
      <nav aria-label="مسار الصفحة" className="mx-auto max-w-7xl px-5 pt-6 text-sm text-ink/60">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="hover:text-champagne">الرئيسية</Link></li><li aria-hidden>/</li>
          <li><Link href="/shop" className="hover:text-champagne">المتجر</Link></li><li aria-hidden>/</li>
          <li aria-current="page" className="text-ink">{p.name}</li>
        </ol>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-8 md:grid-cols-2 md:gap-14 md:py-12">
        <div className="md:sticky md:top-24 md:self-start">
          <div className="stage aspect-[4/5] rounded-sm"><div className="mash"/><Bottle tint={p.color} className="h-4/5 w-auto"/></div>
          <p className="mt-3 text-xs text-ink/50">العبوة مرسومة للتوضيح، وليست صورة المنتج الفعلية.</p>
        </div>
        <div>
          <p className="text-sm text-ink/60">{p.house} · {CONCENTRATION[p.concentration]}{p.season&&` · ${SEASON_LABEL[p.season]}`}</p>
          <h1 className="mt-2 font-display text-4xl md:text-6xl">{p.name}</h1>
          {p.tagline&&<p className="mt-4 text-lg text-ink/70">{p.tagline}</p>}
          <p className="mt-3 text-sm text-ink/60">مستوحى من عطر «{p.name}» من {p.house}.</p>
          <div className="mt-8 border border-ink/15 bg-ivory p-6"><ProductBuy slug={p.slug} name={p.name}/></div>
          <p className="mt-4 text-sm text-ink/70">الشحن داخل مصر من {egp(minFee)} إلى {egp(maxFee)} حسب المحافظة{site.demo&&' (أسعار تجريبية)'}. يُحسب بدقة عند إتمام الطلب.</p>
          <div className="mt-10"><NotesPyramid notes={p.notes}/></div>
        </div>
      </section>
      {related.length>0&&(
        <section className="mx-auto max-w-7xl px-5 pb-20" aria-labelledby="related">
          <h2 id="related" className="font-display text-3xl md:text-4xl">عطور قريبة</h2>
          <p className="mt-2 text-sm text-ink/60">من نفس الدار أو الموسم أو بنوتات مشتركة.</p>
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">{related.map(r=><ProductCard key={r.slug} p={r}/>)}</div>
        </section>
      )}
    </>
  );
}
