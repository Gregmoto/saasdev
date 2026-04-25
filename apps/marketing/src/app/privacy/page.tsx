import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";

export const metadata = buildMetadata({
  title: "Integritetspolicy",
  description:
    "Läs om hur ShopMan samlar in, behandlar och skyddar dina personuppgifter i enlighet med GDPR.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">Integritetspolicy</h1>
        <p className="text-stone-500 mb-12 text-sm">Senast uppdaterad: april 2026</p>

        <div className="prose prose-stone max-w-none space-y-10">

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">1. Personuppgiftsansvarig</h2>
            <p className="text-stone-600 leading-relaxed">
              ShopMan AB (org.nr. 556000-0000) är personuppgiftsansvarig för behandlingen av dina
              personuppgifter. Om du har frågor om hur vi hanterar dina uppgifter är du välkommen att
              kontakta oss på{" "}
              <a href="mailto:privacy@shopman.dev" className="text-blue-700 hover:underline">
                privacy@shopman.dev
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">2. Vilka uppgifter samlar vi in?</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Vi samlar in de personuppgifter som är nödvändiga för att tillhandahålla våra tjänster:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li>
                <strong className="text-stone-800">Kontouppgifter:</strong> Namn, e-postadress,
                telefonnummer och företagsinformation vid registrering.
              </li>
              <li>
                <strong className="text-stone-800">Betaldata:</strong> Fakturaadress och betalningsinformation
                som krävs för fakturering. Kortuppgifter hanteras av vår betalningsleverantör och lagras
                aldrig av oss.
              </li>
              <li>
                <strong className="text-stone-800">Tekniska uppgifter:</strong> IP-adress, webbläsartyp,
                enhetsidentifierare och loggdata för säkerhet och felsökning.
              </li>
              <li>
                <strong className="text-stone-800">Kommunikation:</strong> Meddelanden du skickar till
                vår support eller via kontaktformulär.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">3. Syfte och rättslig grund</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Vi behandlar dina personuppgifter för följande ändamål:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li>
                <strong className="text-stone-800">Leverans av tjänst (avtal):</strong> För att skapa och
                hantera ditt konto, bearbeta ordrar och ge tillgång till plattformen.
              </li>
              <li>
                <strong className="text-stone-800">Fakturering (avtal och rättslig förpliktelse):</strong>{" "}
                För att skicka fakturor och uppfylla bokföringskrav.
              </li>
              <li>
                <strong className="text-stone-800">Säkerhet (berättigat intresse):</strong> För att
                skydda plattformen och identifiera missbruk.
              </li>
              <li>
                <strong className="text-stone-800">Kommunikation (samtycke eller berättigat intresse):</strong>{" "}
                För att svara på supportärenden och skicka viktiga tjänstemeddelanden.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">4. Lagring och säkerhet</h2>
            <p className="text-stone-600 leading-relaxed">
              Dina uppgifter lagras på säkra servrar inom EU/EES. Vi tillämpar kryptering (TLS i transit,
              AES-256 i vila), åtkomstkontroll och regelbundna säkerhetsgranskningar. Personuppgifter
              raderas eller anonymiseras senast 24 månader efter att ett konto avslutats, om inte längre
              lagring krävs av lag (t.ex. bokföringslagen kräver 7 år för räkenskapsinformation).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">5. Dina rättigheter</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              Enligt GDPR har du följande rättigheter:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-stone-600 text-sm">
              <li>
                <strong className="text-stone-800">Tillgång:</strong> Rätt att begära ett utdrag av de
                uppgifter vi har om dig.
              </li>
              <li>
                <strong className="text-stone-800">Rättelse:</strong> Rätt att korrigera felaktiga eller
                ofullständiga uppgifter.
              </li>
              <li>
                <strong className="text-stone-800">Radering:</strong> Rätt att begära att dina uppgifter
                raderas ("rätten att bli glömd"), under förutsättning att inga rättsliga skyldigheter
                hindrar detta.
              </li>
              <li>
                <strong className="text-stone-800">Dataportabilitet:</strong> Rätt att få ut dina uppgifter
                i ett maskinläsbart format.
              </li>
              <li>
                <strong className="text-stone-800">Invändning:</strong> Rätt att invända mot behandling
                som grundar sig på berättigat intresse.
              </li>
              <li>
                <strong className="text-stone-800">Begränsning:</strong> Rätt att begära att behandlingen
                begränsas i vissa situationer.
              </li>
            </ul>
            <p className="text-stone-600 leading-relaxed mt-4">
              Skicka din begäran till{" "}
              <a href="mailto:privacy@shopman.dev" className="text-blue-700 hover:underline">
                privacy@shopman.dev
              </a>
              . Vi svarar inom 30 dagar. Du har även rätt att lämna klagomål till{" "}
              <a
                href="https://www.imy.se"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline"
              >
                Integritetsskyddsmyndigheten (IMY)
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">6. Cookies</h2>
            <p className="text-stone-600 leading-relaxed">
              Vi använder cookies för att förbättra din upplevelse, analysera trafik (via anonymiserad
              statistik) och komma ihåg dina inloggningsinställningar. Du kan när som helst hantera
              dina cookie-inställningar via webbläsaren. Tredjepartscookies för analys aktiveras bara
              efter ditt samtycke.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">7. Tredjeparter</h2>
            <p className="text-stone-600 leading-relaxed">
              Vi delar aldrig dina personuppgifter med tredje part för marknadsföringsändamål. Vi anlitar
              underleverantörer (t.ex. betalningslösningar, molninfrastruktur) som behandlar data på
              uppdrag av oss under gällande personuppgiftsbiträdesavtal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-stone-900 mb-3">8. Kontakt</h2>
            <p className="text-stone-600 leading-relaxed">
              Har du frågor om denna policy, kontakta oss på{" "}
              <a href="mailto:privacy@shopman.dev" className="text-blue-700 hover:underline">
                privacy@shopman.dev
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
