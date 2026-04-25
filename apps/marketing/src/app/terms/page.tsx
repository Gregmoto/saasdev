export const dynamic = "force-dynamic";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { LegalVersionSwitcher, type LegalVersion } from "./version-switcher";

export const metadata = buildMetadata({
  title: "Allmänna villkor",
  description:
    "Läs ShopMans allmänna villkor för användning av plattformen, betalning, avtalstid och ansvarsbegränsning.",
  path: "/terms",
});

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Static fallback content ───────────────────────────────────────────────────
const FALLBACK_BODY = `# Allmänna villkor

Senast uppdaterad: 1 januari 2026 • Version 1.0

## Tjänstebeskrivning
ShopMan är en SaaS-plattform för e-handel. Vi tillhandahåller verktyg för produkthantering, orderhantering, lagerstyrning och betalningar.

## Betalning och fakturering
Prenumerationen faktureras månadsvis i förskott. Alla priser anges exklusive moms. Utebliven betalning leder till en påminnelse, sedan tillfällig inaktivering av kontot efter 14 dagar.

## Avtalstid och uppsägning
Avtalet löper tills vidare. Månadsplan: 1 månads uppsägningstid. Årsplan: kan sägas upp med 30 dagars varsel innan förnyelseperioden. Ingen återbetalning för innevarande period.

## Ansvarsbegränsning
ShopMans ansvar är begränsat till det belopp du betalat under de senaste 3 månaderna. Vi ansvarar inte för indirekta förluster, utebliven vinst eller driftstopp utöver vad som framgår av SLA.

## Drifttid (SLA)
Vi eftersträvar 99,9% tillgänglighet. Planerat underhåll meddelas 48 timmar i förväg via statussidan.

## Immateriella rättigheter
Du behåller äganderätten till all din butiksdata och ditt innehåll. ShopMan behåller äganderätten till plattformens kod, design och varumärke. Du ger ShopMan rätt att använda ditt företagsnamn och logotyp som referens, om inte annat överenskommits.

## GDPR och personuppgiftsbiträdesavtal
ShopMan agerar personuppgiftsbiträde för den data du lagrar i plattformen. Personuppgiftsbiträdesavtal (DPA) ingår som en del av dessa villkor.

## Ändringar av villkoren
Vi meddelar om väsentliga ändringar 30 dagar i förväg via e-post. Fortsatt användning utgör godkännande.

## Tillämplig lag
Svensk lag tillämpas. Tvister avgörs av Stockholms tingsrätt.

## Kontakt
legal@shopman.se`;

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

async function fetchTerms(): Promise<{
  current: CmsLegalCurrent;
  versions: LegalVersion[];
} | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/api/cms/legal/terms?lang=sv`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as CmsLegalResponse;
  } catch {
    return null;
  }
}

export default async function TermsPage() {
  const cms = await fetchTerms();

  const current = cms?.current ?? FALLBACK_VERSION;
  const versions: LegalVersion[] = cms?.versions ?? [];

  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-stone-900 mb-1">Allmänna villkor</h1>
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
