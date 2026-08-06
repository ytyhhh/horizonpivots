import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "CampusRadar/1.0 (+public-job-index)";
const robotsCache = new Map<string, Promise<string | null>>();

const blockedHosts = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.azure.internal",
  "instance-data.ec2.internal",
]);

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  return (
    parts[0] === 0 ||
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] >= 224
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLocaleLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isPublicIp(address: string) {
  const family = isIP(address);
  if (family === 4) return !isPrivateIpv4(address);
  if (family === 6) return !isPrivateIpv6(address);
  return false;
}

export async function assertSafePublicUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Only HTTPS recruiting sources are allowed");
  if (url.username || url.password) throw new Error("URLs with credentials are not allowed");
  const hostname = url.hostname.toLocaleLowerCase().replace(/\.$/, "");
  if (blockedHosts.has(hostname) || hostname.endsWith(".localhost")) {
    throw new Error("Private host is not allowed");
  }
  if (isIP(hostname)) {
    if (!isPublicIp(hostname)) throw new Error("Private IP is not allowed");
    return url;
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) {
    throw new Error("Host resolves to a private or invalid address");
  }
  return url;
}

interface SafeFetchOptions {
  contentTypes?: string[];
  checkRobots?: boolean;
  maxBytes?: number;
}

async function fetchWithRedirects(value: string, redirects = 0): Promise<Response> {
  const url = await assertSafePublicUrl(value);
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.1" },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) throw new Error("Too many redirects");
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect is missing a location");
    return fetchWithRedirects(new URL(location, url).toString(), redirects + 1);
  }
  return response;
}

function robotsAllows(robots: string, pathname: string) {
  let applies = false;
  for (const rawLine of robots.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLocaleLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") applies = value === "*" || value.toLocaleLowerCase() === "campusradar";
    if (applies && key === "disallow" && value && pathname.startsWith(value)) return false;
  }
  return true;
}

export async function isAllowedByRobots(value: string) {
  const url = await assertSafePublicUrl(value);
  if (!robotsCache.has(url.origin)) {
    robotsCache.set(url.origin, (async () => {
      try {
        const response = await fetchWithRedirects(new URL("/robots.txt", url.origin).toString());
        if (response.status === 404 || !response.ok) return null;
        const declaredLength = Number(response.headers.get("content-length") ?? 0);
        if (declaredLength > 200_000) return null;
        const buffer = await response.arrayBuffer();
        return buffer.byteLength <= 200_000 ? new TextDecoder().decode(buffer) : null;
      } catch {
        return null;
      }
    })());
  }
  const robots = await robotsCache.get(url.origin)!;
  return robots ? robotsAllows(robots, url.pathname) : true;
}

export async function fetchSafeText(value: string, options: SafeFetchOptions = {}) {
  if (options.checkRobots !== false && !(await isAllowedByRobots(value))) {
    throw new Error("robots.txt disallows this path");
  }
  const response = await fetchWithRedirects(value);
  if (!response.ok) throw new Error(`${value} returned ${response.status}`);
  const allowed = options.contentTypes ?? ["text/html", "application/xhtml+xml", "application/xml", "text/xml"];
  const contentType = (response.headers.get("content-type") ?? "").toLocaleLowerCase();
  if (!allowed.some((type) => contentType.includes(type))) {
    throw new Error(`${value} returned unsupported content type`);
  }
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new Error(`${value} exceeds the response size limit`);
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > maxBytes) throw new Error(`${value} exceeds the response size limit`);
  return new TextDecoder().decode(buffer);
}
