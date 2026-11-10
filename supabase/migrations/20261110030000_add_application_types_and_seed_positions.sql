create table public.application_type (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('teaching', 'non-teaching'))
);

alter table public.application_type enable row level security;

revoke all on public.application_type from anon, authenticated;
grant select on public.application_type to authenticated;

create policy application_type_read_authenticated
on public.application_type for select to authenticated
using (true);

insert into public.application_type (name)
values ('teaching'), ('non-teaching')
on conflict (name) do nothing;

alter table public.positions
  alter column created_by drop not null,
  add column application_type_id uuid;

update public.positions as position
set application_type_id = application_type.id
from public.application_type
where application_type.name = case position.track
  when 'TEACHING' then 'teaching'
  when 'NON_TEACHING' then 'non-teaching'
end;

alter table public.positions
  alter column application_type_id set not null,
  add constraint positions_application_type_id_fkey
    foreign key (application_type_id)
    references public.application_type (id)
    on delete restrict;

create index positions_application_type_id_idx
  on public.positions (application_type_id);

insert into public.positions (track, title, application_type_id, created_by)
select 'TEACHING', seed.title, application_type.id, null
from (
  values
    ('Teacher I'),
    ('Teacher II'),
    ('Teacher III'),
    ('Teacher IV'),
    ('Teacher V'),
    ('Teacher VI'),
    ('Teacher VII'),
    ('Master Teacher I'),
    ('Master Teacher II'),
    ('Master Teacher III'),
    ('Master Teacher IV'),
    ('Master Teacher V')
) as seed(title)
join public.application_type
  on application_type.name = 'teaching'
on conflict (track, title) do nothing;
