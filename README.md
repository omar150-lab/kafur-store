# KAFUR PARFUMS: المرحلة ١ و٢ و٣
تشغيل محلي: `npm install` ثم `npm run dev` (http://localhost:3000). الاختبارات: `npm test`. فحص الأنواع: `npm run typecheck`.
الإعدادات في `.env.local` (رقم واتساب مؤقت، ووضع Demo).

## الصفحات
- `/` الرئيسية
- `/shop` المتجر: بحث (يتعامل مع الهمزات والتاء المربوطة والأرقام العربية، ويقبل الاسم اللاتيني مثل sauvage)، فلاتر الموسم والتركيز والدار والنوتة، وترتيب. الفلاتر محفوظة في الرابط وقابلة للمشاركة.
- `/product/[slug]` المنتج: اختيار الحجم والسعر، زر طلب عبر واتساب، الهرم العطري، عطور قريبة.

## البيانات التجريبية
`lib/products.ts` (عطور)، `lib/pricing.ts` (أحجام وأسعار)، `lib/shipping.ts` (شحن حسب القرب من أسوان).
منطق البحث والفلترة في `lib/catalog.ts` (دوال نقية عليها اختبارات في `lib/catalog.test.ts`).

## المتبقي
السلة والطلب (م٤)، Supabase (م٥)، لوحة التحكم (م٦)، الدفع (م٧)، SEO واختبارات (م٨).

## النشر على Cloudflare (Workers عبر OpenNext)
الإعدادات جاهزة: `wrangler.jsonc` و`open-next.config.ts`. القيم العامة وقت البناء في `.env.production`.

من لوحة Cloudflare: Workers & Pages ← Create ← Import a repository (GitHub) ← اختر `kafur-store`، ثم:
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy` (مهم: ليس `wrangler deploy`، لأن هذا الأمر هو اللي ينسخ الصفحات المبنية للـ assets)
- بعد أول نشر، أضف متغير بناء `NEXT_PUBLIC_SITE_URL` برابط الموقع (`https://kafur-store.<حسابك>.workers.dev`) ثم أعد النشر، حتى تصح روابط SEO.

من جهازك: `npm run preview:cf` للمعاينة المحلية على بيئة Workers، و`npm run deploy:cf` للنشر المباشر (يحتاج `npx wrangler login`).
