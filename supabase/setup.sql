-- =====================================================================
-- KAFUR PARFUMS: المرحلة ٥ (Supabase)
-- شغّله في: Supabase Dashboard ← SQL Editor ← New query ← الصق ← Run.
-- آمن لإعادة التشغيل: لا يمسح بيانات ولا يعيد كتابة تعديلاتك.
-- =====================================================================

-- ---------- الجداول ----------
create table if not exists public.products (
  slug          text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
  name          text not null check (char_length(name)  between 1 and 80),
  house         text not null check (char_length(house) between 1 and 80),
  concentration text not null check (concentration in ('edp','extrait','parfum')),
  tagline       text not null default '' check (char_length(tagline) <= 200),
  color         text not null default '#888888' check (color ~ '^#[0-9a-fA-F]{6}$'),
  season        text check (season in ('winter','summer')),
  featured      boolean not null default false,
  active        boolean not null default true,
  sort_order    int not null default 0,
  notes         jsonb not null default '{"top":[],"heart":[],"base":[]}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- سعر كل حجم لكل عطر
create table if not exists public.product_sizes (
  product_slug text not null references public.products(slug) on update cascade on delete cascade,
  ml           int  not null check (ml between 1 and 1000),
  price        int  not null check (price > 0 and price <= 1000000),
  primary key (product_slug, ml)
);

-- الشحن حسب المحافظة (tier_id يرتّب الشرائح من الأقرب لأسوان للأبعد)
create table if not exists public.shipping_rates (
  governorate text primary key,
  tier_id     int  not null,
  tier_label  text not null,
  fee         int  not null check (fee >= 0)
);

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  number        bigint not null unique default nextval('public.order_number_seq'),
  order_no      text generated always as ('KF-' || number::text) stored,
  status        text not null default 'new' check (status in ('new','confirmed','shipped','delivered','cancelled')),
  customer_name text not null check (char_length(customer_name) between 2 and 60),
  phone         text not null check (phone ~ '^01[0125][0-9]{8}$'),
  governorate   text not null,
  address       text not null check (char_length(address) between 10 and 250),
  notes         text not null default '' check (char_length(notes) <= 300),
  subtotal      int not null check (subtotal >= 0),
  shipping      int not null check (shipping >= 0),
  total         int not null check (total >= 0),
  demo          boolean not null default true,   -- طلب جاء من نسخة تجريبية
  ip_hash       text,                            -- بصمة مجهولة لتحديد الإزعاج فقط
  created_at    timestamptz not null default now()
);

-- لقطة من السطور وقت الطلب (تبقى كما هي حتى لو تغيّر السعر أو حُذف العطر)
create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  ml           int  not null,
  qty          int  not null check (qty between 1 and 10),
  unit_price   int  not null check (unit_price >= 0),
  line_total   int  not null check (line_total >= 0)
);

create index if not exists orders_created_idx       on public.orders (created_at desc);
create index if not exists orders_phone_time_idx    on public.orders (phone, created_at);
create index if not exists orders_ip_time_idx       on public.orders (ip_hash, created_at);
create index if not exists order_items_order_idx    on public.order_items (order_id);
create index if not exists products_active_sort_idx on public.products (active, sort_order);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- ---------- الأمان (RLS) ----------
alter table public.products       enable row level security;
alter table public.product_sizes  enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- الزائر (المفتاح العام) يقرأ فقط: العطور المفعّلة وأسعارها وأسعار الشحن
drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products
  for select to anon, authenticated using (active);

drop policy if exists "public read sizes of active products" on public.product_sizes;
create policy "public read sizes of active products" on public.product_sizes
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.slug = product_slug and p.active));

drop policy if exists "public read shipping" on public.shipping_rates;
create policy "public read shipping" on public.shipping_rates
  for select to anon, authenticated using (true);

-- الطلبات: لا سياسات = مغلقة تمامًا أمام المفتاح العام. يكتبها الخادم فقط (المفتاح السري يتجاوز RLS).
revoke all on public.orders, public.order_items from anon, authenticated;
revoke insert, update, delete on public.products, public.product_sizes, public.shipping_rates from anon, authenticated;

-- ---------- إنشاء طلب (ذرّي، والأسعار تُحسب هنا من الجداول لا من العميل) ----------
create or replace function public.create_order(
  p_name text, p_phone text, p_governorate text, p_address text, p_notes text,
  p_items jsonb, p_demo boolean default true, p_ip_hash text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_fee int; v_requested int; v_found int; v_sub int; v_lines jsonb; v_order public.orders;
begin
  select fee into v_fee from shipping_rates where governorate = p_governorate;
  if v_fee is null then raise exception 'invalid_governorate'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 20 then
    raise exception 'invalid_items';
  end if;

  -- تحديد الإزعاج: ٥ طلبات/ساعة لنفس الرقم، و١٠ طلبات/ساعة لنفس البصمة
  if (select count(*) from orders where phone = p_phone and created_at > now() - interval '1 hour') >= 5
     or (p_ip_hash is not null
         and (select count(*) from orders where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10) then
    raise exception 'rate_limited';
  end if;

  with req as (
    select e->>'slug' as slug, (e->>'ml')::int as ml, (e->>'qty')::int as qty
    from jsonb_array_elements(p_items) e
  ), agg as (
    select slug, ml, least(sum(qty), 10)::int as qty from req where qty >= 1 group by slug, ml
  ), priced as (
    select a.slug, p.name, a.ml, a.qty, s.price as unit, a.qty * s.price as total
    from agg a
    join products p      on p.slug = a.slug and p.active
    join product_sizes s on s.product_slug = a.slug and s.ml = a.ml
  )
  select (select count(*) from agg), count(*), coalesce(sum(total), 0),
         coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'name', name, 'ml', ml, 'qty', qty, 'unit', unit, 'total', total)
                            order by name, ml), '[]'::jsonb)
    into v_requested, v_found, v_sub, v_lines
  from priced;

  if v_found = 0 or v_found <> v_requested then raise exception 'invalid_items'; end if;

  insert into orders (customer_name, phone, governorate, address, notes, subtotal, shipping, total, demo, ip_hash)
  values (p_name, p_phone, p_governorate, p_address, coalesce(p_notes, ''), v_sub, v_fee, v_sub + v_fee, coalesce(p_demo, true), p_ip_hash)
  returning * into v_order;

  insert into order_items (order_id, product_slug, product_name, ml, qty, unit_price, line_total)
  select v_order.id, l->>'slug', l->>'name', (l->>'ml')::int, (l->>'qty')::int, (l->>'unit')::int, (l->>'total')::int
  from jsonb_array_elements(v_lines) l;

  return jsonb_build_object('order_no', v_order.order_no, 'number', v_order.number,
                            'lines', v_lines, 'subtotal', v_sub, 'shipping', v_fee, 'total', v_sub + v_fee);
end $$;

revoke all on function public.create_order(text,text,text,text,text,jsonb,boolean,text) from public, anon, authenticated;
grant execute on function public.create_order(text,text,text,text,text,jsonb,boolean,text) to service_role;

-- ---------- البيانات الأولية (من الموقع الحالي). لا تعيد كتابة أي تعديل تعمله لاحقًا ----------
insert into public.products (slug, name, house, concentration, tagline, color, season, featured, sort_order, notes) values
  ('tobacco-vanille', 'توباكو فانيل', 'توم فورد', 'edp', 'عطر الدفء... الفاخر الذي لا يُنسى', '#6b3a12', 'winter', true, 10, '{"top":["tb","gi","sp"],"heart":["ca","va","tf"],"base":["df","bz","wd"]}'::jsonb),
  ('black-afgano', 'بلاك أفغانو', 'ناسوماتو', 'extrait', 'عطر الظلام... أنت الأقوى', '#5a2a14', 'winter', true, 20, '{"top":["sf","gr","cn"],"heart":["co","tb","rs"],"base":["ou","ic","am"]}'::jsonb),
  ('dior-homme-intense', 'ديور هوم إنتنس', 'ديور', 'edp', 'عطر الرجولة الراقية', '#7a4a1c', 'winter', true, 30, '{"top":["lv","ir","pr"],"heart":["lt","cd","ab"],"base":["tk","mk","vt"]}'::jsonb),
  ('angels-share', 'أنجلز شير', 'كيليان', 'edp', 'عطر يشبهك... نادر وآسر', '#b7822a', 'winter', true, 40, '{"top":["cg","ci","hz"],"heart":["tk","oak","ja"],"base":["va","bz","sa"]}'::jsonb),
  ('stronger-with-you', 'ستروجر ويذ يو', 'إمبوريو أرماني', 'edp', 'عطر القوة... أنت الأقوى', '#8a4a14', 'winter', false, 50, '{"top":["card","pp","vi"],"heart":["sg","lv","tof"],"base":["va","cd","am"]}'::jsonb),
  ('stronger-with-you-parfum', 'ستروجر ويذ يو بارفان', 'إمبوريو أرماني', 'parfum', 'عطر قوي دافئ يجمع بين الرجولة والجاذبية', '#a2561a', 'winter', false, 60, '{"top":["be","pp"],"heart":["lv","sg"],"base":["va","ch","cd","tk"]}'::jsonb),
  ('oud-maracuja', 'عود ماراكوجا', 'ميزون كريفيلي', 'extrait', 'عطر فاخر فاكهي يجمع بين الفخامة والجاذبية', '#1d2f63', 'winter', true, 70, '{"top":["pf","be"],"heart":["sf","tr","pa"],"base":["ou","lt","am","bz"]}'::jsonb),
  ('le-male-elixir', 'لو مال إليكسير', 'جان بول غوتييه', 'edp', 'عطر شرقي فاكهي يجمع بين القوة والأناقة', '#b9791a', 'winter', true, 80, '{"top":["mn","lv","be"],"heart":["ci","car","lv"],"base":["va","am","ou"]}'::jsonb),
  ('sauvage-elixir', 'سوفاج إليكسير', 'ديور', 'edp', 'عطر القوة والجاذبية', '#2a3a58', 'winter', false, 90, '{"top":["pp","lv"],"heart":["lab","bp"],"base":["va","cd"]}'::jsonb),
  ('khamrah', 'خمرة', 'لطافة', 'edp', 'عطر الدفء والفخامة', '#8a7a5a', 'winter', false, 100, '{"top":["nm","be"],"heart":["pl"],"base":["am","bz"]}'::jsonb),
  ('oud-madawi', 'عود مضاوي', 'مضاوي', 'edp', 'عطر الأصالة والفخامة', '#7a6a4a', 'winter', false, 110, '{"top":["pi","ab2"],"heart":["wf","ou"],"base":["mk","pa"]}'::jsonb),
  ('y-edp', 'واي', 'إيف سان لوران', 'edp', 'عطر النجاح والثقة', '#3a3d44', 'summer', false, 120, '{"top":["ap","be","gi"],"heart":["sg","jb","ge"],"base":["am","om","cd"]}'::jsonb),
  ('imagination', 'إماجينيشن', 'لويس فويتون', 'edp', 'عطر يجسد الخيال وينقلك لعالم من النقاء والانتعاش', '#4f9a96', 'summer', false, 130, '{"top":["te","or","be"],"heart":["ne","ax","ob"],"base":["mk","am","sa"]}'::jsonb),
  ('platinum', 'بلاتينيوم', 'باكو رابان إنفيكتوس بلاتينيوم', 'edp', 'عطر مكثف ومنعش', '#9a9ea4', 'summer', false, 140, '{"top":["gf","mn"],"heart":["lv","wm"],"base":["cy","pa"]}'::jsonb),
  ('erba-pura', 'إربا بورا', 'زيرجوف', 'edp', '', '#c9893a', null, false, 150, '{"top":["or","le","be"],"heart":["tp","fr","wh"],"base":["mk","am","va"]}'::jsonb),
  ('megamare', 'ميجامار', 'أورتو باريزي', 'edp', '', '#2a5d7a', null, false, 160, '{"top":["al","le","be"],"heart":["mf","sl","io"],"base":["va","wd","mk"]}'::jsonb),
  ('acqua-di-gio', 'أكوا دي جيو', 'جورجيو أرماني', 'edp', '', '#4d7fa0', null, false, 170, '{"top":["or","le","be"],"heart":["ja","rm"],"base":["mk","pa","va"]}'::jsonb),
  ('bleu-de-chanel', 'بلو دي شانيل', 'شانيل', 'edp', '', '#1b2a4a', null, false, 180, '{"top":["le","mn","ro"],"heart":["gi","nm","ja"],"base":["cd","am","pa"]}'::jsonb),
  ('baccarat-rouge-540', 'باكارات روج 540', 'ميزون فرانسيس كوركدجيان', 'edp', '', '#b4442a', null, false, 190, '{"top":["sf","ja"],"heart":["am","cd"],"base":["mk"]}'::jsonb),
  ('l1212-white', 'لاكوست وايت', 'لاكوست', 'edp', '', '#7d8a86', null, false, 200, '{"top":["gf"],"heart":[],"base":["mk","am"]}'::jsonb),
  ('sauvage', 'سوفاج', 'ديور', 'edp', '', '#6b4a2a', null, false, 210, '{"top":["lv","pp","be"],"heart":["ge","cd","pe"],"base":["am","pa"]}'::jsonb)
on conflict (slug) do nothing;

insert into public.product_sizes (product_slug, ml, price) values
  ('tobacco-vanille', 30, 250),
  ('tobacco-vanille', 50, 350),
  ('tobacco-vanille', 100, 600),
  ('black-afgano', 30, 250),
  ('black-afgano', 50, 350),
  ('black-afgano', 100, 600),
  ('dior-homme-intense', 30, 250),
  ('dior-homme-intense', 50, 350),
  ('dior-homme-intense', 100, 600),
  ('angels-share', 30, 250),
  ('angels-share', 50, 350),
  ('angels-share', 100, 600),
  ('stronger-with-you', 30, 250),
  ('stronger-with-you', 50, 350),
  ('stronger-with-you', 100, 600),
  ('stronger-with-you-parfum', 30, 250),
  ('stronger-with-you-parfum', 50, 350),
  ('stronger-with-you-parfum', 100, 600),
  ('oud-maracuja', 30, 250),
  ('oud-maracuja', 50, 350),
  ('oud-maracuja', 100, 600),
  ('le-male-elixir', 30, 250),
  ('le-male-elixir', 50, 350),
  ('le-male-elixir', 100, 600),
  ('sauvage-elixir', 30, 250),
  ('sauvage-elixir', 50, 350),
  ('sauvage-elixir', 100, 600),
  ('khamrah', 30, 250),
  ('khamrah', 50, 350),
  ('khamrah', 100, 600),
  ('oud-madawi', 30, 250),
  ('oud-madawi', 50, 350),
  ('oud-madawi', 100, 600),
  ('y-edp', 30, 250),
  ('y-edp', 50, 350),
  ('y-edp', 100, 600),
  ('imagination', 30, 250),
  ('imagination', 50, 350),
  ('imagination', 100, 600),
  ('platinum', 30, 250),
  ('platinum', 50, 350),
  ('platinum', 100, 600),
  ('erba-pura', 30, 250),
  ('erba-pura', 50, 350),
  ('erba-pura', 100, 600),
  ('megamare', 30, 250),
  ('megamare', 50, 350),
  ('megamare', 100, 600),
  ('acqua-di-gio', 30, 250),
  ('acqua-di-gio', 50, 350),
  ('acqua-di-gio', 100, 600),
  ('bleu-de-chanel', 30, 250),
  ('bleu-de-chanel', 50, 350),
  ('bleu-de-chanel', 100, 600),
  ('baccarat-rouge-540', 30, 250),
  ('baccarat-rouge-540', 50, 350),
  ('baccarat-rouge-540', 100, 600),
  ('l1212-white', 30, 250),
  ('l1212-white', 50, 350),
  ('l1212-white', 100, 600),
  ('sauvage', 30, 250),
  ('sauvage', 50, 350),
  ('sauvage', 100, 600)
on conflict (product_slug, ml) do nothing;

insert into public.shipping_rates (governorate, tier_id, tier_label, fee) values
  ('أسوان', 1, 'أسوان', 40),
  ('الأقصر', 2, 'جنوب الصعيد والبحر الأحمر', 55),
  ('قنا', 2, 'جنوب الصعيد والبحر الأحمر', 55),
  ('البحر الأحمر', 2, 'جنوب الصعيد والبحر الأحمر', 55),
  ('سوهاج', 3, 'وسط الصعيد', 65),
  ('أسيوط', 3, 'وسط الصعيد', 65),
  ('الوادي الجديد', 3, 'وسط الصعيد', 65),
  ('المنيا', 4, 'شمال الصعيد', 75),
  ('بني سويف', 4, 'شمال الصعيد', 75),
  ('الفيوم', 4, 'شمال الصعيد', 75),
  ('القاهرة', 5, 'القاهرة الكبرى والقناة', 85),
  ('الجيزة', 5, 'القاهرة الكبرى والقناة', 85),
  ('القليوبية', 5, 'القاهرة الكبرى والقناة', 85),
  ('السويس', 5, 'القاهرة الكبرى والقناة', 85),
  ('الإسماعيلية', 5, 'القاهرة الكبرى والقناة', 85),
  ('المنوفية', 5, 'القاهرة الكبرى والقناة', 85),
  ('الشرقية', 6, 'الدلتا والإسكندرية', 95),
  ('الغربية', 6, 'الدلتا والإسكندرية', 95),
  ('الدقهلية', 6, 'الدلتا والإسكندرية', 95),
  ('الإسكندرية', 6, 'الدلتا والإسكندرية', 95),
  ('البحيرة', 6, 'الدلتا والإسكندرية', 95),
  ('بورسعيد', 6, 'الدلتا والإسكندرية', 95),
  ('كفر الشيخ', 6, 'الدلتا والإسكندرية', 95),
  ('دمياط', 6, 'الدلتا والإسكندرية', 95),
  ('مطروح', 7, 'الأطراف', 110),
  ('شمال سيناء', 7, 'الأطراف', 110),
  ('جنوب سيناء', 7, 'الأطراف', 110)
on conflict (governorate) do nothing;
