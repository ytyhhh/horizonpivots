import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私说明",
  description: "了解校招雷达如何处理手动填写的求职画像、收藏与公开招聘信息。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article className="page-shell max-w-3xl pb-12 pt-8 sm:pt-12">
      <p className="eyebrow">Privacy first</p>
      <h1 className="utility-title mt-5">
        隐私说明
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">
        校招雷达允许你手动填写结构化求职画像，不再接收简历文件。
      </p>
      <div className="mt-10 grid gap-px overflow-hidden rounded-[1.2rem] bg-border/70 text-sm leading-7 text-muted">
        <section className="bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">求职画像</h2>
          <p className="mt-2">
            目前只支持手动填写学历、专业、毕业年份、学校、工作与项目经历、技能、语言能力和证书；不提供 PDF 或 DOCX 上传与解析。既有画像仍可查看、修改或清除。
          </p>
        </section>
        <section className="bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">不会用于推荐的数据</h2>
          <p className="mt-2">
            姓名、电话、邮箱、照片、性别、年龄、民族和详细地址不会进入推荐画像，也不会参与岗位排序。
          </p>
        </section>
        <section className="bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">你的控制权</h2>
          <p className="mt-2">
            你可以手动填写教育、工作、项目、语言能力、证书与求职偏好，保存为草稿，或确认后用于推荐；也可以随时查看、修改或清除画像。清除画像不会删除收藏岗位。
          </p>
        </section>
        <section className="bg-surface p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-foreground">招聘信息</h2>
          <p className="mt-2">
            网站只保存公开岗位的结构化字段、短摘要和原始链接，不镜像完整招聘页面。
          </p>
        </section>
      </div>
    </article>
  );
}
