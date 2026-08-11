import { isAdmin } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-dashboard";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ message: "Forbidden" }, { status: 403 });
  try {
    return Response.json(await getAdminDashboardData());
  } catch (error) {
    return Response.json(
      { message: error instanceof Error ? error.message : "Unable to load dashboard" },
      { status: 500 },
    );
  }
}

