// أسعار تجريبية (DEMO): تُعدَّل لاحقًا من لوحة التحكم. السعر النهائي يُحسب دائمًا على الخادم.
export const SIZES=[{ml:30,price:250},{ml:50,price:350},{ml:100,price:600}] as const;
export const fromPrice=()=>Math.min(...SIZES.map(s=>s.price));
