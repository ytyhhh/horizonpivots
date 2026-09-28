export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { code: "RESUME_PARSING_DISABLED", message: "简历解析功能已停用，请在画像页手动填写。" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
