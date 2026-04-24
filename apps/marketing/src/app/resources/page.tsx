import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";
import ResourcesClient from "./resources-client";

export const metadata: Metadata = buildMetadata({
  title: "Resurser & Guider — ShopMan",
  description:
    "Kom igång snabbt med ShopMan. Guider för onboarding, produktimport, leverantörssynk, SEO och Fortnox-integration.",
  path: "/resources",
});

export default function ResourcesPage() {
  return <ResourcesClient />;
}
