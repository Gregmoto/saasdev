import { SITE_URL, SITE_NAME } from "./metadata";

export function organizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      "https://twitter.com/shopmandev",
      "https://linkedin.com/company/shopmandev",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["Swedish", "English"],
      url: `${SITE_URL}/contact`,
    },
  };
}

export function websiteSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "sv-SE",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleSchema(post: {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  coverImageUrl?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    url: post.url,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    ...(post.coverImageUrl
      ? {
          image: {
            "@type": "ImageObject",
            url: post.coverImageUrl,
          },
        }
      : {}),
  };
}

export function breadcrumbSchema(
  items: Array<{ label: string; url: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.url,
    })),
  };
}

export function faqSchema(
  items: Array<{ question: string; answer: string }>
): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** Breadcrumb schema using name/url property shape (alias for docsBreadcrumbSchema). */
export function docsBreadcrumbSchema(
  section: string,
  title: string,
  url: string
): object {
  return breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: section, url: `${SITE_URL}/docs` },
    { label: title, url },
  ]);
}

export function softwareAppSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "ShopMan är en samlad e-handelsplattform för moderna handlare. Hantera produkter, ordrar, lager och kunder från ett ställe.",
    offers: {
      "@type": "Offer",
      price: "599",
      priceCurrency: "SEK",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "599",
        priceCurrency: "SEK",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "MON",
        },
      },
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/** Alias matching the task spec name. */
export const softwareApplicationSchema = softwareAppSchema;
