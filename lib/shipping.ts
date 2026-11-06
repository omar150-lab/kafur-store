export type Tier={id:number;label:string;fee:number;governorates:string[]};
// أسعار تجريبية (DEMO). الترتيب حسب القرب التقريبي من أسوان: الأقرب أرخص. تُعدَّل لاحقًا.
export const SHIPPING_TIERS:Tier[]=[
 {id:1,label:'أسوان',fee:40,governorates:['أسوان']},
 {id:2,label:'جنوب الصعيد والبحر الأحمر',fee:55,governorates:['الأقصر','قنا','البحر الأحمر']},
 {id:3,label:'وسط الصعيد',fee:65,governorates:['سوهاج','أسيوط','الوادي الجديد']},
 {id:4,label:'شمال الصعيد',fee:75,governorates:['المنيا','بني سويف','الفيوم']},
 {id:5,label:'القاهرة الكبرى والقناة',fee:85,governorates:['القاهرة','الجيزة','القليوبية','السويس','الإسماعيلية','المنوفية']},
 {id:6,label:'الدلتا والإسكندرية',fee:95,governorates:['الشرقية','الغربية','الدقهلية','الإسكندرية','البحيرة','بورسعيد','كفر الشيخ','دمياط']},
 {id:7,label:'الأطراف',fee:110,governorates:['مطروح','شمال سيناء','جنوب سيناء']},
];
export const governoratesOf=(tiers:Tier[]=SHIPPING_TIERS)=>tiers.flatMap(t=>t.governorates);
export const GOVERNORATES=governoratesOf();
export const shippingFor=(gov:string,tiers:Tier[]=SHIPPING_TIERS)=>tiers.find(t=>t.governorates.includes(gov))?.fee??null;
