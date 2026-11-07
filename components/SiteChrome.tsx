'use client';
import {usePathname} from 'next/navigation';

/** يخفي هيدر المتجر وفوتره (وشريط الإعلان) داخل لوحة التحكم /admin. */
export default function SiteChrome({top,bottom,children}:{top:React.ReactNode;bottom:React.ReactNode;children:React.ReactNode}){
  const admin=usePathname()?.startsWith('/admin')??false;
  return <>{!admin&&top}<main>{children}</main>{!admin&&bottom}</>;
}
