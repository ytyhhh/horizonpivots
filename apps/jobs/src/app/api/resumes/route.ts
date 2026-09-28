// Keep the old endpoint explicit for clients with a cached upload form.
// No request body is read or forwarded to Storage or a parsing provider.
export async function POST() {
  return Response.json(
    { code: "RESUME_UPLOAD_DISABLED", message: "简历上传与解析已停用，请在画像页手动填写。" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
