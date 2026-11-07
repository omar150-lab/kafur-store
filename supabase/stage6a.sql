-- =====================================================================
-- KAFUR PARFUMS: المرحلة ٦-أ (لوحة التحكم: الدخول وإدارة الطلبات)
-- يُشغَّل بعد setup.sql. آمن لإعادة التشغيل.
-- =====================================================================

-- المديرون: حساب Supabase Auth لا يصبح مديرًا إلا بوجود صف هنا.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'admin' check (role in ('owner','admin')),
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- دالة فحص المدير (security definer لتفادي التكرار اللانهائي في سياسات RLS)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- وقت آخر تغيير حالة للطلب
alter table public.orders add column if not exists status_changed_at timestamptz;
create or replace function public.touch_status_changed() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status then new.status_changed_at := now(); end if;
  return new;
end $$;
drop trigger if exists orders_status_touch on public.orders;
create trigger orders_status_touch before update on public.orders
for each row execute function public.touch_status_changed();

-- الصلاحيات: المدير يقرأ الطلبات وأصنافها، ويغيّر عمود الحالة فقط (لا الأسعار ولا بيانات الزبون)
revoke all on public.admins from anon, authenticated;
grant select on public.admins      to authenticated;
grant select on public.orders      to authenticated;
grant select on public.order_items to authenticated;
revoke update on public.orders from authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "admin reads own row" on public.admins;
create policy "admin reads own row" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "admins update order status" on public.orders;
create policy "admins update order status" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items" on public.order_items
  for select to authenticated using (public.is_admin());
