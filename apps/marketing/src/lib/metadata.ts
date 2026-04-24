import type { Metadata } from "next";

export const SITE_URL = "https://shopman.dev";
export const SITE_NAME = "ShopMan";
export const DEFAULT_OG_IMAGE = "/og-default.png";

export function buildMetadata(opts: {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  language?: "sv" | "en";
  noIndex?: boolean;
}): Metadata {
  const canonical = `${SITE_URL}${opts.path}`;
  const ogImage = opts.ogImage ?? DEFAULT_OG_IMAGE;
  const fullTitle = `${opts.title} — ${SITE_NAME}`;

  return {
    title: fullTitle,
    description: opts.description,
    robots: {
      index: !opts.noIndex,
      follow: !opts.noIndex,
    },
    alternates: {
      canonical,
      languages: {
        sv: canonical,
        en: `${SITE_URL}/en${opts.path}`,
      },
    },
    openGraph: {
      title: fullTitle,
      description: opts.description,
      url: canonical,
      siteName: SITE_NAME,
      images: [{ url: `${SITE_URL}${ogImage}` }],
      locale: "sv_SE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: opts.description,
      images: [`${SITE_URL}${ogImage}`],
    },
  };
}
