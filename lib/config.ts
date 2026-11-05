export const site={
  name:'كافور بارفيومز',latin:'KAFUR PARFUMS',
  url:process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3000',
  whatsapp:(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER??'').replace(/\D/g,''),
  instagram:'https://www.instagram.com/kafur.parfums',
  demo:process.env.NEXT_PUBLIC_DEMO_MODE!=='false',
};
/** رابط واتساب جاهز، أو null لو الرقم غير مضبوط (فلا يظهر زر شكلي). */
export const waLink=(text:string)=>site.whatsapp?`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`:null;
