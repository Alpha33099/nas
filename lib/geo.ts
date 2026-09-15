export interface LocationInfo {
  ip: string;
  country: string;
  city: string;
  region: string;
  isp: string;
  latitude: string;
  longitude: string;
  coords: string; // "lat,lon"
}

/**
 * Extracts client IP from incoming request headers
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Parses user-agent header into a clean, human-readable device summary
 */
export function parseDeviceSummary(userAgent: string | null): string {
  if (!userAgent) return "Unknown Device";

  const ua = userAgent.toLowerCase();
  let os = "Unknown OS";
  let browser = "Browser";

  // OS Detection
  if (ua.includes("iphone")) os = "iPhone (iOS)";
  else if (ua.includes("ipad")) os = "iPad (iPadOS)";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("macintosh") || ua.includes("mac os")) os = "macOS";
  else if (ua.includes("windows")) os = "Windows PC";
  else if (ua.includes("linux")) os = "Linux";

  // Browser Detection
  if (ua.includes("chrome") && !ua.includes("edg") && !ua.includes("opr")) browser = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("instagram")) browser = "Instagram App";

  return `${os} · ${browser}`;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
  if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) return true;
  return false;
}

/**
 * Resolves full geolocation intelligence from headers and IP lookup
 */
export async function resolveLocation(headers: Headers): Promise<LocationInfo> {
  const ip = extractClientIp(headers);

  // 1. First check Vercel edge headers
  const vercelCountry = headers.get("x-vercel-ip-country");
  const vercelCity = headers.get("x-vercel-ip-city");
  const vercelRegion = headers.get("x-vercel-ip-country-region");
  const vercelLat = headers.get("x-vercel-ip-latitude");
  const vercelLon = headers.get("x-vercel-ip-longitude");

  if (vercelCountry && vercelCity) {
    const lat = vercelLat || "";
    const lon = vercelLon || "";
    const coords = lat && lon ? `${lat},${lon}` : "";

    return {
      ip,
      country: vercelCountry.toUpperCase(),
      city: decodeURIComponent(vercelCity),
      region: vercelRegion ? decodeURIComponent(vercelRegion) : "",
      isp: headers.get("x-vercel-ip-as-number") ? `AS${headers.get("x-vercel-ip-as-number")}` : "Mobile / Broadband",
      latitude: lat,
      longitude: lon,
      coords,
    };
  }

  // 2. Query fast IP geolocation API with 2.5 second timeout
  try {
    const isLocal = isPrivateOrLocalIp(ip);
    // If local/dev, query client-free endpoint for the machine's public exit IP
    const url = isLocal
      ? "https://freeipapi.com/api/json"
      : `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const resolvedIp = isLocal ? (data.ipAddress || ip) : ip;
      const country = data.countryName || data.countryCode || "Unknown";
      const city = data.cityName || "Unknown City";
      const region = data.regionName || "";
      const lat = data.latitude ? String(data.latitude) : "";
      const lon = data.longitude ? String(data.longitude) : "";
      const coords = lat && lon ? `${lat},${lon}` : "";

      return {
        ip: resolvedIp,
        country,
        city,
        region,
        isp: data.asnOrganization || data.isp || "Internet Service Provider",
        latitude: lat,
        longitude: lon,
        coords,
      };
    }
  } catch (err) {
    console.warn("IP Geolocation lookup failed or timed out:", err);
  }

  // 3. Fallback default
  return {
    ip,
    country: vercelCountry ? vercelCountry.toUpperCase() : "Unknown",
    city: vercelCity ? decodeURIComponent(vercelCity) : "Unknown",
    region: vercelRegion ? decodeURIComponent(vercelRegion) : "",
    isp: "Broadband Provider",
    latitude: vercelLat || "",
    longitude: vercelLon || "",
    coords: vercelLat && vercelLon ? `${vercelLat},${vercelLon}` : "",
  };
}
