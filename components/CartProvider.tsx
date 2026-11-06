'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {addToCart,cartCount,removeFromCart,sanitizeCart,setQty,type CartItem} from '@/lib/cart';

const KEY='kafur-cart-v1';
type Ctx={items:CartItem[];count:number;ready:boolean;add:(slug:string,ml:number,qty?:number)=>void;setQty:(slug:string,ml:number,qty:number)=>void;remove:(slug:string,ml:number)=>void;clear:()=>void};
const CartCtx=createContext<Ctx|null>(null);

export function CartProvider({children}:{children:React.ReactNode}){
  const [items,setItems]=useState<CartItem[]>([]);
  const [ready,setReady]=useState(false);

  // التخزين المحلي قد يكون ممنوعًا أو تالفًا: نتعامل معه بحذر ونرجع لسلة فاضية.
  useEffect(()=>{
    try{const raw=localStorage.getItem(KEY);if(raw)setItems(sanitizeCart(JSON.parse(raw)));}catch{}
    setReady(true);
    const onStorage=(e:StorageEvent)=>{if(e.key!==KEY)return;try{setItems(sanitizeCart(JSON.parse(e.newValue??'[]')));}catch{setItems([]);}};
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[]);
  useEffect(()=>{if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify(items));}catch{}},[items,ready]);

  const add=useCallback((slug:string,ml:number,qty=1)=>setItems(l=>addToCart(l,slug,ml,qty)),[]);
  const set=useCallback((slug:string,ml:number,qty:number)=>setItems(l=>setQty(l,slug,ml,qty)),[]);
  const remove=useCallback((slug:string,ml:number)=>setItems(l=>removeFromCart(l,slug,ml)),[]);
  const clear=useCallback(()=>setItems([]),[]);
  const value=useMemo(()=>({items,count:cartCount(items),ready,add,setQty:set,remove,clear}),[items,ready,add,set,remove,clear]);
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart():Ctx{
  const c=useContext(CartCtx);
  if(!c)throw new Error('useCart must be used inside CartProvider');
  return c;
}
