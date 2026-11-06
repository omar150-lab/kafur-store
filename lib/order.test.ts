import {describe,expect,it} from 'vitest';
import {addToCart,cartCount,MAX_LINES,MAX_QTY,removeFromCart,sanitizeCart,setQty} from './cart';
import {buildMessage,normalizePhone,priceCart,validateCustomer} from './order';
import {products} from './products';
import {SHIPPING_TIERS,shippingFor} from './shipping';

const catalog={products,tiers:SHIPPING_TIERS};
const customer={name:'عمر',phone:'٠١٠١٢٣٤٥٦٧٨',address:'شارع النيل، بجوار المسجد، أسوان',notes:''};
const price=(slug:string,ml:number)=>products.find(p=>p.slug===slug)!.prices[ml];

describe('cart',()=>{
  it('يرفض الشكل الغلط',()=>{
    expect(sanitizeCart([{slug:'Bad Slug',ml:50,qty:1},{slug:'sauvage',ml:0,qty:1},{slug:'sauvage',ml:50.5,qty:1},{slug:'sauvage',ml:50,qty:0},{slug:'sauvage',ml:50,qty:'2'},null,5])).toEqual([]);
    expect(sanitizeCart('x')).toEqual([]);
  });
  it('يدمج المكرر ويحدّ الكمية',()=>{
    expect(sanitizeCart([{slug:'sauvage',ml:50,qty:3},{slug:'sauvage',ml:50,qty:9}])).toEqual([{slug:'sauvage',ml:50,qty:MAX_QTY}]);
  });
  it('يحدّ عدد الأسطر',()=>{
    const raw=Array.from({length:MAX_LINES+5},(_,i)=>({slug:`p${i}`,ml:50,qty:1}));
    expect(sanitizeCart(raw)).toHaveLength(MAX_LINES);
  });
  it('إضافة وتعديل وحذف',()=>{
    let c=addToCart([],'sauvage',50);c=addToCart(c,'sauvage',50);c=addToCart(c,'sauvage',100);
    expect(cartCount(c)).toBe(3);
    c=setQty(c,'sauvage',50,5);expect(c.find(i=>i.ml===50)?.qty).toBe(5);
    c=setQty(c,'sauvage',50,99);expect(c.find(i=>i.ml===50)?.qty).toBe(MAX_QTY);
    c=setQty(c,'sauvage',50,0);expect(c).toEqual([{slug:'sauvage',ml:100,qty:1}]);
    expect(removeFromCart(c,'sauvage',100)).toEqual([]);
  });
});

describe('pricing',()=>{
  it('السعر من الكتالوج فقط، مهما أرسل العميل',()=>{
    const q=priceCart([{slug:'sauvage',ml:50,qty:2,price:1} as never],catalog,'أسوان');
    expect(q.lines[0].unit).toBe(price('sauvage',50));
    expect(q.subtotal).toBe(price('sauvage',50)*2);
    expect(q.shipping).toBe(shippingFor('أسوان'));
    expect(q.total).toBe(q.subtotal+(q.shipping??0));
  });
  it('يتخطى منتجًا غير موجود أو حجمًا غير متاح',()=>{
    const q=priceCart([{slug:'nope',ml:50,qty:1},{slug:'sauvage',ml:77,qty:1},{slug:'sauvage',ml:30,qty:1}],catalog,'أسوان');
    expect(q.lines).toHaveLength(1);
  });
  it('أسعار مختلفة لكل عطر',()=>{
    const custom={products:[{...products[0],prices:{50:999}},{...products[1],prices:{50:111}}],tiers:SHIPPING_TIERS};
    const q=priceCart([{slug:products[0].slug,ml:50,qty:1},{slug:products[1].slug,ml:50,qty:2}],custom);
    expect(q.subtotal).toBe(999+222);
  });
  it('بدون محافظة: لا شحن ولا إجمالي',()=>{
    const q=priceCart([{slug:'sauvage',ml:30,qty:1}],catalog);
    expect(q.shipping).toBeNull();expect(q.total).toBeNull();
  });
  it('الأقرب لأسوان أرخص',()=>{expect(shippingFor('أسوان')!).toBeLessThan(shippingFor('القاهرة')!);expect(shippingFor('القاهرة')!).toBeLessThan(shippingFor('مطروح')!);});
});

describe('phone',()=>{
  it('يوحّد الصيغ',()=>{
    for(const p of ['01012345678','+201012345678','00201012345678','٠١٠١٢٣٤٥٦٧٨','010 1234 5678','1012345678'])expect(normalizePhone(p)).toBe('01012345678');
  });
});

describe('validateCustomer',()=>{
  it('بيانات صحيحة',()=>{const v=validateCustomer(customer,'أسوان');expect(v.ok).toBe(true);if(v.ok)expect(v.customer.phone).toBe('01012345678');});
  it('بيانات ناقصة',()=>{
    const v=validateCustomer({name:'',phone:'123',address:'قصير',notes:'x'.repeat(301)},'مدينة وهمية');
    expect(v.ok).toBe(false);
    if(!v.ok)expect(Object.keys(v.errors).sort()).toEqual(['address','governorate','name','notes','phone']);
  });
  it('المحافظات من الكتالوج الممرَّر',()=>{expect(validateCustomer(customer,'أسوان',['القاهرة']).ok).toBe(false);});
  it('رقم غير مصري',()=>{expect(validateCustomer({...customer,phone:'0501234567'},'أسوان').ok).toBe(false);});
});

describe('buildMessage',()=>{
  const q=priceCart([{slug:'sauvage',ml:50,qty:2},{slug:'khamrah',ml:100,qty:1}],catalog,'أسوان');
  const c={...customer,phone:'01012345678'};
  it('يحتوي الطلب والإجمالي ورقم الطلب',()=>{
    const m=buildMessage(q,c,'أسوان',true,'KF-1001');
    expect(m).toContain('(KF-1001)');expect(m).toContain('سوفاج - 50 مل × 2');expect(m).toContain('خمرة - 100 مل × 1');expect(m).toContain('تجريبية');
  });
  it('بدون رقم طلب ولا علامة تجريب في الإنتاج',()=>{
    const m=buildMessage(q,{...c,notes:'اتصل قبل الوصول'},'أسوان',false);
    expect(m).not.toContain('KF-');expect(m).not.toContain('تجريبية');expect(m).toContain('ملاحظات: اتصل قبل الوصول');
    expect(buildMessage(q,c,'أسوان',false)).not.toContain('ملاحظات');
  });
});
