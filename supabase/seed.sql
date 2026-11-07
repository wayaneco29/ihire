insert into public.document_types (name, is_required)
values
  ('Transcript of Records', true),
  ('Diploma or Certificate of Graduation', true),
  ('Eligibility or Professional License Certificate', false),
  ('Certificate of Employment or Service Record', false),
  ('Training and Seminar Certificates', false),
  ('Other Supporting Document', false)
on conflict (name) do update
set is_required = excluded.is_required;
