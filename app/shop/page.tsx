import type {Metadata} from 'next';
import ShopBrowser from '@/components/ShopBrowser';
import {products} from '@/lib/products';
import {parseFilters,serializeFilters} from '@/lib/catalog';
import {site} from '@/lib/config';
export const metadata:Metadata={
  title:'المتجر',
  description:'تصفّح كل عطور كافور: ابحث بالاسم أو النوتة، وفلتر حسب الموسم والتركيز والدار.',
  alternates:{canonical:'/shop'},
};
type SP=Promise<Record<string,string|string[]|undefined>>;
export default async function ShopPage({searchParams}:{searchParams:SP}){
  // الفلاتر تُقرأ من الرابط على الخادم، فيصل الزائر (ومحركات البحث) HTML فيه النتائج نفسها بلا وميض.
  const initial=parseFilters(await searchParams);
  return(
    <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <h1 className="font-display text-4xl md:text-6xl">المتجر</h1>
      <p className="mt-3 max-w-xl text-ink/70">كل عطور كافور في مكان واحد. ابحث أو فلتر للوصول لعطرك.{site.demo&&<span className="text-champagne"> الأسعار تجريبية.</span>}</p>
      <div className="mt-10"><ShopBrowser key={serializeFilters(initial)} products={products} initial={initial}/></div>
    </section>
  );
}
