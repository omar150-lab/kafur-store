import Link from 'next/link';
export default function NotFound(){
  return(<section className="mx-auto max-w-xl px-5 py-32 text-center"><p className="eyebrow">404</p><h1 className="font-display text-4xl">الصفحة غير موجودة</h1><p className="mt-3 text-ink/60">ربما تغيّر الرابط أو لم تُنشأ الصفحة بعد.</p><Link href="/" className="btn-dark mt-8">العودة للرئيسية</Link></section>);
}
