export const dynamic = "force-dynamic";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { LegalVersionSwitcher, type LegalVersion } from "./version-switcher";

export const metadata = buildMetadata({
  title: "Integritetspolicy",
  description:
    "Läs om hur ShopMan samlar in, behandlar och skyddar dina personuppgifter i enlighet med GDPR.",
  path: "/privacy",
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Static fallback content ───────────────────────────────────────────────────
const FALLBACK_BODY = `# Integritetspolicy

Senast uppdaterad: 1 januari 2026 • Version 1.0

## Personuppgiftsansvarig
ShopMan AB är personuppgiftsansvarig för behandlingen av dina personuppgifter när du använder vår tjänst.

## Vilka uppgifter samlar vi in?
Vi samlar in: namn, e-postadress, faktureringsadress, betalningsinformation (hanteras av Klarna/Stripe), IP-adress, webbläsardata och cookies.

## Varför behandlar vi dina uppgifter?
- **Avtalsuppfyllelse**: Leverera och hantera din prenumeration
- **Rättslig förpliktelse**: Bokföring och fakturering
- **Berättigat intresse**: Förbättra tjänsten, förhindra missbruk
- **Samtycke**: Marknadsföringsutskick (kan återkallas när som helst)

## Hur länge sparar vi uppgifterna?
Kontodata sparas under avtalstiden + 36 månader. Bokföringsdata sparas i 7 år (bokföringslagen).

## Dina rättigheter (GDPR)
Du har rätt till: tillgång, rättelse, radering ("rätten att bli glömd"), begränsning, dataportabilitet och invändning. Kontakta privacy@shopman.se.

## Tredjepartsleverantörer
Vi delar data med: Klarna (betalningar), Stripe (betalningar), Resend (transaktionella e-post), Vercel/Railway (hosting). Alla behandlar data inom EU/EES eller med adekvat skyddsnivå.

## Cookies
Nödvändiga cookies: session-id (inloggning). Analytiska cookies: med ditt samtycke. Du kan hantera cookies i din webbläsare.

## Kontakt
privacy@shopman.se`;

const FALLBACK_VERSION: {
  id: string;
  versionNumber: number;
  versionLabel: string;
  effectiveDate: string;
  body: string;
} = {
  id: "fallback",
  versionNumber: 1,
  versionLabel: "",
  effectiveDate: "1 januari 2026",
  body: FALLBACK_BODY,
};

// ── CMS response shape ────────────────────────────────────────────────────────
interface CmsLegalCurrent {
  id: string;
  pageType: string;
  language: string;
  versionNumber: number;
  versionLabel: string;
  effectiveDate: string;
  status: string;
  body: string;
  summaryOfChanges?: string;
}

interface CmsLegalResponse {
  current: CmsLegalCurrent;
  versions: LegalVersion[];
}

async function fetchPrivacyPolicy(): Promise<{
  current: CmsLegalCurrent;
  versions: LegalVersion[];
} | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/api/cms/legal/privacy?lang=sv`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsLegalResponse;
  } catch {
    return null;
  }
}

export default async function PrivacyPage() {
  const cms = await fetchPrivacyPolicy();

  const current = cms?.current ?? FALLBACK_VERSION;
  const versions: LegalVersion[] = cms?.versions ?? [];

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-stone-900 mb-1">Integritetspolicy</h1>
          {!cms && (
            <p className="text-xs text-stone-400 mt-2">
              Statisk version — CMS ej tillgängligt
            </p>
          )}
        </div>

        {/* Version switcher handles meta display + body rendering */}
        <LegalVersionSwitcher
          versions={versions}
          currentVersionId={current.id}
          initialBody={current.body}
          initialEffectiveDate={current.effectiveDate}
          initialVersionNumber={current.versionNumber}
          initialVersionLabel={current.versionLabel}
        />
      </main>
      <Footer />
    </>
  );
}
