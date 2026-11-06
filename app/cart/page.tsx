import type {Metadata} from 'next';
import CartView from '@/components/CartView';
export const metadata:Metadata={title:'السلة',robots:{index:false,follow:false}};
export default function CartPage(){
  return(
    <section className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <h1 className="font-display text-4xl md:text-6xl">السلة</h1>
      <div className="mt-10"><CartView/></div>
    </section>
  );
}
