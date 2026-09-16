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

  // Fetch customer with location intelligence
  const customers = await sql`
    SELECT 
      id, username, display_name, last_login_at, created_at,
      first_login_at, first_login_ip, first_login_city, first_login_region,
      first_login_country, first_login_isp, first_login_coords, first_login_device,
      first_login_locality, first_login_accuracy, first_login_source,
      last_login_ip, last_login_city, last_login_region,
      last_login_country, last_login_isp, last_login_coords, last_login_device,
      last_login_locality, last_login_accuracy, last_login_source
    FROM customers WHERE id = ${id}
  `;

  if (customers.length === 0) {
    notFound();
  }

  const customer = customers[0];

  // Fetch all plans for this customer
  const plans = await sql`
    SELECT 
      cp.id, cp.total_gb, cp.used_gb, cp.manual_used_gb, cp.manual_updated_at,
      cp.daily_burn_rate, cp.start_date, cp.expiry_date,
      cp.status, cp.last_usage_update_at, cp.created_at, cp.esim_id,
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

  // Fetch available eSIMs for "Add Plan" allocation
  const availableEsims = await sql`
    SELECT id, provider_name, activation_code
    FROM esims
    WHERE status = 'available'
    ORDER BY created_at DESC
  `;

  // Fetch recent login logs for anti-fraud analysis
  const loginLogs = await sql`
    SELECT id, ip_address, country, city, region, locality, isp, latitude, longitude, accuracy, source, device_summary, is_first_login, created_at
    FROM customer_login_logs
    WHERE customer_id = ${id}
    ORDER BY created_at DESC
    LIMIT 8
  `;

  return (
    <div>
      <CustomerDetail
        customer={customer as any}
        plans={plans as any}
        esims={decryptedEsims as any}
        availableEsims={availableEsims as any}
        planCatalog={planCatalog as any}
        loginLogs={loginLogs as any}
      />
    </div>
  );
}