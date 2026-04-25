export interface ArticleData {
  title: string;
  section: string;
  content: string;
}

export const ARTICLES: Record<string, ArticleData> = {
  "getting-started": {
    title: "Skapa konto",
    section: "Kom igång",
    content: `
# Skapa konto

Att komma igång med ShopMan tar under 5 minuter.

## Steg 1: Välj din plan

Gå till [shopman.se/pricing](/pricing) och välj den plan som passar din verksamhet.

- **Free** — Kom igång utan kostnad. Upp till 250 produkter och 100 ordrar/månad.
- **Starter** — För enskilda butiker. Obegränsat produkter, 3 användare.
- **Growth** — För tillväxtbolag. MultiShop, API-åtkomst, avancerad analys.
- **Enterprise** — Skräddarsydd lösning med dedikerad support.

## Steg 2: Registrera dig

Klicka på "Starta gratis" och fyll i:
1. E-postadress och lösenord (minst 12 tecken)
2. Butiksnamn
3. Butikstyp (Webshop / MultiShop / Marketplace / Återförsäljare)

## Steg 3: Konfigurera din butik

Efter registrering guidas du genom installationsguiden:
1. Domäninställning
2. Välj tema
3. Skapa kategorier
4. Lägg till din första produkt
5. Konfigurera betalningar
6. Publicera

\`\`\`bash
# Valfritt: använd vår API för automatisering
curl -X POST https://api.shopman.se/api/public/signup \\
  -H "Content-Type: application/json" \\
  -d '{"email":"din@email.se","password":"...","storeName":"Min Butik"}'
\`\`\`
    `,
  },
  "store-setup": {
    title: "Konfigurering av butik",
    section: "Kom igång",
    content: `
# Konfigurering av butik

## Grundinställningar

Under **Inställningar → Butiksinfo** kan du ange:
- Butiksnamn och logotyp
- Kontaktuppgifter
- Valutor och språk
- Tidszon

## Domänkoppling

ShopMan ger dig en standarddomän (\`din-butik.shopman.se\`). Du kan koppla din egen domän:

1. Gå till Inställningar → Domäner
2. Lägg till din domän (t.ex. \`shop.mittforetag.se\`)
3. Peka CNAME-posten mot \`cname.shopman.se\` hos din domänleverantör
4. Klicka "Verifiera" — SSL-certifikat utfärdas automatiskt

\`\`\`
Type: CNAME
Name: shop (eller @)
Value: cname.shopman.se
TTL: 3600
\`\`\`

## Butikstyper

| Typ | Beskrivning |
|-----|-------------|
| Webshop | En butik, en storefront |
| MultiShop | Ett konto, flera butiker (olika varumärken) |
| Marketplace | Flera säljare under en plattform |
| Återförsäljare | Vidareförsälj andra butiker |
    `,
  },
  "add-products": {
    title: "Lägg till produkter",
    section: "Kom igång",
    content: `
# Lägg till produkter

## Skapa din första produkt

Gå till **Produkter → Ny produkt** i din ShopMan-panel.

## Obligatoriska fält

- **Produktnamn** — Visas i butiken och i ordrar
- **Pris** — Ange pris exkl. eller inkl. moms
- **SKU** — Unikt artikelnummer för lagerhantering
- **Lagersaldo** — Startkvantitet

## Produktbilder

Ladda upp bilder i JPG, PNG eller WebP (max 10 MB per bild). ShopMan optimerar automatiskt bilder och skapar thumbnail-varianter.

\`\`\`
Rekommenderad bildstorlek: 1200 × 1200 px
Format: JPG eller WebP
Max antal bilder per produkt: 20
\`\`\`

## Kategorier och taggar

Koppla produkten till en eller flera kategorier och lägg till taggar för bättre sökbarhet.

## Publicering

Välj publiceringsstatus:
- **Publicerad** — Visas direkt i butiken
- **Utkast** — Sparas men visas inte
- **Schemalagd** — Publiceras automatiskt vid valt datum och tid
    `,
  },
  "payments-setup": {
    title: "Ta emot betalningar",
    section: "Kom igång",
    content: `
# Ta emot betalningar

## Tillgängliga betalmetoder

ShopMan stödjer de vanligaste betalmetoderna på den svenska marknaden:

- **Klarna** — Köp nu, betala senare. Faktura, delbetalning, kortbetalning.
- **Swish** — Direktbetalning via mobilnummer.
- **Stripe** — Kortbetalningar, Apple Pay, Google Pay.
- **Faktura** — Manuell fakturahantering med Fortnox-integration.

## Aktivera Klarna

1. Skapa ett Klarna Merchant-konto på merchants.klarna.com
2. Gå till **Integrationer → Klarna** i ShopMan
3. Ange ditt Merchant ID och API-nyckel
4. Välj vilka betalmetoder som ska erbjudas
5. Aktivera testläge och gör en provköp

## Aktivera Swish

1. Kontakta din bank för att aktivera Swish för handel
2. Du behöver ett Swish-nummer (10-siffrigt)
3. Gå till **Integrationer → Swish** och ange ditt Swish-nummer och certifikat

## Utbetalningar

Betalningar hanteras direkt av respektive betalningsleverantör. ShopMan hanterar orderflödet men inte pengarna — du får utbetalningar direkt från Klarna/Stripe/Swish enligt deras utbetalningsschema.
    `,
  },
  "product-types": {
    title: "Produkttyper & varianter",
    section: "Produkter & Lager",
    content: `
# Produkttyper & varianter

## Enkla produkter

En enkel produkt är en produkt utan varianter — en specifik SKU, ett pris, ett lagersaldo.

## Variabla produkter

En variabel produkt har varianter definierade av attribut:

\`\`\`
T-shirt (variabel produkt)
├── Storlek: XS, S, M, L, XL
└── Färg: Svart, Vit, Blå

Resulterar i 5 × 3 = 15 varianter (automatiskt)
\`\`\`

## Paketprodukter

Samla ihop flera produkter till ett paket. Lagret hanteras per komponent.

## Digitala produkter

För digitala produkter (nedladdningsbara filer, licenser):
1. Välj "Digital produkt" under produkttyp
2. Ladda upp fil eller ange nedladdningslänk
3. Filen levereras automatiskt efter betald order

## Attribut

Skapa globala attribut under **Produkter → Attribut**:
- Färg (röd, blå, grön...)
- Storlek (XS, S, M, L, XL, XXL)
- Material (bomull, polyester...)

Attribut kan visas som färgväljare, dropdown eller knappar i storefronten.
    `,
  },
  "categories-brands": {
    title: "Kategorier & varumärken",
    section: "Produkter & Lager",
    content: `
# Kategorier & varumärken

## Kategorier

Kategorier hjälper kunder att navigera i din butik och förbättrar SEO.

### Skapa kategorier

Gå till **Produkter → Kategorier → Ny kategori**:
- Kategorinamn och slug (URL)
- Föräldrakategori (för underkategorier)
- Beskrivning och SEO-texter
- Kategoribild

### Hierarki

\`\`\`
Kläder
├── Herr
│   ├── T-shirts
│   └── Byxor
└── Dam
    ├── T-shirts
    └── Klänningar
\`\`\`

## Varumärken

Koppla produkter till varumärken för enklare filtrering:

1. Gå till **Produkter → Varumärken → Nytt varumärke**
2. Ange namn, logotyp och beskrivning
3. Koppla produkter till varumärket

### Varumärkessidor

Varje varumärke får en automatisk varumärkessida med alla kopplade produkter.
    `,
  },
  "inventory": {
    title: "Lagerhantering",
    section: "Produkter & Lager",
    content: `
# Lagerhantering

## Lagerplatser

ShopMan stödjer flera lagerplatser (centrallager, butikslager, dropshipping).

\`\`\`
Lagerplatser
├── Centrallager (Stockholm)
├── Butik Göteborg
├── Butik Malmö
└── 3PL-lager (extern)
\`\`\`

Skapa lagerplatser under **Lager → Lagerplatser → Ny lagerplats**.

## Lagerreservation

När en order läggs reserveras lagret automatiskt. Reservationen gäller tills:
- Ordern skickas (reservation → faktisk minskning)
- Ordern avbryts (reservation återförs)

## Lagerpåfyllning

Skapa inköpsordrar under **Lager → Inköpsordrar**:
1. Välj leverantör
2. Lägg till produkter och antal
3. Skicka order till leverantör
4. Mottagning registreras → lagersaldo uppdateras

## Lagernotifieringar

Sätt miniminivåer per produkt. ShopMan skickar e-post när lagret understiger gränsen.

## Inventering

Genomför lagerinventering under **Lager → Inventering**:
1. Skapa inventeringsorder (välj lagerplats)
2. Räkna och registrera faktiskt saldo
3. Bekräfta — differenser bokförs automatiskt
    `,
  },
  "multishop": {
    title: "MultiShop — ett konto, flera butiker",
    section: "Flerbutik & Marketplace",
    content: `
# MultiShop

Med MultiShop kan du driva flera butiker från ett enda ShopMan-konto.

## Konceptet

\`\`\`
ShopMan-konto
├── Butik A (shopA.se)
│   ├── Produkter
│   ├── Ordrar
│   └── Kunder
├── Butik B (shopB.se)
│   ├── Produkter (delade eller unika)
│   ├── Ordrar
│   └── Kunder
└── Delat lager (valfritt)
\`\`\`

## Aktivera MultiShop

MultiShop kräver **Growth-plan** eller högre.

1. Gå till **Inställningar → Butiker**
2. Klicka "Lägg till butik"
3. Ange butiksnamn, domän och valutor
4. Konfigurera vilka produkter som ska synas i den nya butiken

## Produktdelning

Du kan:
- **Dela produkter** — samma produkt visas i flera butiker
- **Butikspecifika produkter** — produkten visas bara i utvalda butiker
- **Prisskillnader per butik** — olika priser för olika marknader

## Lagerhantering

Lagersaldot är som standard delat mellan butiker. Du kan konfigurera separata lagerplatser per butik under **Lager → Lagerplatser**.
    `,
  },
  "marketplace": {
    title: "Marketplace",
    section: "Flerbutik & Marketplace",
    content: `
# Marketplace

Marketplace-läget låter dig skapa en plattform där flera säljare kan sälja sina produkter.

## Arkitektur

\`\`\`
Marketplace (din plattform)
├── Säljare A → Produkter, Ordrar, Utbetalningar
├── Säljare B → Produkter, Ordrar, Utbetalningar
└── Gemensam kassa & varumärkessida
\`\`\`

## Kom igång med Marketplace

1. Uppgradera till **Enterprise-plan**
2. Aktivera Marketplace under Inställningar
3. Bjud in säljare via e-post
4. Konfigurera provisionssatser (% eller fast belopp per order)
5. Sätt upp utbetalningsschema (dagligt/veckovis/månadsvis)

## Säljarportal

Varje säljare får tillgång till sin egen portal med:
- Produkthantering
- Orderöversikt
- Utbetalningshistorik
- Statistik
    `,
  },
  "reseller-portal": {
    title: "Återförsäljarportal",
    section: "Flerbutik & Marketplace",
    content: `
# Återförsäljarportal

Återförsäljarportalen låter dig sälja dina produkter via andra butikers storefronts.

## Hur det fungerar

\`\`\`
Din butik (leverantör)
    ↓ delar produktkatalog
Återförsäljare A → säljer dina produkter med eget påslag
Återförsäljare B → säljer dina produkter med eget påslag
\`\`\`

## Aktivera återförsäljarfunktionen

1. Uppgradera till **Growth** eller **Enterprise**
2. Gå till **Inställningar → Återförsäljare**
3. Aktivera återförsäljarportalen
4. Bjud in återförsäljare via e-post eller återförsäljaransökan

## Prislistor

Skapa separata prislistor för återförsäljare med rabatter:
- Procentuell rabatt på ordinariepris
- Fast nettopris per produkt
- Volymrabatter

## Orderflöde

När en återförsäljare tar en order:
1. Ordern syns i din panel under **Ordrar → Återförsäljarordrar**
2. Du packar och skickar direkt till slutkunden (dropship) eller till återförsäljaren
3. Återförsäljaren faktureras automatiskt via Fortnox
    `,
  },
  "imports": {
    title: "Importera från Shopify, WooCommerce & PrestaShop",
    section: "Import & Synk",
    content: `
# Import från andra plattformar

ShopMan stödjer import från Shopify, WooCommerce och PrestaShop.

## Shopify-import

\`\`\`bash
# Exportera från Shopify Admin:
# 1. Gå till Produkter → Exportera (CSV)
# 2. Ladda upp CSV-filen i ShopMan: Import → Shopify
\`\`\`

Importerar: produkter, varianter, bilder, lagersaldo, kategorier, kunder, ordrar.

## WooCommerce-import

Kräver WooCommerce REST API-åtkomst:
1. Aktivera REST API i WooCommerce (WooCommerce → Inställningar → Avancerat → REST API)
2. Skapa API-nyckel med läsbehörighet
3. Ange URL + Consumer Key + Consumer Secret i ShopMan

## PrestaShop-import

Via CSV-export:
1. Avancerade parametrar → CSV-export
2. Exportera produkter, kunder och ordrar separat
3. Importera i ShopMan under Import → PrestaShop

## Konflikter

Om produkter redan finns (samma SKU) kan du välja:
- **Hoppa över** — behåll befintlig
- **Ersätt** — skriv över befintlig
- **Lägg till som ny** — skapa dubblett

## Schemalagda importer

Importjobb kan schemaläggs för automatisk synk:

\`\`\`json
{
  "source": "woocommerce",
  "schedule": "0 2 * * *",
  "conflictStrategy": "replace",
  "includeOrders": true
}
\`\`\`
    `,
  },
  "supplier-sync": {
    title: "Leverantörssynk (FTP/API/CSV)",
    section: "Import & Synk",
    content: `
# Leverantörssynk

Håll lagersaldo och priser uppdaterade automatiskt med leverantörssynk.

## Synkmetoder

| Metod | Frekvens | Lämplig för |
|-------|----------|-------------|
| FTP/SFTP | Schemalagd | Stora filer, batch-uppdateringar |
| REST API | Realtid / schemalagd | Moderna leverantörer |
| CSV-uppladdning | Manuell | Engångsimport |
| EDI/EDIFACT | Schemalagd | Enterprise-leverantörer |

## Konfigurera FTP-synk

1. Gå till **Leverantörer → Synkinställningar**
2. Välj "FTP/SFTP"
3. Ange host, port, användarnamn, lösenord och sökväg till fil
4. Välj format: CSV eller XML
5. Schemalägg: varje timme, dagligen kl 02:00, etc.

## Kolumnmappning

ShopMan mappar automatiskt vanliga kolumnnamn. Du kan justera mappning:

\`\`\`
Leverantörens kolumn → ShopMan-fält
artikelnr          → sku
lagerantal         → inventory_quantity
inpris             → cost_price_cents (multipliceras med 100)
ean                → barcode
\`\`\`

## Prisregler

Du kan tillämpa prisregler automatiskt vid synk:
- Lägg till X% påslag på inpriset
- Avrunda till närmaste 9 kr
- Sätt minimipris baserat på täckningsbidrag
    `,
  },
  "fortnox": {
    title: "Fortnox Connect",
    section: "Integrationer",
    content: `
# Fortnox Connect

Synka ordrar, fakturor och kunder med Fortnox automatiskt.

## Aktivering

1. Gå till **Integrationer → Fortnox**
2. Klicka "Anslut till Fortnox"
3. Logga in i Fortnox och godkänn behörigheter
4. ShopMan hämtar din Fortnox-klienttoken automatiskt

## Vad synkas?

| ShopMan | Fortnox | Riktning |
|---------|---------|---------|
| Order (betald) | Faktura | → |
| Kund | Kund | ↔ |
| Produkt | Artikel | ↔ |
| Betalning | Inbetalning | → |
| Kreditnota | Kreditfaktura | → |

## Inställningar

\`\`\`
Synk vid: Order betald / Manuellt / Schemalagd
Fakturatyp: Faktura / Kontantfaktura
Projekt-id: (valfritt)
Kostnadsställe: (valfritt)
Momskod: 25% (standard) / 12% / 6%
\`\`\`

## Felsökning

Om en order inte synkas, kontrollera:
1. Orderns status är "Betald"
2. Kunden har giltig e-postadress
3. Produkten har ett giltigt artikelnummer
4. Kontrollera synk-loggen under Integrationer → Fortnox → Logg
    `,
  },
  "payments": {
    title: "Klarna & Swish",
    section: "Integrationer",
    content: `
# Klarna & Swish

## Klarna

Klarna är Sveriges mest använda betalmetod för e-handel.

### Aktivering

1. Skapa Klarna Merchant-konto på merchants.klarna.com
2. Gå till **Integrationer → Klarna** i ShopMan
3. Ange Merchant ID och API-nyckel (test + live)
4. Välj betalmetoder: Faktura, Delbetalning, Direktbetalning
5. Testa med Klarnas testpersonnummer

### Klarna-widgeten

ShopMan renderar automatiskt Klarna On-Site Messaging (månatlig kostnad visas i produktlistan).

## Swish

### Aktivering

1. Kontakta din bank för att aktivera Swish för handel (kräver organisationsnummer)
2. Ladda ned certifikat från Swish (P12-fil)
3. Gå till **Integrationer → Swish** och ladda upp certifikat
4. Ange ditt Swish-handelsnummer

### QR-kod

ShopMan genererar automatiskt en QR-kod vid kassa som kunden kan skanna med Swish-appen.

## Kombinera betalmetoder

Du kan aktivera flera betalmetoder parallellt. Kunden väljer vid kassa.

| Betalmetod | Avgift | Utbetalning |
|------------|--------|-------------|
| Klarna Faktura | ~2.5% | 14-30 dagar |
| Klarna Direktbetalning | ~1.5% | 2-3 dagar |
| Swish | Fast avgift/köp | 1-2 dagar |
| Stripe Kort | ~1.4% + 1.80 kr | 2-7 dagar |
    `,
  },
  "support-rma": {
    title: "Tickets, Chat & RMA",
    section: "Support & Returflöde",
    content: `
# Tickets, Chat & RMA

## Support-tickets

Hantera kundärenden effektivt med det inbyggda ticket-systemet.

**Status-flöde:**
\`\`\`
Ny → Öppen → Pågår → Väntar på kund → Löst → Stängd
\`\`\`

Tickets kan skapas av kunder via kundportalen eller automatiskt från inkommande e-post.

## Live Chat

Aktivera livechatt på din storefront:
1. Gå till **Inställningar → Chat**
2. Aktivera widget
3. Ange öppettider (utanför öppettider visas ett offlineformulär)
4. Välj auto-svar vid lång väntetid

## Returhantering (RMA)

Return Merchandise Authorization (RMA) hanteras under **Ordrar → Returer**.

**Returflöde:**
\`\`\`
Kund begär retur
  → Automatisk godkännande / Manuell granskning
  → Kund skickar tillbaka
  → Mottagning registreras
  → Beslut: Återbetalning / Byte / Reparation / Kassation
  → Lagersaldo uppdateras
\`\`\`

### Returorsaker

Förkonfigurerade returorsaker: Fel produkt, Defekt, Ångrar köp, Fel storlek, Annan.

Du kan lägga till egna returorsaker under **Inställningar → Returer**.
    `,
  },
  "seo-performance": {
    title: "SEO & Prestanda",
    section: "SEO & Prestanda",
    content: `
# SEO & Prestanda

## SEO-grunderna

ShopMan genererar automatiskt:
- **Canonical-taggar** — undviker duplicerat innehåll
- **Open Graph-taggar** — optimerar delning på sociala medier
- **Structured data (JSON-LD)** — Product, BreadcrumbList, Organization
- **XML-sitemap** — automatisk, uppdateras vid ändringar
- **Robots.txt** — konfigurerbar per butik

## Anpassad SEO per produkt

Under varje produkts SEO-flik kan du ange:
- Eget page title (max 60 tecken)
- Meta description (max 160 tecken)
- Canonical URL
- OG-bild (1200×630 px rekommenderat)

## Prestanda

ShopMan storefronts är byggda på Next.js med:
- **Statisk generering** (SSG) för produktsidor
- **Incremental Static Regeneration** (ISR) för dynamiska sidor
- **Image optimization** — automatisk WebP-konvertering och lazy loading
- **Edge caching** via Cloudflare

## Core Web Vitals

Mål: LCP < 2.5s, FID < 100ms, CLS < 0.1

Kontrollera dina Core Web Vitals i **Analys → SEO-rapport**.

## Redirects

Hantera 301-redirectar under **Inställningar → SEO → Redirectar**. Viktigt vid URL-ändringar eller plattformsmigration.
    `,
  },
  "api-reference": {
    title: "API-referens",
    section: "SEO & Prestanda",
    content: `
# API-referens

ShopMan har ett fullständigt REST API för integrationer och automatisering.

## Autentisering

\`\`\`bash
# API-nyckel (skapas under Inställningar → API)
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.shopman.se/api/products
\`\`\`

## Bassökväg

\`\`\`
https://api.shopman.se/api/
\`\`\`

## Produkter

\`\`\`http
GET    /api/products          # Lista produkter
POST   /api/products          # Skapa produkt
GET    /api/products/:id      # Hämta produkt
PATCH  /api/products/:id      # Uppdatera produkt
DELETE /api/products/:id      # Ta bort produkt
\`\`\`

## Ordrar

\`\`\`http
GET    /api/orders            # Lista ordrar
GET    /api/orders/:id        # Hämta order
PATCH  /api/orders/:id        # Uppdatera status
POST   /api/orders/:id/refund # Återbetalning
\`\`\`

## Webhooks

\`\`\`json
{
  "event": "order.created",
  "url": "https://din-app.se/webhook",
  "secret": "whsec_..."
}
\`\`\`

Tillgängliga events: \`order.created\`, \`order.updated\`, \`order.shipped\`, \`product.updated\`, \`inventory.low\`

## Hastighetsgränser

| Plan | Förfrågningar/dag |
|------|-------------------|
| Free | 500 |
| Starter | 10 000 |
| Growth | 100 000 |
| Enterprise | Obegränsat |
    `,
  },
};

// Search index — flat list for quick filtering
export interface SearchEntry {
  slug: string;
  title: string;
  section: string;
  excerpt: string;
}

export const SEARCH_INDEX: SearchEntry[] = Object.entries(ARTICLES).map(
  ([slug, { title, section, content }]) => ({
    slug,
    title,
    section,
    // First ~160 chars of plain text (strip markdown)
    excerpt: content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*`|_\->\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
  })
);
