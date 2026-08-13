-- 可选：先执行 schema.sql，再执行本文件载入网页目前的演示目录。
insert into public.cuhksz_courses (id, code, name, name_en, school, instructor, term, tags, scores, rating, review_count)
values
  ('csc3100', 'CSC3100', '数据结构', 'Data Structures', '数据科学学院', '陈老师', '2025–26 秋季', array['收获大','硬核'], '{"推荐度":4.8,"难度":4.2,"给分":4.3,"收获":4.9,"工作量":4.1}', 4.7, 86),
  ('mat2040', 'MAT2040', '线性代数', 'Linear Algebra', '理工学院', '李老师', '2025–26 秋季', array['基础课','逻辑清晰'], '{"推荐度":4.5,"难度":3.8,"给分":4.1,"收获":4.6,"工作量":3.5}', 4.4, 54),
  ('eco2010', 'ECO2010', '微观经济学', 'Microeconomics', '经管学院', '王老师', '2025–26 春季', array['讲解清楚'], '{"推荐度":4.4,"难度":3.6,"给分":4.0,"收获":4.5,"工作量":3.7}', 4.3, 42),
  ('eng1001', 'ENG1001', '大学英语', 'University English', '人文社科学院', '周老师', '2025–26 秋季', array['互动多','展示'], '{"推荐度":4.2,"难度":2.8,"给分":4.1,"收获":4.0,"工作量":3.2}', 4.1, 39),
  ('phy1002', 'PHY1002', '大学物理', 'University Physics', '理工学院', '赵老师', '2025–26 春季', array['考试硬核'], '{"推荐度":4.0,"难度":4.5,"给分":3.7,"收获":4.4,"工作量":4.3}', 4.0, 63),
  ('sta2001', 'STA2001', '概率与统计', 'Probability and Statistics', '数据科学学院', '黄老师', '2025–26 秋季', array['实用','节奏快'], '{"推荐度":4.7,"难度":4.0,"给分":4.2,"收获":4.8,"工作量":3.9}', 4.6, 48)
on conflict (id) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  school = excluded.school,
  instructor = excluded.instructor,
  term = excluded.term,
  tags = excluded.tags,
  scores = excluded.scores,
  rating = excluded.rating,
  review_count = excluded.review_count;

insert into public.cuhksz_dining_halls (id, name, location, hours, stall_count, rating, review_count, tone)
values
  ('shaw', '逸夫食堂', '逸夫书院一楼', '07:00–21:00', 8, 4.5, 128, 'purple'),
  ('diligentia', '学勤食堂', '学勤书院生活区', '07:00–20:30', 7, 4.3, 96, 'gold'),
  ('muse', '思廷食堂', '思廷书院首层', '07:30–20:30', 6, 4.2, 71, 'cream')
on conflict (id) do update set
  location = excluded.location,
  hours = excluded.hours,
  stall_count = excluded.stall_count,
  rating = excluded.rating,
  review_count = excluded.review_count,
  tone = excluded.tone;

insert into public.cuhksz_dishes (id, hall_id, name, stall, hall, price, tags, image, position, scores, rating, review_count)
values
  ('beef', 'shaw', '小炒黄牛肉', '湘味小炒', '逸夫食堂', 18, array['下饭','微辣'], 'assets/campus-dining-hero.jpg', '76% 42%', '{"口味":4.8,"价格":4.2,"分量":4.6}', 4.6, 35),
  ('tomato', 'shaw', '番茄牛腩饭', '暖心炖饭', '逸夫食堂', 16, array['分量足'], 'assets/campus-dining-hero.jpg', '60% 23%', '{"口味":4.6,"价格":4.4,"分量":4.5}', 4.5, 28),
  ('chicken', 'diligentia', '鸡腿双拼饭', '烧味档', '学勤食堂', 15, array['性价比'], 'assets/campus-dining-hero.jpg', '58% 80%', '{"口味":4.5,"价格":4.7,"分量":4.6}', 4.4, 41),
  ('noodles', 'muse', '酸汤肥牛面', '粉面档', '思廷食堂', 17, array['酸辣'], 'assets/campus-dining-hero.jpg', '70% 40%', '{"口味":4.4,"价格":4.0,"分量":4.2}', 4.2, 22)
on conflict (id) do update set
  hall_id = excluded.hall_id,
  stall = excluded.stall,
  hall = excluded.hall,
  price = excluded.price,
  tags = excluded.tags,
  image = excluded.image,
  position = excluded.position,
  scores = excluded.scores,
  rating = excluded.rating,
  review_count = excluded.review_count;

insert into public.cuhksz_reviews (id, author_id, target_type, target_id, target, context, rating, content, status)
values
  ('00000000-0000-4000-8000-000000000001', 'seed-public', 'course', 'csc3100', 'CSC3100 · 数据结构', '陈老师 · 2025–26 秋季', 5, '讲解非常清楚，作业量不小，但每次作业都能帮助理解核心概念。建议提前复习线性代数。', 'published'),
  ('00000000-0000-4000-8000-000000000002', 'seed-public', 'dish', 'beef', '小炒黄牛肉', '逸夫食堂 · 湘味小炒', 5, '现点现做，牛肉很嫩，微辣刚好。十二点以后排队会比较长。', 'published'),
  ('00000000-0000-4000-8000-000000000003', 'seed-public', 'course', 'sta2001', 'STA2001 · 概率与统计', '黄老师 · 2025–26 秋季', 4, '例子和实际数据结合得很好，节奏偏快，课后最好当天整理一次笔记。', 'published')
on conflict (id) do update set
  target = excluded.target,
  context = excluded.context,
  rating = excluded.rating,
  content = excluded.content,
  status = excluded.status;
