'use client';
import {useState} from 'react';

export default function AdminLogout(){
  const [busy,setBusy]=useState(false);
  return <button type="button" disabled={busy} className="text-sm text-ink/60 underline hover:text-champagne" onClick={async()=>{setBusy(true);try{await fetch('/api/admin/logout',{method:'POST'});}catch{}window.location.assign('/admin/login');}}>تسجيل الخروج</button>;
}
