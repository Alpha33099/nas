export interface LocationInfo {
  ip: string;
  country: string;
  city: string;
  region: string;
  locality?: string;
  isp: string;
  latitude: string;
  longitude: string;
  coords: string; // "lat,lon"
  accuracy?: string;
  source: "GPS" | "IP";
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
 * Reverse-geocodes exact hardware GPS coordinates into real-world town, city, and street
 */
/**
 * Reverse-geocodes exact hardware GPS coordinates into real-world town, city, and street
 */
export async function reverseGeocodeGps(
  lat: number,
  lon: number,
  accuracy?: number
): Promise<{ country: string; city: string; region: string; locality: string }> {
  // 1. Try OpenStreetMap Nominatim for exact street & neighborhood
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=en`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "Simvaya-Dashboard/1.0" },
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const streetPart = addr.road || addr.pedestrian || addr.street || "";
      const districtPart = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || "";
      const cityPart = addr.city || addr.town || addr.village || addr.county || "Unknown City";
      const localityStr = streetPart && districtPart 
        ? `${streetPart}, ${districtPart}` 
        : (streetPart || districtPart || addr.subdistrict || "");

      return {
        country: addr.country || "Unknown",
        city: cityPart,
        region: addr.state || addr.province || "",
        locality: localityStr,
      };
    }
  } catch (err) {
    console.warn("Nominatim reverse geocode error:", err);
  }

  // 2. Fallback to BigDataCloud
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        country: data.countryName || data.countryCode || "Unknown",
        city: data.city || data.locality || "Unknown City",
        region: data.principalSubdivision || "",
        locality: data.locality || "",
      };
    }
  } catch (err) {
    console.warn("BigDataCloud reverse geocode error:", err);
  }

  return {
    country: "Unknown",
    city: "Unknown City",
    region: "",
    locality: "",
  };
}

/**
 * Resolves full geolocation intelligence.
 * If live hardware GPS coordinates are passed, uses exact GPS data.
 * Otherwise falls back to IP-based estimation.
 */
export async function resolveLocation(
  headers: Headers,
  gpsData?: { lat: number; lon: number; accuracy?: number } | null
): Promise<LocationInfo> {
  const ip = extractClientIp(headers);

  // 1. If exact hardware GPS coordinates are available from the customer's device
  if (gpsData && typeof gpsData.lat === "number" && typeof gpsData.lon === "number" && !isNaN(gpsData.lat)) {
    const geo = await reverseGeocodeGps(gpsData.lat, gpsData.lon, gpsData.accuracy);
    const latStr = gpsData.lat.toFixed(6);
    const lonStr = gpsData.lon.toFixed(6);
    const accuracyStr = gpsData.accuracy ? `±${Math.round(gpsData.accuracy)}m` : "High Accuracy";

    // Also get ISP from headers or IP lookup
    let ispName = "Mobile / Broadband Carrier";
    try {
      const isLocal = isPrivateOrLocalIp(ip);
      const url = isLocal
        ? "https://freeipapi.com/api/json"
        : `https://freeipapi.com/api/json/${encodeURIComponent(ip)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const d = await res.json();
        ispName = d.asnOrganization || d.isp || ispName;
      }
    } catch {}

    return {
      ip,
      country: geo.country,
      city: geo.city,
      region: geo.region,
      locality: geo.locality,
      isp: ispName,
      latitude: latStr,
      longitude: lonStr,
      coords: `${latStr},${lonStr}`,
      accuracy: `${accuracyStr} (Live Device GPS)`,
      source: "GPS",
    };
  }

  // 2. Fallback: IP-based estimation via Vercel edge headers
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
      accuracy: "City Area (Estimated from IP)",
      source: "IP",
    };
  }

  // 3. Fallback: IP Geolocation API lookup
  try {
    const isLocal = isPrivateOrLocalIp(ip);
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
        accuracy: "City Area (Estimated from IP)",
        source: "IP",
      };
    }
  } catch (err) {
    console.warn("IP Geolocation lookup failed or timed out:", err);
  }

  // 4. Default fallback
  return {
    ip,
    country: vercelCountry ? vercelCountry.toUpperCase() : "Unknown",
    city: vercelCity ? decodeURIComponent(vercelCity) : "Unknown",
    region: vercelRegion ? decodeURIComponent(vercelRegion) : "",
    isp: "Broadband Provider",
    latitude: vercelLat || "",
    longitude: vercelLon || "",
    coords: vercelLat && vercelLon ? `${vercelLat},${vercelLon}` : "",
    accuracy: "Unknown",
    source: "IP",
  };
}
