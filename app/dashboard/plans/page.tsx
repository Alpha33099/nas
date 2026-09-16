import { sql } from "@/lib/db";
import { verifyCustomerToken } from "@/lib/auth";
import PlansClient from "./PlansClient";

export default async function BrowsePlansPage() {
  const customer = await verifyCustomerToken();
  const plans = await sql`
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
    ORDER BY is_highlighted DESC, data_amount_gb ASC
  `;

  return <PlansClient plans={plans as any} customerUsername={customer?.username || ""} />;
}