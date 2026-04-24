import type { Metadata, Viewport } from "next";
import "./globals.css";
import { buildMetadata } from "@/lib/metadata";
import { organizationSchema, websiteSchema } from "@/lib/schema-org";

export const metadata: Metadata = buildMetadata({
  title: "E-handelsplattform för moderna handlare",
  description:
    "ShopMan är en samlad e-handelsplattform. Hantera produkter, ordrar, lager och kunder från ett ställe.",
  path: "/",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSchema = organizationSchema();
  const siteSchema = websiteSchema();

  return (
    <html lang="sv">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([orgSchema, siteSchema]),
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
