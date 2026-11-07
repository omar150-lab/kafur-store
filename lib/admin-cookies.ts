import type {NextResponse} from 'next/server';
import {COOKIE_AT,COOKIE_RF,COOKIE_RT,type Tokens} from './admin';

const base={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};

export function setSession(res:NextResponse,t:Tokens,opts:{refreshed?:boolean}={}){
  res.cookies.set(COOKIE_AT,t.access_token,{...base,maxAge:Math.max(60,t.expires_in)});
  res.cookies.set(COOKIE_RT,t.refresh_token,{...base,maxAge:60*60*24*30});
  if(opts.refreshed)res.cookies.set(COOKIE_RF,'1',{...base,maxAge:20});
  return res;
}
export function clearSession(res:NextResponse){
  for(const k of [COOKIE_AT,COOKIE_RT,COOKIE_RF])res.cookies.set(k,'',{...base,maxAge:0});
  return res;
}
