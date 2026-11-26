create table public.application_special_orders (
  application_id uuid primary key references public.applications(id) on delete cascade,
  applicant_name text not null check (length(btrim(applicant_name)) > 0),
  position text not null check (length(btrim(position)) between 1 and 160),
  designation text not null check (length(btrim(designation)) between 1 and 300),
  order_number text not null default '' check (length(order_number) <= 80),
  order_date date not null,
  updated_at timestamptz not null default now()
);
alter table public.application_special_orders enable row level security;
revoke all on public.application_special_orders from anon, authenticated;
grant select, insert, update on public.application_special_orders to authenticated;

create policy special_orders_read on public.application_special_orders
for select to authenticated using (
  (select private.is_role('SDS'::public.user_role))
  or exists (
    select 1 from public.applications a join public.applicants owner on owner.id = a.applicant_id
    where a.id = application_id and a.status = 'HIRED' and owner.profile_id = (select auth.uid())
  )
);
create policy special_orders_insert on public.application_special_orders
for insert to authenticated with check (
  (select private.is_role('SDS'::public.user_role))
  and exists (select 1 from public.v_staff_application_reviews a
    where a.application_id = application_special_orders.application_id and a.application_status = 'HIRED')
);
create policy special_orders_update on public.application_special_orders
for update to authenticated using ((select private.is_role('SDS'::public.user_role)))
with check (
  (select private.is_role('SDS'::public.user_role))
  and exists (select 1 from public.v_staff_application_reviews a
    where a.application_id = application_special_orders.application_id and a.application_status = 'HIRED')
);
