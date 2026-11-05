import {defineCloudflareConfig} from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';
// الموقع حاليًا صفحات ثابتة (SSG) وصفحة /shop ديناميكية بدون ISR، فنقرأ الصفحات المبنية من الـ assets بدون R2/KV.
// عند الحاجة لـ ISR/revalidate لاحقًا (م٥+) نبدّلها بـ R2 أو KV.
export default defineCloudflareConfig({incrementalCache:staticAssetsIncrementalCache});
