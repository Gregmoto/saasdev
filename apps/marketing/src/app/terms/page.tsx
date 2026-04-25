import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Villkor",
  description:
    "Läs ShopMans allmänna villkor för användning av plattformen, betalning, avtalstid och ansvarsbegränsning.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">Allmänna villkor</h1>
        <p className="text-stone-500 mb-12 text-sm">Senast uppdaterade: april 2026</p>

        <div className="prose prose-stone max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">1. Tjänstebeskrivning</h2>
            <p className="text-stone-600 leading-relaxed">
              ShopMan AB (&quot;ShopMan&quot;, &quot;vi&quot;, &quot;oss&quot;) tillhandahåller en webbaserad
              e-handelsplattform som möjliggör hantering av produkter, ordrar, lager, betalningar och
              kundrelationer (&quot;Tjänsten&quot;). Tjänsten levereras som Software-as-a-Service (SaaS)
              och nås via webbläsare eller API.
            </p>
            <p className="text-stone-600 leading-relaxed mt-3">
              Genom att skapa ett konto eller använda Tjänsten godkänner du dessa villkor
              (&quot;Avtalet&quot;). Om du använder Tjänsten på uppdrag av en organisation intygar du att
              du har behörighet att ingå avtal för den organisationens räkning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">2. Betalning och fakturering</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Priser framgår av vår{" "}
              <a href="/pricing" className="text-blue-700 hover:underline">
                prissida
              </a>
              . Fakturering sker månadsvis eller årsvis i förskott beroende på valt abonnemang.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li>
                Betalning sker via kortbetalning eller faktura (vid årsabonnemang). Vi accepterar Visa,
                Mastercard och banköverföring.
              </li>
              <li>
                Förfallen faktura påförs dröjsmålsränta om 8 % per år i enlighet med räntelagen samt
                en påminnelseavgift om 60 SEK.
              </li>
              <li>
                Priser är exklusive mervärdesskatt (moms). För svenska företagskunder tillkommer 25 %
                moms.
              </li>
              <li>
                ShopMan förbehåller sig rätten att justera priser med 30 dagars skriftligt varsel.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">3. Avtalstid och uppsägning</h2>
            <p className="text-stone-600 leading-relaxed">
              Månadsabonnemang löper tillsvidare med en månads ömsesidig uppsägningstid. Årsabonnemang
              löper i ett år och förnyas automatiskt om de inte sägs upp senast 30 dagar innan
              avtalsperiodens slut.
            </p>
            <p className="text-stone-600 leading-relaxed mt-3">
              Uppsägning görs via kontoinställningarna eller genom att kontakta{" "}
              <a href="mailto:support@shopman.dev" className="text-blue-700 hover:underline">
                support@shopman.dev
              </a>
              . Vid uppsägning behåller du tillgång till Tjänsten till och med periodens slut. Erlagda
              avgifter återbetalas inte.
            </p>
            <p className="text-stone-600 leading-relaxed mt-3">
              ShopMan förbehåller sig rätten att med omedelbar verkan stänga konton som bryter mot
              dessa villkor, missbrukar Tjänsten eller utsätter andra användare för skada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">4. Ansvarsbegränsning</h2>
            <p className="text-stone-600 leading-relaxed">
              Tjänsten tillhandahålls &quot;i befintligt skick&quot;. ShopMan garanterar en tillgänglighet
              om 99,9 % (mätt månadsvis, exklusive planerat underhåll) och erbjuder SLA-kredit vid
              avvikelse.
            </p>
            <p className="text-stone-600 leading-relaxed mt-3">
              ShopMans samlade skadeståndsansvar gentemot kunden är begränsat till det belopp kunden
              betalat för Tjänsten under de senaste tolv (12) månaderna. ShopMan ansvarar inte för
              indirekta förluster, utebliven vinst, förlorade data eller följdskador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">5. Immateriella rättigheter</h2>
            <p className="text-stone-600 leading-relaxed">
              ShopMan äger alla immateriella rättigheter till plattformen, inklusive programvara,
              design, varumärken och dokumentation. Du beviljas en icke-exklusiv, icke-överlåtbar
              licens att använda Tjänsten under avtalstiden.
            </p>
            <p className="text-stone-600 leading-relaxed mt-3">
              Du äger och behåller alla rättigheter till det innehåll (produkter, bilder, texter) som
              du laddar upp i plattformen. Genom att använda Tjänsten ger du ShopMan en begränsad
              licens att lagra och behandla innehållet i syfte att leverera Tjänsten.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">6. Dataskydd</h2>
            <p className="text-stone-600 leading-relaxed">
              Behandling av personuppgifter regleras av vår{" "}
              <a href="/privacy" className="text-blue-700 hover:underline">
                Integritetspolicy
              </a>{" "}
              och det personuppgiftsbiträdesavtal (DPA) som ingås i samband med att konto skapas.
              ShopMan agerar som personuppgiftsbiträde avseende slutkunders data och kunden är
              personuppgiftsansvarig.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">7. Tvistlösning</h2>
            <p className="text-stone-600 leading-relaxed">
              Dessa villkor lyder under svensk lag. Tvister som inte kan lösas i samförstånd ska
              slutligen avgöras av Stockholms tingsrätt som första instans, om parterna inte
              kommit överens om skiljeförfarande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">8. Ändringar av villkoren</h2>
            <p className="text-stone-600 leading-relaxed">
              ShopMan kan uppdatera dessa villkor. Du meddelas via e-post och/eller ett meddelande i
              plattformen minst 30 dagar innan ändringen träder i kraft. Fortsatt användning av
              Tjänsten efter ikraftträdandet anses som godkännande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">9. Kontakt</h2>
            <p className="text-stone-600 leading-relaxed">
              Frågor om dessa villkor skickas till{" "}
              <a href="mailto:legal@shopman.dev" className="text-blue-700 hover:underline">
                legal@shopman.dev
              </a>{" "}
              eller via vårt{" "}
              <a href="/contact" className="text-blue-700 hover:underline">
                kontaktformulär
              </a>
              .
            </p>
          </section>

        </div>
      </main>
      <Footer />
    </>
  );
}
