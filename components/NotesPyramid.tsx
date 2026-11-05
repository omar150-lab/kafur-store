import {noteName} from '@/lib/catalog';
import type {Product} from '@/lib/products';
const LEVELS=[['top','نوتات عليا','أول ما تشمّه بعد الرش'],['heart','نوتات وسطى','قلب العطر بعد دقائق'],['base','نوتات أساسية','تبقى على الجلد لساعات']] as const;
export default function NotesPyramid({notes}:{notes:Product['notes']}){
  const rows=LEVELS.map(([k,title,hint])=>({k,title,hint,names:notes[k].map(noteName).filter((n):n is string=>!!n)})).filter(r=>r.names.length);
  if(!rows.length)return null;
  return(
    <section aria-labelledby="pyramid">
      <h2 id="pyramid" className="font-display text-2xl">الهرم العطري</h2>
      <dl className="mt-4 divide-y divide-stone border-y border-stone">
        {rows.map(r=>(
          <div key={r.k} className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt><span className="block">{r.title}</span><span className="text-xs text-ink/50">{r.hint}</span></dt>
            <dd className="flex flex-wrap gap-2">{r.names.map((n,i)=><span key={`${n}-${i}`} className="rounded-full border border-ink/20 px-3 py-1 text-sm">{n}</span>)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
