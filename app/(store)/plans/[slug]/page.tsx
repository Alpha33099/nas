import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PlanDetailView } from "./PlanDetailView";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const plans = await sql`SELECT id, name FROM plans_catalog WHERE is_active IS NOT FALSE`;
    return plans.map((p: any) => ({
      slug: p.name ? p.name.toLowerCase().replace(/\s+/g, "-") : p.id,
    }));
  } catch {
    return [];
  }
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let plans: any[] = [];
  try {
    plans = await sql`
      SELECT 
        id, 
        name, 
        data_amount_gb, 
        price, 
        validity_days, 
        description, 
        instagram_message, 
        is_highlighted, 
        is_on_sale, 
        sale_price, 
        badge_text
      FROM plans_catalog
      WHERE is_active IS NOT FALSE
    `;
  } catch (err) {
    console.error("Failed to query plans:", err);
  }

  const normalized = decodeURIComponent(slug).toLowerCase().trim();
  const plan = plans.find(
    (p) =>
      p.id.toLowerCase() === normalized ||
      p.name.toLowerCase() === normalized ||
      p.name.toLowerCase().replace(/\s+/g, "-") === normalized ||
      p.name.toLowerCase().replace(/\s+/g, "") === normalized ||
      `${parseFloat(p.data_amount_gb)}gb`.toLowerCase() === normalized
  );

  if (!plan) return notFound();

  return <PlanDetailView plan={plan} />;
}
