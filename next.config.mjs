import {initOpenNextCloudflareForDev} from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
const prod=process.env.NODE_ENV==='production';
export default {
  reactStrictMode:true,
  // قيم عامة (NEXT_PUBLIC) تُدمج وقت البناء. تُستعمل هذه القيم إن لم تُضبط متغيرات بيئة، وأي متغير بيئة يتفوق عليها.
  // الرقم مؤقت: عدّله هنا أو بمتغير NEXT_PUBLIC_WHATSAPP_NUMBER عند اعتماد الرقم النهائي.
  env:{
    NEXT_PUBLIC_WHATSAPP_NUMBER:process.env.NEXT_PUBLIC_WHATSAPP_NUMBER??'201279269784',
    NEXT_PUBLIC_SITE_URL:process.env.NEXT_PUBLIC_SITE_URL??(prod?'https://kafur-store.mmore8469.workers.dev':'http://localhost:3000'),
  },
};
