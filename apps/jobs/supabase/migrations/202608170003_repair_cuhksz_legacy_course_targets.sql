-- Three imported legacy reviews used retired demo IDs. Point them at the
-- official course records without changing review content or ownership.

update public.cuhksz_reviews
set target_id = 'cuhksz_course_' || target_id
where author_id like 'legacy:%'
  and target_type = 'course'
  and target_id in ('eng1001', 'mat2040', 'sta2001');

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
