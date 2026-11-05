import type {Metadata} from 'next';
import {Amiri,Cairo,Cormorant_Garamond} from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {site} from '@/lib/config';
const display=Amiri({subsets:['arabic','latin'],weight:['400','700'],variable:'--f-display'});
const body=Cairo({subsets:['arabic','latin'],variable:'--f-body'});
const logo=Cormorant_Garamond({subsets:['latin'],weight:['500','600'],variable:'--f-logo'});
export const metadata:Metadata={
  metadataBase:new URL(site.url),
  title:{default:`${site.name} | ${site.latin}`,template:`%s | ${site.name}`},
  description:'عطور KAFUR مستوحاة من أشهر العطور العالمية، بنوتات واضحة وبأحجام ٣٠ و٥٠ و١٠٠ مل.',
  openGraph:{type:'website',locale:'ar_EG',siteName:site.name},
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="ar" dir="rtl" className={`${display.variable} ${body.variable} ${logo.variable}`}>
      <body>
        <div className="bg-night px-4 py-2 text-center text-xs text-ivory/90">توصيل داخل مصر{site.demo&&' · نسخة تجريبية: الأسعار وبيانات الشحن غير نهائية'}</div>
        <Header/>
        <main>{children}</main>
        <Footer/>
      </body>
    </html>
  );
}
