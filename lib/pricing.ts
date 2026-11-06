// أحجام وأسعار افتراضية (DEMO): تُستخدم كبيانات أولية للقاعدة وكاحتياطي عند تعذر الوصول لها.
// الأسعار الفعلية لكل عطر وحجم تُقرأ من قاعدة البيانات (جدول product_sizes) وتُعدَّل من لوحة التحكم.
export const SIZES=[{ml:30,price:250},{ml:50,price:350},{ml:100,price:600}] as const;
export type Prices=Record<number,number>;
export const defaultPrices=():Prices=>Object.fromEntries(SIZES.map(s=>[s.ml,s.price]));
export const sizesOf=(prices:Prices)=>Object.entries(prices).map(([ml,price])=>({ml:Number(ml),price})).sort((a,b)=>a.ml-b.ml);
export const productFromPrice=(prices:Prices)=>Math.min(...Object.values(prices));
