import type {Metadata} from 'next';
import CartView from '@/components/CartView';
import {getCatalog} from '@/lib/data';
export const metadata:Metadata={title:'السلة',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function CartPage(){
  const {products,tiers}=await getCatalog();
  // نمرّر للمتصفح الحد الأدنى فقط اللازم للتسعير والعرض.
  const catalog={products:products.map(({slug,name,house,color,prices})=>({slug,name,house,color,prices})),tiers};
  return(
    <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <h1 className="font-display text-4xl md:text-6xl">السلة</h1>
      <div className="mt-10"><CartView catalog={catalog}/></div>
    </section>
  );
}
