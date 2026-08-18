-- Add the official CUHK-Shenzhen dining directory. Ratings remain null until
-- there are real reviews, so unreviewed venues are never represented as zero-star.

alter table public.cuhksz_dining_halls
  add column if not exists name_en text not null default '',
  add column if not exists description text not null default '';

alter table public.cuhksz_dining_halls
  alter column rating drop not null,
  alter column rating drop default;

update public.cuhksz_dining_halls
set rating = null
where review_count = 0
  and rating = 0;

insert into public.cuhksz_dining_halls (
  id, name, name_en, location, hours, stall_count, rating, review_count, tone, description, active
) values
  ('serenity-lodge', '悠然居', 'Serenity Lodge', '学生活动中心一楼，荷花池及国旗连廊旁', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30', 13, null, 0, 'purple', '美食广场形式，汇集手工早点、小碗菜、烧腊、地方菜、粉面和水果茶饮等档口。', true),
  ('lotus-pavilion', '尚荷轩', 'Lotus Pavilion', '学生活动中心二楼', '中餐 11:00-13:30；晚餐 17:00-19:30', 0, null, 0, 'cream', '以湘赣风味为主，供应盖码饭、牛肉饭、铁板炒饭粉、韩式拌饭和重庆小面。', true),
  ('shaw-college-canteen', '逸帆风顺', 'Shaw College Canteen', '逸夫书院 B 座二楼，学生中心站步行约 100 米', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30', 0, null, 0, 'gold', '主打西北面食，提供现包水饺、包点、陕西风味小吃、面条及健康餐。', true),
  ('lakeview-terrace', '望湖楼', 'Lakeview Terrace', '会议楼 I 一楼，礼文堂楼下，近大运体育馆与天鹅湖', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30', 0, null, 0, 'cream', '以特色档口为主，提供糖水、面食、拌粉、手工水饺和现煎西式扒餐。', true),
  ('luna-marina', '海月廷', 'Luna Marina', '上园思廷书院 C 栋一楼', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30；宵夜 18:00-24:00', 10, null, 0, 'purple', '粤式风味餐厅，提供烧腊、笼仔面、云贵米线、烤面包、煎饼果子及焗饭。', true),
  ('duan-family-canteen', '东南西北风', 'Duan Family College', '永平书院负一层中庭广场旁', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30', 0, null, 0, 'gold', '东南亚风味为主，设有小碗菜、粤式现炒、健康轻食、粉面及水吧饮品。', true),
  ('haroma-cafeteria', '香波餐厅', 'Haroma Cafeteria', '祥波书院食堂，书院站附近', '中餐 11:00-13:30；晚餐 17:00-19:30', 6, null, 0, 'cream', '以美食快闪为主，集合牛肉粿条、肉夹馍、水煮、卤味、烘焙与茶饮档口。', true),
  ('mus-canteen', '音乐学院食堂', 'MUS Canteen', '中园音乐学院育人楼一楼', '早餐 07:00-09:30；中餐 11:00-13:30；晚餐 17:00-19:30', 0, null, 0, 'purple', '音乐主题大众食堂，供应小碗菜、湘式快炒、小锅煮、粉面麻辣烫和西式套餐。', true),
  ('le-stelle', '星想·地中海餐厅', 'Le Stelle', '教学楼 A 栋下首层', '午餐 11:30-14:30；晚餐 17:30-20:30', 0, null, 0, 'gold', '地中海风味餐厅，提供前菜、沙拉、主菜、牛扒、意大利面和披萨。', true),
  ('coli-lofty', '骊轩茶餐厅', 'THE COLI LOFTY', '会议楼 I 一楼，礼文堂楼下', '每日 10:00-21:00', 0, null, 0, 'cream', '港式茶餐厅，供应精品点心、小炒、三文治、小吃、粉面、港式饮品和炖汤。', true),
  ('mcdonalds', '麦当劳', 'McDonald''s', '上园学勤书院 B 栋下首层', '每日 07:00-21:30', 0, null, 0, 'purple', '提供汉堡、炸鸡等快餐选择。', true),
  ('lacesar-pizzaria', '乐凯撒披萨', 'Lacesar Pizzaria', '上园学勤书院 B 栋下首层，与麦当劳共享公共空间', '每日 07:00-24:00', 0, null, 0, 'gold', '提供披萨与烤鸡等餐品。', true)
on conflict (id) do update
set name = excluded.name,
    name_en = excluded.name_en,
    location = excluded.location,
    hours = excluded.hours,
    stall_count = excluded.stall_count,
    tone = excluded.tone,
    description = excluded.description,
    active = excluded.active;
