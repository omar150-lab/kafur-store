import Link from 'next/link';
import Bottle from '@/components/Bottle';
import ProductCard from '@/components/ProductCard';
import {products,CONCENTRATION} from '@/lib/products';
import {SIZES} from '@/lib/pricing';
import {egp} from '@/lib/format';
import {site,waLink} from '@/lib/config';
export default function Home(){
  const hero=products.find(p=>p.featured)??products[0];
  const winter=products.filter(p=>p.season==='winter').slice(0,4);
  const wa=waLink('مرحبًا كافور، عايز أستفسر عن العطور');
  return(<>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-[1.05fr_1fr] md:py-24">
      <div>
        <p className="eyebrow">KAFUR PARFUMS</p>
        <h1 className="font-display text-5xl leading-[1.2] md:text-7xl">عطر يشبه <span className="text-champagne">حضورك</span></h1>
        <p className="mt-6 max-w-md text-lg text-ink/70">عطور مستوحاة من أشهر العطور العالمية، بنوتات عليا ووسطى وأساسية واضحة، بثلاثة أحجام تناسب كل استخدام.</p>
        <div className="mt-8 flex flex-wrap gap-3"><a href="#winter" className="btn-dark">اكتشف المجموعة</a>{wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="btn-line">اسأل على واتساب</a>}</div>
      </div>
      <figure>
        <div className="stage aspect-[4/5] rounded-sm"><div className="mash"/><Bottle tint={hero.color} className="h-4/5 w-auto"/></div>
        <figcaption className="mt-3 text-sm text-ink/60">{hero.name} · {hero.house} · {CONCENTRATION[hero.concentration]}</figcaption>
      </figure>
    </section>
    <section id="winter" className="mx-auto max-w-7xl px-5 py-16">
      <p className="eyebrow">WINTER COLLECTION</p>
      <h2 className="font-display text-4xl md:text-5xl">المجموعة الشتوية</h2>
      <p className="mt-3 max-w-lg text-ink/70">الجو بدأ يسقع. دفء يميّزك.</p>
      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">{winter.map(p=><ProductCard key={p.slug} p={p}/>)}</div>
      <div className="mt-10 text-center"><Link href="/shop" className="btn-line">تصفّح كل العطور</Link></div>
    </section>
    <section id="sizes" className="bg-stone/40 px-5 py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display text-4xl md:text-5xl">الأحجام والأسعار</h2>
        {site.demo&&<p className="mt-2 text-sm text-champagne">أسعار تجريبية: تُعتمد قبل الإطلاق.</p>}
        <div className="mt-10 grid gap-4 md:grid-cols-3">{SIZES.map(s=>(
          <div key={s.ml} className="border border-ink/15 bg-ivory p-8 text-center"><p className="font-display text-5xl">{s.ml}<span className="text-xl"> مل</span></p><p className="mt-4 text-2xl text-champagne">{egp(s.price)}</p></div>
        ))}</div>
      </div>
    </section>
    <section id="story" className="bg-night px-5 py-20 text-ivory">
      <div className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">OUR STORY</p>
        <h2 className="font-display text-4xl md:text-5xl">قصة كافور</h2>
        <p className="mt-6 text-lg leading-loose text-ivory/80">كل عطر من KAFUR مستوحى من عطر عالمي معروف، ويُقدَّم بهرم عطري واضح. هوية سوداء وذهبية تليق بالفخامة، ومجموعات تتجدد مع المواسم.</p>
      </div>
    </section>
    <section id="contact" className="mx-auto max-w-7xl px-5 py-20 text-center">
      <h2 className="font-display text-4xl md:text-5xl">تواصل معنا</h2>
      <p className="mt-3 text-ink/70">للطلب والاستفسار وتفاصيل التوفر.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="btn-dark">واتساب</a>}<a href={site.instagram} target="_blank" rel="noopener noreferrer" className="btn-line">انستجرام @kafur.parfums</a></div>
    </section>
  </>);
}
