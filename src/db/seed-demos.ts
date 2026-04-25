/**
 * Demo seed script — resets and re-populates demo store accounts.
 * Runs nightly via BullMQ repeatable job (demo_reseed).
 *
 * Demos:
 *   A: demo-webshop   — single store, realistic products/orders/customers
 *   B: demo-multishop — one account, 3 shops with shared inventory
 *   C: demo-marketplace — platform view, 4 isolated store accounts
 *
 * Usage: npx tsx src/db/seed-demos.ts
 */
import postgres from "postgres";

const DB_URL =
  process.env["DATABASE_URL"] ?? "postgres://saasshop:saasshop@localhost:5432/saasshop";

const sql = postgres(DB_URL, { max: 1, onnotice: () => {} });

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateOffset(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function upsertStoreAccount(
  storeSlug: string,
  name: string,
  plan = "growth",
): Promise<string> {
  const existing = await sql<Array<{ id: string }>>`
    SELECT id FROM store_accounts WHERE slug = ${storeSlug} LIMIT 1
  `.catch(() => [] as Array<{ id: string }>);

  if (existing[0]) {
    await sql`
      UPDATE store_accounts
      SET name = ${name}, is_demo = TRUE, status = 'active', is_active = TRUE, updated_at = now()
      WHERE id = ${existing[0].id}
    `;
    return existing[0].id;
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO store_accounts (name, slug, plan, status, is_active, is_demo)
    VALUES (${name}, ${storeSlug}, ${plan}, 'active', TRUE, TRUE)
    RETURNING id
  `;
  return rows[0]!.id;
}

async function hashPassword(password: string): Promise<string> {
  // Simple bcrypt-compatible hash using the project's own helper if available,
  // else fall back to a static bcrypt hash of "Demo@2026!" pre-generated.
  // $2b$10$ prefix = bcrypt, 10 rounds.
  try {
    const { hashPassword: hp } = await import("../lib/password.js");
    return hp(password);
  } catch {
    // Pre-generated bcrypt hash of "Demo@2026!" — used as fallback when
    // the password lib is unavailable (e.g. running as plain tsx without build).
    return "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FGkRF/TTG6yNBi0vGxEjCMkXmJT7mGy";
  }
}

async function upsertUser(
  email: string,
  name: string,
  storeId: string,
  role = "store_admin",
): Promise<string> {
  const hashed = await hashPassword("Demo@2026!");
  const parts = name.split(" ");
  const firstName = parts[0] ?? name;
  const lastName = parts.slice(1).join(" ");

  const existing = await sql<Array<{ id: string }>>`
    SELECT id FROM auth_users WHERE email = ${email} LIMIT 1
  `.catch(() => [] as Array<{ id: string }>);

  let userId: string;
  if (existing[0]) {
    userId = existing[0].id;
    await sql`
      UPDATE auth_users
      SET home_store_account_id = ${storeId}, updated_at = now()
      WHERE id = ${userId}
    `;
  } else {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO auth_users (email, name, first_name, last_name, password_hash, is_platform_admin, is_active, home_store_account_id)
      VALUES (${email}, ${name}, ${firstName}, ${lastName}, ${hashed}, FALSE, TRUE, ${storeId})
      RETURNING id
    `.catch(async () => {
      // Fallback if first_name/last_name columns don't exist yet
      return sql<Array<{ id: string }>>`
        INSERT INTO auth_users (email, name, password_hash, is_platform_admin, is_active, home_store_account_id)
        VALUES (${email}, ${name}, ${hashed}, FALSE, TRUE, ${storeId})
        RETURNING id
      `;
    });
    userId = rows[0]!.id;
  }

  // Ensure membership
  await sql`
    INSERT INTO store_memberships (user_id, store_account_id, role, is_active)
    VALUES (${userId}, ${storeId}, ${role}, TRUE)
    ON CONFLICT (user_id, store_account_id) DO UPDATE SET role = ${role}, is_active = TRUE
  `.catch(() => {});

  return userId;
}

async function clearStoreData(storeId: string): Promise<void> {
  // Delete in dependency order
  await sql`DELETE FROM order_items WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM orders WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM products WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM product_categories WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM brands WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM customers WHERE store_account_id = ${storeId}`.catch(() => {});
  await sql`DELETE FROM shops WHERE store_account_id = ${storeId}`.catch(() => {});
}

interface ProductSeed {
  name: string;
  priceCents: number;
  compareAtPriceCents?: number;
  inventoryQuantity: number;
  sku: string;
  categorySlug: string;
  brandSlug?: string;
  description?: string;
}

async function seedCategories(
  storeId: string,
  categories: Array<{ name: string; slug: string; sortOrder?: number }>,
): Promise<Record<string, string>> {
  const idMap: Record<string, string> = {};
  for (const c of categories) {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO product_categories (store_account_id, name, slug, sort_order)
      VALUES (${storeId}, ${c.name}, ${c.slug}, ${c.sortOrder ?? 0})
      ON CONFLICT (store_account_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
      RETURNING id
    `.catch(() => [] as Array<{ id: string }>);
    if (rows[0]) idMap[c.slug] = rows[0].id;
  }
  return idMap;
}

async function seedBrands(
  storeId: string,
  brands: Array<{ name: string; slug: string }>,
): Promise<Record<string, string>> {
  const idMap: Record<string, string> = {};
  for (const b of brands) {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO brands (store_account_id, name, slug)
      VALUES (${storeId}, ${b.name}, ${b.slug})
      ON CONFLICT (store_account_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
      RETURNING id
    `.catch(() => [] as Array<{ id: string }>);
    if (rows[0]) idMap[b.slug] = rows[0].id;
  }
  return idMap;
}

async function seedProducts(
  storeId: string,
  products: ProductSeed[],
  categoryIds: Record<string, string>,
  brandIds: Record<string, string>,
): Promise<string[]> {
  const ids: string[] = [];
  for (const p of products) {
    const productSlug = slugify(p.name);
    const categoryId = categoryIds[p.categorySlug] ?? null;
    const brandId = p.brandSlug ? (brandIds[p.brandSlug] ?? null) : null;
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO products (
        store_account_id, name, slug, sku, price_cents, compare_at_price_cents,
        inventory_quantity, track_inventory, category_id, brand_id,
        status, type, description
      )
      VALUES (
        ${storeId}, ${p.name}, ${productSlug}, ${p.sku},
        ${p.priceCents}, ${p.compareAtPriceCents ?? null},
        ${p.inventoryQuantity}, TRUE,
        ${categoryId}, ${brandId},
        'published', 'simple', ${p.description ?? null}
      )
      ON CONFLICT (store_account_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        price_cents = EXCLUDED.price_cents,
        compare_at_price_cents = EXCLUDED.compare_at_price_cents,
        inventory_quantity = EXCLUDED.inventory_quantity,
        category_id = EXCLUDED.category_id,
        brand_id = EXCLUDED.brand_id,
        status = 'published',
        updated_at = now()
      RETURNING id
    `.catch(() => [] as Array<{ id: string }>);
    if (rows[0]) ids.push(rows[0].id);
  }
  return ids;
}

async function seedCustomers(
  storeId: string,
  customers: Array<{ firstName: string; lastName: string; email: string; city?: string }>,
): Promise<string[]> {
  const ids: string[] = [];
  for (const c of customers) {
    const rows = await sql<Array<{ id: string }>>`
      INSERT INTO customers (store_account_id, email, first_name, last_name)
      VALUES (${storeId}, ${c.email}, ${c.firstName}, ${c.lastName})
      ON CONFLICT (store_account_id, email) DO UPDATE SET updated_at = now()
      RETURNING id
    `.catch(() => [] as Array<{ id: string }>);
    if (rows[0]) ids.push(rows[0].id);
  }
  return ids;
}

async function seedOrders(
  storeId: string,
  customerIds: string[],
  productIds: string[],
  productData: ProductSeed[],
  orderCount: number,
): Promise<void> {
  const statuses = ["delivered", "delivered", "delivered", "shipped", "processing", "pending", "cancelled"] as const;
  const paymentStatuses = ["paid", "paid", "paid", "paid", "unpaid"] as const;
  const customerNames = [
    ["Maria", "Lindqvist"],
    ["Johan", "Svensson"],
    ["Anna", "Berg"],
    ["Erik", "Karlsson"],
    ["Sofia", "Nilsson"],
    ["Lars", "Hansson"],
    ["Emma", "Pettersson"],
    ["Mikael", "Johansson"],
  ];

  for (let i = 0; i < orderCount; i++) {
    const orderNumber = `ORD-${String(1000 + i).padStart(5, "0")}`;
    const customerIdx = i % customerIds.length;
    const customerId = customerIds[customerIdx] ?? null;
    const nameArr = customerNames[i % customerNames.length]!;
    const firstName = nameArr[0]!;
    const lastName = nameArr[1]!;
    const customerEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const status = statuses[i % statuses.length]!;
    const paymentStatus = paymentStatuses[i % paymentStatuses.length]!;
    const daysAgo = -(i * 3 + 1);

    // Pick 1-3 products for the order
    const itemCount = (i % 3) + 1;
    let subtotal = 0;
    const itemsToInsert: Array<{
      title: string;
      sku: string;
      quantity: number;
      unitPriceCents: number;
      totalPriceCents: number;
      productId: string;
    }> = [];

    for (let j = 0; j < itemCount; j++) {
      const pIdx = (i + j) % productIds.length;
      const productId = productIds[pIdx]!;
      const product = productData[pIdx]!;
      const qty = (j % 2) + 1;
      const total = product.priceCents * qty;
      subtotal += total;
      itemsToInsert.push({
        title: product.name,
        sku: product.sku,
        quantity: qty,
        unitPriceCents: product.priceCents,
        totalPriceCents: total,
        productId,
      });
    }

    const taxCents = Math.round(subtotal * 0.25);
    const totalCents = subtotal + taxCents;
    const createdAt = dateOffset(daysAgo);

    const shippingAddr = JSON.stringify({ street: "Demovägen 1", city: "Stockholm", postalCode: "11122", country: "SE" });
    const orderRows: Array<{ id: string }> = await sql`
      INSERT INTO orders (
        store_account_id, order_number, customer_id,
        customer_email, customer_first_name, customer_last_name,
        status, payment_status, fulfillment_status,
        subtotal_cents, tax_cents, total_cents, currency,
        shipping_address, created_at, updated_at
      )
      VALUES (
        ${storeId}, ${orderNumber}, ${customerId},
        ${customerEmail}, ${firstName}, ${lastName},
        ${status}, ${paymentStatus}, ${status === "delivered" ? "fulfilled" : status === "shipped" ? "partial" : "unfulfilled"},
        ${subtotal}, ${taxCents}, ${totalCents}, 'SEK',
        ${shippingAddr}::jsonb,
        ${createdAt.toISOString()}, ${createdAt.toISOString()}
      )
      ON CONFLICT (store_account_id, order_number) DO UPDATE SET
        status = EXCLUDED.status, updated_at = now()
      RETURNING id
    `.catch(() => []) as Array<{ id: string }>;

    const orderId = orderRows[0]?.id;
    if (!orderId) continue;

    // Insert order items
    for (const item of itemsToInsert) {
      await sql`
        INSERT INTO order_items (
          order_id, store_account_id, product_id,
          title, sku, quantity, unit_price_cents, total_price_cents, tax_cents
        )
        VALUES (
          ${orderId}, ${storeId}, ${item.productId},
          ${item.title}, ${item.sku}, ${item.quantity},
          ${item.unitPriceCents}, ${item.totalPriceCents}, ${Math.round(item.totalPriceCents * 0.2)}
        )
        ON CONFLICT DO NOTHING
      `.catch(() => {});
    }
  }
}

// ── Demo A: Webshop ───────────────────────────────────────────────────────────

async function seedWebshopDemo(): Promise<void> {
  console.log("  🛒 Demo A: SportGear Webshop…");

  const storeId = await upsertStoreAccount("demo-webshop", "SportGear AB", "growth");
  await upsertUser("demo-webshop@shopman.dev", "Demo Webshop Admin", storeId);
  await clearStoreData(storeId);

  const categoryIds = await seedCategories(storeId, [
    { name: "Skor", slug: "skor", sortOrder: 1 },
    { name: "Kläder", slug: "klader", sortOrder: 2 },
    { name: "Tillbehör", slug: "tillbehor", sortOrder: 3 },
    { name: "Yoga", slug: "yoga", sortOrder: 4 },
    { name: "Styrketräning", slug: "styrketraning", sortOrder: 5 },
    { name: "Elektronik", slug: "elektronik", sortOrder: 6 },
  ]);

  const brandIds = await seedBrands(storeId, [
    { name: "RunPro", slug: "runpro" },
    { name: "FlexGear", slug: "flexgear" },
    { name: "EliteForce", slug: "eliteforce" },
    { name: "TechFit", slug: "techfit" },
  ]);

  const products: ProductSeed[] = [
    {
      name: "Premium Löparskor X400",
      priceCents: 129500,
      compareAtPriceCents: 159500,
      inventoryQuantity: 23,
      sku: "SHOE-X400-42",
      categorySlug: "skor",
      brandSlug: "runpro",
      description: "Professionella löparskor med reaktivt mellansula och andningsbar ovandel.",
    },
    {
      name: "Träningsjacka ThermoFlex",
      priceCents: 89500,
      inventoryQuantity: 8,
      sku: "JKT-THFX-M",
      categorySlug: "klader",
      brandSlug: "flexgear",
      description: "Värmeisolerande träningsjacka perfekt för utomhusträning i kallt väder.",
    },
    {
      name: "Kompressionsstrumpor Pro",
      priceCents: 24500,
      compareAtPriceCents: 29900,
      inventoryQuantity: 45,
      sku: "SOCK-COMP-L",
      categorySlug: "tillbehor",
      brandSlug: "runpro",
      description: "Graderade kompressionsstrumpor förbättrar cirkulationen under och efter träning.",
    },
    {
      name: "Sportflaska 750ml BPA-fri",
      priceCents: 19900,
      inventoryQuantity: 67,
      sku: "BTL-750-BLK",
      categorySlug: "tillbehor",
      description: "Dubbelväggig sportflaska med snabbventil. Håller dryck kall i 24 timmar.",
    },
    {
      name: "Yogamatta Eko Premium",
      priceCents: 54900,
      inventoryQuantity: 12,
      sku: "YOGA-ECO-6MM",
      categorySlug: "yoga",
      brandSlug: "flexgear",
      description: "6mm tjock yogamatta av naturligt gummi. Extra halkfri yta.",
    },
    {
      name: "Hantlar Set 2×10kg",
      priceCents: 149500,
      compareAtPriceCents: 179500,
      inventoryQuantity: 5,
      sku: "DUMB-10KG-SET",
      categorySlug: "styrketraning",
      brandSlug: "eliteforce",
      description: "Gjutjärnshantlar med gummibeklädnad. Inkluderar förvaringsstativ.",
    },
    {
      name: "Träningsbälte Läder XL",
      priceCents: 64900,
      inventoryQuantity: 9,
      sku: "BELT-LTH-XL",
      categorySlug: "styrketraning",
      brandSlug: "eliteforce",
      description: "Handstingat läderbälte för tungt lyft. Bred ryggstödd design.",
    },
    {
      name: "GPS-klocka Endure 3",
      priceCents: 329500,
      compareAtPriceCents: 399500,
      inventoryQuantity: 3,
      sku: "GPS-END3-BLK",
      categorySlug: "elektronik",
      brandSlug: "techfit",
      description: "GPS-sportklocka med puls, VO2max-estimering och 14 dagars batteritid.",
    },
  ];

  const productIds = await seedProducts(storeId, products, categoryIds, brandIds);

  const customerIds = await seedCustomers(storeId, [
    { firstName: "Maria", lastName: "Lindqvist", email: "maria.l@example.com" },
    { firstName: "Johan", lastName: "Svensson", email: "jsvensson@example.com" },
    { firstName: "Anna", lastName: "Berg", email: "anna.berg@example.com" },
    { firstName: "Erik", lastName: "Karlsson", email: "e.karlsson@example.com" },
    { firstName: "Sofia", lastName: "Nilsson", email: "s.nilsson@example.com" },
    { firstName: "Lars", lastName: "Hansson", email: "l.hansson@example.com" },
  ]);

  await seedOrders(storeId, customerIds, productIds, products, 18);

  console.log(`    ✅ Webshop seeded: ${products.length} products, 6 customers, 18 orders`);
}

// ── Demo B: Multishop ─────────────────────────────────────────────────────────

async function seedMultishopDemo(): Promise<void> {
  console.log("  🏪 Demo B: SportGroup Multishop…");

  const storeId = await upsertStoreAccount("demo-multishop", "SportGroup AB", "growth");
  await upsertUser("demo-multishop@shopman.dev", "Demo Multishop Admin", storeId);
  await clearStoreData(storeId);

  // Create shops
  for (const shop of [
    { name: "NordicSport", slug: "nordicsport", currency: "SEK", sortOrder: 1 },
    { name: "YogaStudio", slug: "yogastudio", currency: "SEK", sortOrder: 2 },
    { name: "GymWarehouse", slug: "gymwarehouse", currency: "SEK", sortOrder: 3 },
  ]) {
    await sql`
      INSERT INTO shops (store_account_id, name, slug, is_active, currency, sort_order)
      VALUES (${storeId}, ${shop.name}, ${shop.slug}, TRUE, ${shop.currency}, ${shop.sortOrder})
      ON CONFLICT (store_account_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
    `.catch(() => {});
  }

  const categoryIds = await seedCategories(storeId, [
    { name: "Skor", slug: "skor", sortOrder: 1 },
    { name: "Kläder", slug: "klader", sortOrder: 2 },
    { name: "Yoga", slug: "yoga", sortOrder: 3 },
    { name: "Styrka", slug: "styrka", sortOrder: 4 },
  ]);

  const brandIds = await seedBrands(storeId, [
    { name: "NordicRun", slug: "nordicrun" },
    { name: "YogaFlow", slug: "yogaflow" },
    { name: "IronGym", slug: "irongym" },
  ]);

  const products: ProductSeed[] = [
    {
      name: "Löparskor XPro 3",
      priceCents: 119500,
      inventoryQuantity: 18,
      sku: "NS-LPS-42",
      categorySlug: "skor",
      brandSlug: "nordicrun",
      description: "Lättviktslöparskor med energiåtergivande sula.",
    },
    {
      name: "Kompressionstights",
      priceCents: 54900,
      inventoryQuantity: 24,
      sku: "NS-KTG-S",
      categorySlug: "klader",
      brandSlug: "nordicrun",
      description: "Kompressionstigths med 4-vägssträckning för maximal rörlighet.",
    },
    {
      name: "Yogamatta Eko 6mm",
      priceCents: 54900,
      inventoryQuantity: 21,
      sku: "YS-MAT-6",
      categorySlug: "yoga",
      brandSlug: "yogaflow",
      description: "Naturmaterial yogamatta med halkfri textur.",
    },
    {
      name: "Hantlar 2×15kg Gummi",
      priceCents: 179500,
      inventoryQuantity: 6,
      sku: "GW-HAN-15",
      categorySlug: "styrka",
      brandSlug: "irongym",
      description: "Gummibeklädda gjutjärnshantlar i par om 15kg.",
    },
    {
      name: "Träningsbänk Justerbar",
      priceCents: 249500,
      inventoryQuantity: 4,
      sku: "GW-BENCH-ADJ",
      categorySlug: "styrka",
      brandSlug: "irongym",
      description: "7-lägeskonfigurerbar träningsbänk med stabil stålram.",
    },
    {
      name: "Yogablock Kork 2-pack",
      priceCents: 22900,
      inventoryQuantity: 32,
      sku: "YS-BLOCK-2P",
      categorySlug: "yoga",
      brandSlug: "yogaflow",
      description: "Ekologiska korkblock för fördjupning i yogaövningar.",
    },
  ];

  const productIds = await seedProducts(storeId, products, categoryIds, brandIds);

  const customerIds = await seedCustomers(storeId, [
    { firstName: "Lena", lastName: "Ström", email: "lena.strom@example.com" },
    { firstName: "Tobias", lastName: "Ekman", email: "t.ekman@example.com" },
    { firstName: "Petra", lastName: "Lindgren", email: "petra.l@example.com" },
    { firstName: "Marcus", lastName: "Björk", email: "m.bjork@example.com" },
  ]);

  await seedOrders(storeId, customerIds, productIds, products, 12);

  console.log(`    ✅ Multishop seeded: 3 shops, ${products.length} products, 12 orders`);
}

// ── Demo C: Marketplace ───────────────────────────────────────────────────────

async function seedMarketplaceDemo(): Promise<void> {
  console.log("  🌐 Demo C: Handelslösning för flera butiker…");

  const accounts: Array<{
    slug: string;
    name: string;
    ownerName: string;
    email: string;
    plan: string;
    categories: Array<{ name: string; slug: string }>;
    brands: Array<{ name: string; slug: string }>;
    products: ProductSeed[];
  }> = [
    {
      slug: "demo-marketplace-vintage",
      name: "Vintagebutiken",
      ownerName: "Clara Johansson",
      email: "demo-vintage@shopman.dev",
      plan: "growth",
      categories: [
        { name: "Kläder", slug: "klader" },
        { name: "Hem & Inredning", slug: "hem" },
        { name: "Accessoarer", slug: "accessoarer" },
      ],
      brands: [
        { name: "Vintage Dreams", slug: "vintage-dreams" },
        { name: "Retro Revival", slug: "retro-revival" },
      ],
      products: [
        { name: "Vintage Läderjacka 70-tal", priceCents: 149500, inventoryQuantity: 2, sku: "VB-JKT-70", categorySlug: "klader", brandSlug: "vintage-dreams", description: "Äkta vintage-jacka från 70-talet i brunt läder." },
        { name: "Retro Porslinssett", priceCents: 89500, inventoryQuantity: 5, sku: "VB-POR-SET", categorySlug: "hem", brandSlug: "retro-revival", description: "6-delars porslinssett i 60-talsstil." },
        { name: "Tygsväska Handmålad", priceCents: 44900, inventoryQuantity: 8, sku: "VB-BAG-HND", categorySlug: "accessoarer", brandSlug: "vintage-dreams", description: "Unik handmålad tygkasse i bomull." },
        { name: "Vintage Väggklocka Mässing", priceCents: 129500, inventoryQuantity: 3, sku: "VB-CLK-MSS", categorySlug: "hem", brandSlug: "retro-revival", description: "Mässingsur från 1960-talet. Kvartsverk bytt." },
      ],
    },
    {
      slug: "demo-marketplace-eco",
      name: "EkoGardin",
      ownerName: "Mattias Strand",
      email: "demo-ekogardin@shopman.dev",
      plan: "starter",
      categories: [
        { name: "Hem & Inredning", slug: "hem" },
        { name: "Textil", slug: "textil" },
      ],
      brands: [
        { name: "EcoHome", slug: "ecohome" },
        { name: "NaturFiber", slug: "naturfiber" },
      ],
      products: [
        { name: "Ekologisk Linen Gardin", priceCents: 64900, inventoryQuantity: 18, sku: "EG-LIN-120", categorySlug: "hem", brandSlug: "ecohome", description: "Certifierat ekologiskt linne. Bredd 120cm." },
        { name: "Bambu Rullgardin 120cm", priceCents: 44900, inventoryQuantity: 12, sku: "EG-BRG-120", categorySlug: "hem", brandSlug: "naturfiber", description: "Mörkläggande bamburullgardin. Enkel montering." },
        { name: "Återvunnen Ylletäcke", priceCents: 119500, inventoryQuantity: 7, sku: "EG-YLE-TAC", categorySlug: "textil", brandSlug: "naturfiber", description: "100% återvunnen ull i grå melering." },
        { name: "Hamnpinneväv Kuddfodral", priceCents: 29900, inventoryQuantity: 25, sku: "EG-KUD-HPN", categorySlug: "textil", brandSlug: "ecohome", description: "Handvävt kuddfodral 50×50cm. Dragkedja i mässing." },
      ],
    },
    {
      slug: "demo-marketplace-tech",
      name: "TechNord AB",
      ownerName: "David Lindqvist",
      email: "demo-technord@shopman.dev",
      plan: "growth",
      categories: [
        { name: "Tillbehör", slug: "tillbehor" },
        { name: "Produktivitet", slug: "produktivitet" },
        { name: "Ljud", slug: "ljud" },
      ],
      brands: [
        { name: "NordTech", slug: "nordtech" },
        { name: "PixelKey", slug: "pixelkey" },
      ],
      products: [
        { name: "USB-C Hub 10-i-1", priceCents: 54900, inventoryQuantity: 45, sku: "TN-HUB-10", categorySlug: "tillbehor", brandSlug: "nordtech", description: "USB-C-hubb med HDMI 4K, SD-kort, 3×USB-A, Ethernet." },
        { name: "Mekaniskt tangentbord TKL", priceCents: 119500, inventoryQuantity: 12, sku: "TN-KEY-TKL", categorySlug: "produktivitet", brandSlug: "pixelkey", description: "Tenkeyless mekaniskt tangentbord med Cherry MX Brown switchar." },
        { name: "Brusreducerande Headset", priceCents: 149500, compareAtPriceCents: 199500, inventoryQuantity: 8, sku: "TN-HEAD-ANC", categorySlug: "ljud", brandSlug: "nordtech", description: "Trådlöst ANC-headset med 30h batteritid." },
        { name: "Ergonomisk Musplatta XL", priceCents: 19900, inventoryQuantity: 60, sku: "TN-PAD-XL", categorySlug: "tillbehor", brandSlug: "nordtech", description: "900×400mm gaming/kontorsmatta i tyg." },
      ],
    },
    {
      slug: "demo-marketplace-kids",
      name: "BarnLeksaker",
      ownerName: "Karin Magnusson",
      email: "demo-barnleksaker@shopman.dev",
      plan: "starter",
      categories: [
        { name: "Leksaker", slug: "leksaker" },
        { name: "Spel & Pussel", slug: "spel" },
        { name: "Utomhus", slug: "utomhus" },
      ],
      brands: [
        { name: "TräVärld", slug: "travärld" },
        { name: "LekSmart", slug: "leksmart" },
      ],
      products: [
        { name: "Träleksaker Set Djungeldjur", priceCents: 44900, inventoryQuantity: 22, sku: "BL-TRA-JUG", categorySlug: "leksaker", brandSlug: "travärld", description: "12-delars träset med djungeldjur. Lämpar sig från 18 månader." },
        { name: "Pussel 200 bitar Natur", priceCents: 19900, inventoryQuantity: 15, sku: "BL-PUZ-200", categorySlug: "spel", brandSlug: "leksmart", description: "Pedagogiskt naturpussel. Stor bitsstorlek för barn 4+." },
        { name: "Sandlåda med Lock 150cm", priceCents: 149500, inventoryQuantity: 5, sku: "BL-SND-150", categorySlug: "utomhus", brandSlug: "travärld", description: "Galvaniserad stål sandlåda med lock. Inkluderar leksaksset." },
        { name: "Balcyklar Balance 12\"", priceCents: 99500, compareAtPriceCents: 129500, inventoryQuantity: 10, sku: "BL-BAL-12", categorySlug: "utomhus", brandSlug: "leksmart", description: "Justerbara balanscyklar i aluminium. Vikt 3,2kg." },
      ],
    },
  ];

  for (const acc of accounts) {
    const storeId = await upsertStoreAccount(acc.slug, acc.name, acc.plan);
    await upsertUser(acc.email, acc.ownerName, storeId);
    await clearStoreData(storeId);

    const categoryIds = await seedCategories(storeId, acc.categories);
    const brandIds = await seedBrands(storeId, acc.brands);
    const productIds = await seedProducts(storeId, acc.products, categoryIds, brandIds);

    const customerIds = await seedCustomers(storeId, [
      { firstName: "Alex", lastName: "Demo", email: `customer1@${acc.slug}.example.com` },
      { firstName: "Sam", lastName: "Test", email: `customer2@${acc.slug}.example.com` },
      { firstName: "Kim", lastName: "Exempelsson", email: `customer3@${acc.slug}.example.com` },
    ]);

    await seedOrders(storeId, customerIds, productIds, acc.products, 6);

    console.log(`    ✅ ${acc.name}: ${acc.products.length} products, 3 customers, 6 orders`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runDemoSeed(): Promise<void> {
  await seedWebshopDemo();
  await seedMultishopDemo();
  await seedMarketplaceDemo();
}

async function main() {
  console.log("🌱 ShopMan demo seed\n");

  try {
    await runDemoSeed();
    console.log("\n✅ All demo data seeded successfully");
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Only run when executed directly (not when imported by workers.ts)
// Using ESM-compatible check
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
