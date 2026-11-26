-- Keep existing position criteria and historical scores intact while aligning
-- the Non-Teaching labels with the requested terminology.
update public.position_criteria as criterion
set title = desired.title
from public.positions as position
join public.application_type as application_type
  on application_type.id = position.application_type_id
cross join (
  values
    ('EDUCATION', 'Education'),
    ('TRAINING', 'Training'),
    ('EXPERIENCE', 'Experience'),
    ('PERFORMANCE', 'Performance'),
    ('ACCOMPLISHMENTS', 'Outstanding Accomplishments'),
    ('APPLICATION_OF_EDUCATION', 'Application of Education'),
    ('APPLICATION_OF_LEARNING', 'Application of Learning & Development (L&D)'),
    ('POTENTIAL', 'Potential')
) as desired(criterion_key, title)
where criterion.position_id = position.id
  and application_type.name = 'non-teaching'
  and criterion.criterion_key = desired.criterion_key;

-- Keep future Non-Teaching positions aligned with existing positions.
create or replace function public.seed_position_criteria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.position_criteria (
    position_id,
    criterion_key,
    title,
    display_order
  )
  select
    new.id,
    criterion.criterion_key,
    criterion.title,
    criterion.display_order
  from public.application_type
  cross join (
    values
      ('teaching', 'EDUCATION', 'Education', 1),
      ('teaching', 'TRAINING', 'Training', 2),
      ('teaching', 'EXPERIENCE', 'Experience', 3),
      ('teaching', 'PERFORMANCE', 'Performance', 4),
      ('teaching', 'CLASSROOM_OBSERVATION', 'Classroom Observation/Demo Teaching (PPST COIs)', 5),
      ('teaching', 'TEACHER_REFLECTION', 'Teacher Reflection Form (PPST NCOIs)', 6),
      ('non-teaching', 'EDUCATION', 'Education', 1),
      ('non-teaching', 'TRAINING', 'Training', 2),
      ('non-teaching', 'EXPERIENCE', 'Experience', 3),
      ('non-teaching', 'PERFORMANCE', 'Performance', 4),
      ('non-teaching', 'ACCOMPLISHMENTS', 'Outstanding Accomplishments', 5),
      ('non-teaching', 'APPLICATION_OF_EDUCATION', 'Application of Education', 6),
      ('non-teaching', 'APPLICATION_OF_LEARNING', 'Application of Learning & Development (L&D)', 7),
      ('non-teaching', 'POTENTIAL', 'Potential', 8)
  ) as criterion(application_type_name, criterion_key, title, display_order)
  where public.application_type.id = new.application_type_id
    and criterion.application_type_name = public.application_type.name;

  return new;
end;
$$;

revoke all on function public.seed_position_criteria()
  from public, anon, authenticated;
