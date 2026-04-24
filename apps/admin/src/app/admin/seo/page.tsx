import { headers } from "next/headers";
import { SeoClient } from "./seo-client";

export interface SeoSettings {
  canonicalBaseUrl: string;
  hreflangMap: Record<string, string>;
  robotsTxtRules: string[];
  googleMerchantId: string;
  includeSoldOutInMerchantFeed: boolean;
}

export interface SeoRedirect {
  id: string;
  from: string;
  to: string;
  type: 301 | 302;
  hits: number;
  active: boolean;
  note: string | null;
  createdAt: string;
}

const EMPTY_SETTINGS: SeoSettings = {
  canonicalBaseUrl: "",
  hreflangMap: {},
  robotsTxtRules: [],
  googleMerchantId: "",
  includeSoldOutInMerchantFeed: false,
};

async function fetchSeoData(cookie?: string): Promise<{
  settings: SeoSettings;
  redirects: SeoRedirect[];
}> {
  const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const h = cookie ? { cookie } : {};

  try {
    const [settingsRes, redirectsRes] = await Promise.all([
      fetch(`${API}/api/seo/settings`, { headers: h, cache: "no-store" }),
      fetch(`${API}/api/seo/redirects`, { headers: h, cache: "no-store" }),
    ]);

    const settings: SeoSettings =
      settingsRes.ok &&
      (settingsRes.headers.get("content-type") ?? "").includes("application/json")
        ? ((await settingsRes.json()) as SeoSettings)
        : EMPTY_SETTINGS;

    const redirects: SeoRedirect[] =
      redirectsRes.ok &&
      (redirectsRes.headers.get("content-type") ?? "").includes("application/json")
        ? ((await redirectsRes.json()) as SeoRedirect[])
        : [];

    return { settings, redirects };
  } catch {
    return { settings: EMPTY_SETTINGS, redirects: [] };
  }
}

export default async function SeoPage() {
  const hdrs = await headers();
  const cookie = hdrs.get("cookie") ?? undefined;
  const { settings, redirects } = await fetchSeoData(cookie);
  return <SeoClient initialSettings={settings} initialRedirects={redirects} />;
}
