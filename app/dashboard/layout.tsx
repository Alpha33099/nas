import { verifyCustomerToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import CustomerNav from "./CustomerNav";

export default async function CustomerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await verifyCustomerToken();

  if (!customer) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-teal-50/20 text-slate-900 selection:bg-teal-100">
      <CustomerNav username={customer.username} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}