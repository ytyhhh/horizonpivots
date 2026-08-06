import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAdminDashboardData } from "@/lib/admin-dashboard";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "数据状态" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/");
  const data = await getAdminDashboardData();
  return <AdminDashboard data={data} />;
}

