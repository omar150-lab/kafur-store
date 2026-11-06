import {describe,expect,it} from 'vitest';
import {addToCart,cartCount,MAX_LINES,MAX_QTY,removeFromCart,sanitizeCart,setQty} from './cart';
import {buildMessage,buildOrder,normalizePhone,priceCart,validateCustomer} from './order';
import {products} from './products';
import {SIZES} from './pricing';
import {shippingFor} from './shipping';

const opts={whatsapp:'201279269784',demo:true};
const customer={name:'عمر',phone:'٠١٠١٢٣٤٥٦٧٨',address:'شارع النيل، بجوار المسجد، أسوان',notes:''};
const price=(ml:number)=>SIZES.find(s=>s.ml===ml)!.price;

describe('cart',()=>{
  it('يرفض المنتج المجهول والحجم المجهول والكمية الغلط',()=>{
    expect(sanitizeCart([{slug:'nope',ml:50,qty:1},{slug:'sauvage',ml:77,qty:1},{slug:'sauvage',ml:50,qty:0},{slug:'sauvage',ml:50,qty:'2'},null,5])).toEqual([]);
    expect(sanitizeCart('x')).toEqual([]);
  });
  it('يدمج المكرر ويحدّ الكمية',()=>{
    expect(sanitizeCart([{slug:'sauvage',ml:50,qty:3},{slug:'sauvage',ml:50,qty:9}])).toEqual([{slug:'sauvage',ml:50,qty:MAX_QTY}]);
  });
  it('يحدّ عدد الأسطر',()=>{
    const raw=products.flatMap(p=>SIZES.map(s=>({slug:p.slug,ml:s.ml,qty:1})));
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
  it('السعر من بيانات المتجر فقط، مهما أرسل العميل',()=>{
    const q=priceCart([{slug:'sauvage',ml:50,qty:2,price:1} as never],'أسوان');
    expect(q.lines[0].unit).toBe(price(50));
    expect(q.subtotal).toBe(price(50)*2);
    expect(q.shipping).toBe(shippingFor('أسوان'));
    expect(q.total).toBe(q.subtotal+(q.shipping??0));
  });
  it('بدون محافظة: لا شحن ولا إجمالي',()=>{
    const q=priceCart([{slug:'sauvage',ml:30,qty:1}]);
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
  it('رقم غير مصري',()=>{const v=validateCustomer({...customer,phone:'0501234567'},'أسوان');expect(v.ok).toBe(false);});
});

describe('buildOrder',()=>{
  const items=[{slug:'sauvage',ml:50,qty:2},{slug:'khamrah',ml:100,qty:1}];
  it('طلب سليم: رسالة وإجمالي ورابط واتساب',()=>{
    const r=buildOrder({items,governorate:'أسوان',customer},opts);
    expect(r.ok).toBe(true);
    if(!r.ok)return;
    const expected=price(50)*2+price(100)+shippingFor('أسوان')!;
    expect(r.quote.total).toBe(expected);
    expect(r.message).toContain('سوفاج - 50 مل × 2');
    expect(r.message).toContain('خمرة - 100 مل × 1');
    expect(r.message).toContain('01012345678');
    expect(r.message).toContain('تجريبية');
    expect(r.whatsappUrl.startsWith('https://wa.me/201279269784?text=')).toBe(true);
    expect(decodeURIComponent(r.whatsappUrl.split('text=')[1])).toBe(r.message);
  });
  it('سلة فاضية أو كلها غلط',()=>{
    const r=buildOrder({items:[{slug:'x',ml:50,qty:1}],governorate:'أسوان',customer},opts);
    expect(r.ok).toBe(false);if(!r.ok)expect(r.errors.items).toBeTruthy();
  });
  it('يرجّع أخطاء الحقول مع أخطاء السلة',()=>{
    const r=buildOrder({items:[],governorate:'',customer:{}},opts);
    expect(r.ok).toBe(false);if(!r.ok)expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['items','name','phone','governorate','address']));
  });
  it('مدخلات غريبة لا تكسر',()=>{for(const x of [null,undefined,1,'a',[],{items:'x'}])expect(buildOrder(x,opts).ok).toBe(false);});
  it('الملاحظات تظهر فقط عند وجودها، وبدون علامة التجريب في الإنتاج',()=>{
    const q=priceCart(items,'أسوان');
    const m=buildMessage(q,{...customer,phone:'01012345678',notes:'اتصل قبل الوصول'},'أسوان',false);
    expect(m).toContain('ملاحظات: اتصل قبل الوصول');expect(m).not.toContain('تجريبية');
    expect(buildMessage(q,{...customer,phone:'01012345678'},'أسوان',false)).not.toContain('ملاحظات');
  });
});
