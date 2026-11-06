# KAFUR PARFUMS: المرحلة ١ إلى ٥
تشغيل محلي: `npm install` ثم `npm run dev` (http://localhost:3000). الاختبارات: `npm test`. فحص الأنواع: `npm run typecheck`.
الإعدادات في `.env.local` (رقم واتساب مؤقت، ووضع Demo).

## الصفحات
- `/` الرئيسية
- `/shop` المتجر: بحث (يتعامل مع الهمزات والتاء المربوطة والأرقام العربية، ويقبل الاسم اللاتيني مثل sauvage)، فلاتر الموسم والتركيز والدار والنوتة، وترتيب. الفلاتر محفوظة في الرابط وقابلة للمشاركة.
- `/product/[slug]` المنتج: اختيار الحجم والسعر، زر طلب عبر واتساب، الهرم العطري، عطور قريبة.

- `/cart` السلة: محفوظة في جهاز الزائر (localStorage)، بيانات الطلب، شحن حسب المحافظة، وإرسال الطلب عبر واتساب.
- `POST /api/order` يتحقق من الطلب ويعيد حساب الأسعار والشحن على الخادم (لا يثق بأي سعر من المتصفح) ويبني رابط واتساب. في المرحلة ٥ يُحفظ الطلب في Supabase هنا.

## Supabase (المرحلة ٥)
- `supabase/setup.sql`: الجداول (عطور، سعر لكل حجم، شحن، طلبات)، وسياسات RLS، ودالة `create_order`، والبيانات الأولية. يُشغَّل مرة واحدة من SQL Editor، وآمن لإعادة التشغيل. (`schema.sql` و`seed.sql` هما نفس الملف مقسومًا.)
- الموقع يقرأ العطور والأسعار والشحن من القاعدة بالمفتاح العام (قراءة فقط)، وإن تعذّرت يستعمل بيانات احتياطية مدمجة.
- `/api/order` يحفظ الطلب عبر الدالة بالمفتاح السري (على الخادم فقط)، والأسعار تُحسب داخل القاعدة. تعذّر الحفظ لا يمنع الزبون من إرسال طلبه على واتساب (يُسجَّل الخطأ).
- المتغيرات (Cloudflare ← Settings ← Variables and secrets ← Runtime، كـ Secret): `SUPABASE_PUBLISHABLE_KEY` و`SUPABASE_SECRET_KEY`. الرابط `SUPABASE_URL` له قيمة افتراضية في الكود.

## البيانات التجريبية
`lib/products.ts` و`lib/pricing.ts` و`lib/shipping.ts` هي الآن بيانات أولية واحتياطية فقط. المصدر الفعلي هو قاعدة البيانات (`lib/data.ts`).
منطق البحث والفلترة في `lib/catalog.ts` (دوال نقية عليها اختبارات في `lib/catalog.test.ts`).

## المتبقي
لوحة التحكم (م٦)، الدفع (م٧)، SEO واختبارات (م٨).

## النشر على Cloudflare (Workers عبر OpenNext)
الإعدادات جاهزة: `wrangler.jsonc` و`open-next.config.ts`. القيم الافتراضية (رقم واتساب ورابط الموقع) في `next.config.mjs` وأي متغير بيئة يتفوق عليها، فلا حاجة لضبط متغيرات في Cloudflare.

من لوحة Cloudflare: Workers & Pages ← Create ← Import a repository (GitHub) ← اختر `kafur-store`، ثم:
- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy` (مهم: ليس `wrangler deploy`، لأن هذا الأمر هو اللي ينسخ الصفحات المبنية للـ assets)
- عند ربط دومين خاص، غيّر `NEXT_PUBLIC_SITE_URL` (متغير بناء) أو القيمة الافتراضية في `next.config.mjs`.

من جهازك: `npm run preview:cf` للمعاينة المحلية على بيئة Workers، و`npm run deploy:cf` للنشر المباشر (يحتاج `npx wrangler login`).
