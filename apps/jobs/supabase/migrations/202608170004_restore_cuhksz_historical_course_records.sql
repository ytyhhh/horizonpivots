-- Restore three real legacy courses that shared IDs with retired demo rows.
-- They remain active so their imported historical reviews stay accessible.

insert into public.cuhksz_courses (
  id, code, name, name_en, school, instructor, term, tags, scores,
  rating, review_count, active, description, official_url
)
values
  ('cuhksz_course_eng1001', 'ENG1001', '基础英语', 'English Bridge Program (EBP)', '人文社科学院', '教师待补充', '历史评价（学期未注明）', array['历史评价'], '{}'::jsonb, null, 0, true, '官方当前课程目录未收录此历史课程。', ''),
  ('cuhksz_course_mat2040', 'MAT2040', '线性代数', 'Linear Algebra', '理工学院', '教师待补充', '历史评价（学期未注明）', array['历史评价'], '{}'::jsonb, null, 0, true, '官方当前课程目录未收录此历史课程。', ''),
  ('cuhksz_course_sta2001', 'STA2001', '概率及统计（一）', 'Probability and Statistics I', '数据科学学院', '教师待补充', '历史评价（学期未注明）', array['历史评价'], '{}'::jsonb, null, 0, true, '官方当前课程目录未收录此历史课程。', '')
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  school = excluded.school,
  term = excluded.term,
  tags = excluded.tags,
  description = excluded.description,
  official_url = excluded.official_url,
  active = true;

update public.cuhksz_courses as course
set review_count = counts.total
from (
  select target_id, count(*)::integer as total
  from public.cuhksz_reviews
  where target_type = 'course' and status = 'published'
  group by target_id
) as counts
where course.id = counts.target_id
  and course.id in (
    'cuhksz_course_eng1001',
    'cuhksz_course_mat2040',
    'cuhksz_course_sta2001'
  );
