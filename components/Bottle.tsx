/** عبوة KAFUR مرسومة (SVG) تُستخدم إلى أن تتوفر صور منتج حقيقية. */
export default function Bottle({tint,className}:{tint:string;className?:string}){
  return(
    <svg viewBox="0 0 160 260" className={`relative z-10 ${className??''}`} role="img" aria-label="عبوة عطر كافور">
      <defs>
        <linearGradient id="kcap" x1="0" x2="1"><stop offset="0" stopColor="#8e949a"/><stop offset=".4" stopColor="#f2f3f4"/><stop offset=".75" stopColor="#a5aab0"/><stop offset="1" stopColor="#6b7177"/></linearGradient>
        <linearGradient id="kglass" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".55"/><stop offset=".25" stopColor="#fff" stopOpacity=".05"/><stop offset=".8" stopColor="#000" stopOpacity=".1"/><stop offset="1" stopColor="#fff" stopOpacity=".35"/></linearGradient>
      </defs>
      <ellipse cx="80" cy="249" rx="58" ry="6" fill="#000" opacity=".2"/>
      <rect x="30" y="84" width="100" height="162" rx="10" fill={tint} opacity=".93"/>
      <rect x="30" y="84" width="100" height="162" rx="10" fill="url(#kglass)"/>
      <rect x="30" y="216" width="100" height="30" rx="10" fill="#fff" opacity=".12"/>
      <rect x="66" y="70" width="28" height="16" fill="url(#kcap)"/>
      <rect x="56" y="14" width="48" height="58" rx="4" fill="url(#kcap)"/>
      <rect x="48" y="128" width="64" height="66" rx="2" fill="#f6f1e8" opacity=".95"/>
      <text x="80" y="160" textAnchor="middle" fontSize="26" fill="#1b1a18" style={{fontFamily:'var(--f-logo),serif'}}>K</text>
      <text x="80" y="178" textAnchor="middle" fontSize="8" letterSpacing="3" fill="#1b1a18" style={{fontFamily:'var(--f-logo),serif'}}>KAFUR</text>
    </svg>
  );
}
