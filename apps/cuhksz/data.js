window.CUHK_REVIEW_DATA = {
  courses: [
    { id: 'csc3100', code: 'CSC3100', name: '数据结构', nameEn: 'Data Structures', school: '数据科学学院', instructor: '陈老师', term: '2025–26 秋季', rating: 4.7, reviews: 86, tags: ['收获大', '硬核'], scores: { 推荐度: 4.8, 难度: 4.2, 给分: 4.3, 收获: 4.9, 工作量: 4.1 } },
    { id: 'mat2040', code: 'MAT2040', name: '线性代数', nameEn: 'Linear Algebra', school: '理工学院', instructor: '李老师', term: '2025–26 秋季', rating: 4.4, reviews: 54, tags: ['基础课', '逻辑清晰'], scores: { 推荐度: 4.5, 难度: 3.8, 给分: 4.1, 收获: 4.6, 工作量: 3.5 } },
    { id: 'eco2010', code: 'ECO2010', name: '微观经济学', nameEn: 'Microeconomics', school: '经管学院', instructor: '王老师', term: '2025–26 春季', rating: 4.3, reviews: 42, tags: ['讲解清楚'], scores: { 推荐度: 4.4, 难度: 3.6, 给分: 4.0, 收获: 4.5, 工作量: 3.7 } },
    { id: 'eng1001', code: 'ENG1001', name: '大学英语', nameEn: 'University English', school: '人文社科学院', instructor: '周老师', term: '2025–26 秋季', rating: 4.1, reviews: 39, tags: ['互动多', '展示'], scores: { 推荐度: 4.2, 难度: 2.8, 给分: 4.1, 收获: 4.0, 工作量: 3.2 } },
    { id: 'phy1002', code: 'PHY1002', name: '大学物理', nameEn: 'University Physics', school: '理工学院', instructor: '赵老师', term: '2025–26 春季', rating: 4.0, reviews: 63, tags: ['考试硬核'], scores: { 推荐度: 4.0, 难度: 4.5, 给分: 3.7, 收获: 4.4, 工作量: 4.3 } },
    { id: 'sta2001', code: 'STA2001', name: '概率与统计', nameEn: 'Probability and Statistics', school: '数据科学学院', instructor: '黄老师', term: '2025–26 秋季', rating: 4.6, reviews: 48, tags: ['实用', '节奏快'], scores: { 推荐度: 4.7, 难度: 4.0, 给分: 4.2, 收获: 4.8, 工作量: 3.9 } }
  ],
  halls: [
    { id: 'shaw', name: '逸夫食堂', location: '逸夫书院一楼', hours: '07:00–21:00', rating: 4.5, reviews: 128, stalls: 8, tone: 'purple' },
    { id: 'diligentia', name: '学勤食堂', location: '学勤书院生活区', hours: '07:00–20:30', rating: 4.3, reviews: 96, stalls: 7, tone: 'gold' },
    { id: 'muse', name: '思廷食堂', location: '思廷书院首层', hours: '07:30–20:30', rating: 4.2, reviews: 71, stalls: 6, tone: 'cream' }
  ],
  dishes: [
    { id: 'beef', hallId: 'shaw', name: '小炒黄牛肉', stall: '湘味小炒', hall: '逸夫食堂', price: 18, rating: 4.6, reviews: 35, tags: ['下饭', '微辣'], image: 'assets/campus-dining-hero.jpg', position: '76% 42%', scores: { 口味: 4.8, 价格: 4.2, 分量: 4.6 } },
    { id: 'tomato', hallId: 'shaw', name: '番茄牛腩饭', stall: '暖心炖饭', hall: '逸夫食堂', price: 16, rating: 4.5, reviews: 28, tags: ['分量足'], image: 'assets/campus-dining-hero.jpg', position: '60% 23%', scores: { 口味: 4.6, 价格: 4.4, 分量: 4.5 } },
    { id: 'chicken', hallId: 'diligentia', name: '鸡腿双拼饭', stall: '烧味档', hall: '学勤食堂', price: 15, rating: 4.4, reviews: 41, tags: ['性价比'], image: 'assets/campus-dining-hero.jpg', position: '58% 80%', scores: { 口味: 4.5, 价格: 4.7, 分量: 4.6 } },
    { id: 'noodles', hallId: 'muse', name: '酸汤肥牛面', stall: '粉面档', hall: '思廷食堂', price: 17, rating: 4.2, reviews: 22, tags: ['酸辣'], image: 'assets/campus-dining-hero.jpg', position: '70% 40%', scores: { 口味: 4.4, 价格: 4.0, 分量: 4.2 } }
  ],
  reviews: [
    { id: 'r1', type: 'course', targetId: 'csc3100', target: 'CSC3100 · 数据结构', context: '陈老师 · 2025–26 秋季', rating: 5, content: '讲解非常清楚，作业量不小，但每次作业都能帮助理解核心概念。建议提前复习线性代数。', date: '3 天前' },
    { id: 'r2', type: 'dish', targetId: 'beef', target: '小炒黄牛肉', context: '逸夫食堂 · 湘味小炒', rating: 5, content: '现点现做，牛肉很嫩，微辣刚好。十二点以后排队会比较长。', date: '昨天' },
    { id: 'r3', type: 'course', targetId: 'sta2001', target: 'STA2001 · 概率与统计', context: '黄老师 · 2025–26 秋季', rating: 4, content: '例子和实际数据结合得很好，节奏偏快，课后最好当天整理一次笔记。', date: '5 天前' }
  ]
}
