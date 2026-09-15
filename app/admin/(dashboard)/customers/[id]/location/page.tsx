import { sql } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function CustomerLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch customer location intelligence
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

  // Fetch session history logs
  const loginLogs = await sql`
    SELECT id, ip_address, country, city, region, locality, isp, latitude, longitude, accuracy, source, device_summary, is_first_login, created_at
    FROM customer_login_logs
    WHERE customer_id = ${id}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  const activeCoords = customer.last_login_coords || customer.first_login_coords;
  const isShift = customer.first_login_country && customer.last_login_country && customer.first_login_country !== customer.last_login_country;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Breadcrumb Header ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
        <Link
          href={`/admin/customers/${customer.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to {customer.display_name}&apos;s Plans & Usage</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Location & Anti-Fraud Intelligence
              </h1>
              {isShift ? (
                <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                  ⚠️ Location Shift Detected
                </span>
              ) : customer.first_login_country ? (
                <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Location Consistent
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live physical GPS coordinates, ISP routing, device footprint & login audit trail for{" "}
              <strong className="text-slate-800">@{customer.username}</strong>
            </p>
          </div>

          {activeCoords && (
            <a
              href={`https://www.google.com/maps?q=${activeCoords}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-teal-600/20 shrink-0 self-start sm:self-auto"
            >
              <span>View Pin on Google Maps</span>
              <span>↗</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Interactive Map Embed (if coords available) ─────────── */}
      {activeCoords && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🗺️</span>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Active Location Map Preview
              </h2>
            </div>
            <span className="font-mono text-2xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {activeCoords}
            </span>
          </div>
          <div className="w-full h-64 sm:h-80 bg-slate-100 relative">
            <iframe
              title="Location Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://maps.google.com/maps?q=${activeCoords}&hl=en&z=14&output=embed`}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* ── 2-Column Comparison: First Login vs Latest Login ────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* First Login (Origin Anchor) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              1st Login (Account Origin)
            </span>
            <div className="flex items-center gap-1.5">
              {customer.first_login_source === "GPS" ? (
                <span className="text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  🎯 Live Device GPS
                </span>
              ) : customer.first_login_at ? (
                <span className="text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                  🌐 IP Geolocation
                </span>
              ) : null}
              <span className="text-2xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                Permanent Anchor
              </span>
            </div>
          </div>

          {customer.first_login_at ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400">Location:</span>
                <span className="font-bold text-slate-900 text-right">
                  📍 {customer.first_login_locality ? `${customer.first_login_locality}, ` : ""}
                  {customer.first_login_city || "Unknown City"}, {customer.first_login_country || "Unknown Country"}
                </span>
              </div>
              {customer.first_login_region && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">State / Region:</span>
                  <span className="font-medium text-slate-700">{customer.first_login_region}</span>
                </div>
              )}
              {customer.first_login_accuracy && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Fix Precision:</span>
                  <span className={`font-semibold ${customer.first_login_source === "GPS" ? "text-emerald-700 font-mono" : "text-slate-600"}`}>
                    {customer.first_login_accuracy}
                  </span>
                </div>
              )}
              {customer.first_login_coords && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <a
                    href={`https://www.google.com/maps?q=${customer.first_login_coords}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>{customer.first_login_coords}</span>
                    <span className="text-2xs">↗</span>
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">IP Address:</span>
                <span className="font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {customer.first_login_ip || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Carrier / ISP:</span>
                <span className="font-medium text-slate-700 text-right truncate max-w-[200px]" title={customer.first_login_isp || ""}>
                  {customer.first_login_isp || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Device Footprint:</span>
                <span className="font-medium text-slate-700">{customer.first_login_device || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-2xs text-slate-400">
                <span>Origin Anchor Timestamp:</span>
                <span>{new Date(customer.first_login_at).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <span>Customer has not logged in yet. Location will anchor upon first login.</span>
            </div>
          )}
        </div>

        {/* Latest Login (Active Session) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Latest Login Session
            </span>
            <div className="flex items-center gap-1.5">
              {customer.last_login_source === "GPS" ? (
                <span className="text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                  🎯 Live Device GPS
                </span>
              ) : customer.last_login_at ? (
                <span className="text-2xs font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                  🌐 IP Geolocation
                </span>
              ) : null}
              <span className="text-2xs font-medium bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md">
                Active Session
              </span>
            </div>
          </div>

          {customer.last_login_at ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-400">Location:</span>
                <span className="font-bold text-slate-900 text-right">
                  📍 {customer.last_login_locality ? `${customer.last_login_locality}, ` : ""}
                  {customer.last_login_city || "Unknown City"}, {customer.last_login_country || "Unknown Country"}
                </span>
              </div>
              {customer.last_login_region && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">State / Region:</span>
                  <span className="font-medium text-slate-700">{customer.last_login_region}</span>
                </div>
              )}
              {customer.last_login_accuracy && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Fix Precision:</span>
                  <span className={`font-semibold ${customer.last_login_source === "GPS" ? "text-emerald-700 font-mono" : "text-slate-600"}`}>
                    {customer.last_login_accuracy}
                  </span>
                </div>
              )}
              {customer.last_login_coords && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <a
                    href={`https://www.google.com/maps?q=${customer.last_login_coords}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>{customer.last_login_coords}</span>
                    <span className="text-2xs">↗</span>
                  </a>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">IP Address:</span>
                <span className="font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  {customer.last_login_ip || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Carrier / ISP:</span>
                <span className="font-medium text-slate-700 text-right truncate max-w-[200px]" title={customer.last_login_isp || ""}>
                  {customer.last_login_isp || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Device Footprint:</span>
                <span className="font-medium text-slate-700">{customer.last_login_device || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-2xs text-slate-400">
                <span>Active Session Timestamp:</span>
                <span>{new Date(customer.last_login_at).toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              <span>No active login recorded yet.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Session History Audit Log Table ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Session History Audit Trail</h3>
            <p className="text-2xs text-slate-400">Complete log of all customer connection sessions</p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            {loginLogs.length} Records
          </span>
        </div>

        {loginLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <span>No session logs recorded yet.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-2xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Timestamp</th>
                  <th className="px-3 py-2.5">Source / Accuracy</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">IP Address</th>
                  <th className="px-3 py-2.5">Device</th>
                  <th className="px-3 py-2.5">Carrier / ISP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {loginLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                      {log.is_first_login && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase bg-teal-50 text-teal-700 border border-teal-200 px-1 py-0.2 rounded">
                          First
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {log.source === "GPS" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px]">
                          <span>🎯 GPS</span>
                          {log.accuracy && <span className="font-mono text-[9px]">({log.accuracy.split(" ")[0]})</span>}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                          🌐 IP
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {log.latitude && log.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-900 hover:text-teal-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>📍 {log.locality ? `${log.locality}, ` : ""}{log.city || "Unknown"}, {log.country || ""}</span>
                          <span className="text-teal-500 text-[10px]">↗</span>
                        </a>
                      ) : (
                        <span>📍 {log.locality ? `${log.locality}, ` : ""}{log.city || "Unknown"}, {log.country || ""}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-teal-700 whitespace-nowrap">
                      {log.ip_address}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">
                      {log.device_summary || "Unknown"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 truncate max-w-[140px]">
                      {log.isp || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Extensible Container for Future Intelligence Metrics ── */}
      <div className="bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 p-6 text-center shadow-2xs">
        <div className="max-w-md mx-auto space-y-1.5">
          <span className="text-xl">🛡️</span>
          <h4 className="text-xs font-bold text-slate-800">Advanced Security & Fraud Intelligence</h4>
          <p className="text-2xs text-slate-500">
            This route is ready for additional anti-fraud metrics (IP Risk Score, VPN/Proxy Detection, SIM swap detection, and Device Fingerprinting).
          </p>
        </div>
      </div>
    </div>
  );
}
