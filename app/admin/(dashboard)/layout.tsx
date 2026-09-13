import { verifyAdminToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminNav from "./AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verify the admin is logged in (server-side check)
  const admin = await verifyAdminToken();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 relative selection:bg-teal-500 selection:text-white">
      {/* Subtle top ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-teal-100/40 via-slate-100/20 to-transparent blur-3xl rounded-full" />
      </div>

      <AdminNav username={admin.username} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}