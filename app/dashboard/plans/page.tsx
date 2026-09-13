import { sql } from "@/lib/db";
import PlansClient from "./PlansClient";

export default async function BrowsePlansPage() {
  const plans = await sql`
    SELECT id, name, data_amount_gb, price, validity_days, description, instagram_message
    FROM plans_catalog
    ORDER BY data_amount_gb ASC
  `;

  return <PlansClient plans={plans as any} />;
}