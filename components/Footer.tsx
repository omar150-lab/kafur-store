import {site,waLink} from '@/lib/config';
export default function Footer(){
  const wa=waLink('مرحبًا كافور');
  return(
    <footer className="border-t border-stone bg-ivory px-5 py-10 text-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div><p className="font-logo text-xl tracking-[.4em]">KAFUR</p><p className="mt-2 max-w-md text-xs text-ink/60">أسماء العطور والعلامات المرجعية تخص أصحابها وتُذكر للإشارة فقط.</p></div>
        <div className="flex gap-6"><a href={site.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-champagne">انستجرام</a>{wa&&<a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-champagne">واتساب</a>}</div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-xs text-ink/50">© {new Date().getFullYear()} {site.latin}</p>
    </footer>
  );
}
