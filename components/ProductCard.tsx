import Link from 'next/link';
import Bottle from './Bottle';
import {NOTES,CONCENTRATION,type Product} from '@/lib/products';
import {SEASON_LABEL} from '@/lib/catalog';
import {productFromPrice} from '@/lib/pricing';
import {egp} from '@/lib/format';
export default function ProductCard({p}:{p:Product}){
  const notes=[...p.notes.top,...p.notes.heart,...p.notes.base].map(k=>NOTES[k]).filter(Boolean).slice(0,3).join(' · ');
  return(
    <Link href={`/product/${p.slug}`} className="group block" aria-label={`${p.name}، ${p.house}`}>
      <article>
        <div className="stage aspect-[4/5] rounded-sm">
          <div className="mash"/>
          {p.season&&<span className="absolute start-3 top-3 z-20 bg-ivory/85 px-2.5 py-1 text-xs">{SEASON_LABEL[p.season]}</span>}
          <Bottle tint={p.color} className="h-4/5 w-auto transition-transform duration-500 group-hover:-translate-y-2"/>
        </div>
        <div className="mt-3">
          <p className="text-xs text-ink/60">{p.house} · {CONCENTRATION[p.concentration]}</p>
          <h3 className="font-display text-xl group-hover:text-champagne">{p.name}</h3>
          {notes&&<p className="mt-1 text-xs text-ink/60">{notes}</p>}
          <p className="mt-1 text-sm">من {egp(productFromPrice(p.prices))}</p>
        </div>
      </article>
    </Link>
  );
}
