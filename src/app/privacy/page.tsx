import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私说明",
};

export default function PrivacyPage() {
  return (
    <article className="page-shell max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
        隐私说明
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">
        校招雷达只收集提供推荐所必需的数据，并把简历原文件的保留时间降到最低。
      </p>
      <div className="mt-10 grid gap-8 text-sm leading-7 text-muted">
        <section>
          <h2 className="text-lg font-semibold text-foreground">简历处理</h2>
          <p className="mt-2">
            PDF 或 DOCX 仅用于提取学历、专业、毕业年份、技能、经历摘要和求职偏好。处理成功或失败后都会删除原文件。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">不会用于推荐的数据</h2>
          <p className="mt-2">
            姓名、电话、邮箱、照片、性别、年龄、民族和详细地址不会进入推荐画像，也不会参与岗位排序。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">你的控制权</h2>
          <p className="mt-2">
            你可以查看、修改或清除结构化画像。删除账号时，画像、收藏和推荐缓存会一并删除。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">招聘信息</h2>
          <p className="mt-2">
            网站只保存公开岗位的结构化字段、短摘要和原始链接，不镜像完整招聘页面。
          </p>
        </section>
      </div>
    </article>
  );
}
