import { sql } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { notFound } from "next/navigation";
import CustomerDetail from "./CustomerDetail";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch customer
  const customers = await sql`
    SELECT id, username, display_name, last_login_at, created_at
    FROM customers WHERE id = ${id}
  `;

  if (customers.length === 0) {
    notFound();
  }

  const customer = customers[0];

  // Fetch all plans for this customer
  const plans = await sql`
    SELECT 
      cp.id, cp.total_gb, cp.used_gb, cp.start_date, cp.expiry_date,
      cp.status, cp.last_usage_update_at, cp.esim_id,
      pc.name as plan_name, pc.data_amount_gb as plan_data_gb
    FROM customer_plans cp
    JOIN plans_catalog pc ON cp.plan_catalog_id = pc.id
    WHERE cp.customer_id = ${id}
    ORDER BY cp.status ASC, cp.expiry_date ASC
  `;

  // Fetch linked eSIMs (decrypt server-side only)
  const esims = await sql`
    SELECT id, provider_name, provider_email_encrypted, provider_password_encrypted,
           activation_code, notes, status
    FROM esims
    WHERE assigned_customer_id = ${id}
  `;

  // Decrypt eSIM credentials server-side
  const decryptedEsims = esims.map((esim) => {
    try {
      return {
        id: esim.id,
        provider_name: esim.provider_name,
        provider_email: decrypt(esim.provider_email_encrypted),
        provider_password: decrypt(esim.provider_password_encrypted),
        activation_code: esim.activation_code,
        notes: esim.notes,
        status: esim.status,
      };
    } catch {
      return {
        id: esim.id,
        provider_name: esim.provider_name,
        provider_email: "[decryption error]",
        provider_password: "[decryption error]",
        activation_code: esim.activation_code,
        notes: esim.notes,
        status: esim.status,
      };
    }
  });

  // Fetch plan catalog for "Add Plan" dropdown
  const planCatalog = await sql`
    SELECT id, name, data_amount_gb, price, validity_days
    FROM plans_catalog
    ORDER BY data_amount_gb ASC
  `;

  return (
    <div>
      <CustomerDetail
        customer={customer as any}
        plans={plans as any}
        esims={decryptedEsims as any}
        planCatalog={planCatalog as any}
      />
    </div>
  );
}