import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../../hooks/require-auth.js";
import { requireStoreAccountContext } from "../../hooks/require-store-account.js";
import { storeFaqs } from "../../db/schema/store-faqs.js";
import { tickets } from "../../db/schema/tickets.js";
import { chatThreads } from "../../db/schema/chat.js";

const storePreHandler = [requireAuth, requireStoreAccountContext] as const;

interface FaqDraft {
  title: string;
  body: string;
}

// Rule-based FAQ templates based on keyword matching (Swedish)
const FAQ_TEMPLATES: Array<{ keywords: string[]; title: string; body: string }> = [
  {
    keywords: ["frakt", "leverans", "shipping", "deliver"],
    title: "Hur lång är leveranstiden?",
    body: "[AI-genererat utkast] Svar om leveranstider och fraktalternativ. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["retur", "återlämn", "return", "refund", "åter"],
    title: "Hur gör jag en retur?",
    body: "[AI-genererat utkast] Svar om returpolicy och hur kunden genomför en retur. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["betala", "betalning", "payment", "faktura", "kortbetalning"],
    title: "Vilka betalningsmetoder accepterar ni?",
    body: "[AI-genererat utkast] Svar om tillgängliga betalningsmetoder. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["lager", "stock", "lagersaldo", "slut", "tillgänglig"],
    title: "Hur vet jag om en produkt finns i lager?",
    body: "[AI-genererat utkast] Svar om lagerstatus och hur kunden håller sig uppdaterad om produkttillgänglighet. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["importera", "import", "csv", "fil", "excel"],
    title: "Hur importerar jag produkter?",
    body: "[AI-genererat utkast] Svar om hur man importerar produkter via CSV eller annan metod. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["konto", "login", "lösenord", "account", "password"],
    title: "Hur återställer jag mitt lösenord?",
    body: "[AI-genererat utkast] Svar om lösenordsåterställning och kontoinloggning. Uppdatera med din faktiska information.",
  },
  {
    keywords: ["rabatt", "kod", "coupon", "kampanj", "erbjudande"],
    title: "Hur använder jag en rabattkod?",
    body: "[AI-genererat utkast] Svar om hur man tillämpar rabattkoder vid köp. Uppdatera med din faktiska information.",
  },
];

function extractKeywords(texts: string[]): string[] {
  const combined = texts.join(" ").toLowerCase();
  const words = combined.split(/\s+/);
  const wordCount = new Map<string, number>();
  for (const word of words) {
    const clean = word.replace(/[^a-zåäö]/g, "");
    if (clean.length > 3) {
      wordCount.set(clean, (wordCount.get(clean) ?? 0) + 1);
    }
  }
  return [...wordCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([w]) => w);
}

function generateRuleBasedDrafts(keywords: string[]): FaqDraft[] {
  const matched: FaqDraft[] = [];
  const usedTemplates = new Set<number>();

  for (const keyword of keywords) {
    for (let i = 0; i < FAQ_TEMPLATES.length; i++) {
      if (usedTemplates.has(i)) continue;
      const template = FAQ_TEMPLATES[i]!;
      if (template.keywords.some((k) => keyword.includes(k) || k.includes(keyword))) {
        matched.push({ title: template.title, body: template.body });
        usedTemplates.add(i);
      }
      if (matched.length >= 5) break;
    }
    if (matched.length >= 5) break;
  }

  // Fill with generic if fewer than 3
  if (matched.length < 3) {
    for (let i = 0; i < FAQ_TEMPLATES.length && matched.length < 3; i++) {
      if (!usedTemplates.has(i)) {
        const template = FAQ_TEMPLATES[i]!;
        matched.push({ title: template.title, body: template.body });
        usedTemplates.add(i);
      }
    }
  }

  return matched;
}

async function callOpenAI(apiKey: string, ticketTexts: string[], chatTexts: string[]): Promise<FaqDraft[]> {
  const context = [
    ticketTexts.length > 0 ? `Support tickets:\n${ticketTexts.join("\n")}` : "",
    chatTexts.length > 0 ? `Chat messages:\n${chatTexts.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = context
    ? `Based on the following customer support data, generate exactly 5 FAQ drafts in Swedish that would help customers self-serve. Return a JSON array of objects with "title" and "body" fields only.\n\n${context}`
    : `Generate 5 common FAQ drafts in Swedish for an e-commerce store. Return a JSON array of objects with "title" and "body" fields only.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates FAQ drafts for e-commerce stores. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "[]";

  // Try to parse JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in OpenAI response");

  const parsed = JSON.parse(jsonMatch[0]) as unknown;
  if (!Array.isArray(parsed)) throw new Error("OpenAI response is not an array");

  return parsed
    .slice(0, 5)
    .map((item) => ({
      title: String((item as Record<string, unknown>).title ?? "FAQ"),
      body: `[AI-genererat utkast] ${String((item as Record<string, unknown>).body ?? "")}`,
    }));
}

export async function storeFaqsAiRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /api/faqs/ai-suggest ─────────────────────────────────────────────
  app.post(
    "/api/faqs/ai-suggest",
    { preHandler: [...storePreHandler] },
    async (request, reply) => {
      const storeId = request.storeAccount.id;

      // 1. Fetch last 20 support tickets
      let ticketTexts: string[] = [];
      try {
        const ticketRows = await app.db
          .select({ subject: tickets.subject })
          .from(tickets)
          .where(eq(tickets.storeAccountId, storeId))
          .orderBy(desc(tickets.createdAt))
          .limit(20);

        ticketTexts = ticketRows.map((t) => t.subject);
      } catch {
        // Table may not exist yet — fallback to empty
        ticketTexts = [];
      }

      // 2. Fetch last 10 chat threads
      let chatTexts: string[] = [];
      try {
        const chatRows = await app.db
          .select({ subject: chatThreads.subject })
          .from(chatThreads)
          .where(eq(chatThreads.storeAccountId, storeId))
          .orderBy(desc(chatThreads.createdAt))
          .limit(10);

        chatTexts = chatRows.map((c) => c.subject ?? "").filter(Boolean);
      } catch {
        chatTexts = [];
      }

      // 3. Generate suggestions
      const openAiKey = process.env["OPENAI_API_KEY"];
      let drafts: FaqDraft[] = [];

      if (openAiKey) {
        try {
          drafts = await callOpenAI(openAiKey, ticketTexts, chatTexts);
        } catch {
          // Fallback to rule-based on OpenAI error
          const keywords = extractKeywords([...ticketTexts, ...chatTexts]);
          drafts = generateRuleBasedDrafts(keywords);
        }
      } else {
        const keywords = extractKeywords([...ticketTexts, ...chatTexts]);
        drafts = generateRuleBasedDrafts(keywords);
      }

      // 4. Insert each draft as a store FAQ with status='draft'
      const insertedFaqs = [];
      for (const draft of drafts) {
        const [faq] = await app.db
          .insert(storeFaqs)
          .values({
            storeAccountId: storeId,
            title: draft.title,
            body: draft.body,
            status: "draft",
            isGlobal: false,
          })
          .returning();

        if (faq) {
          insertedFaqs.push(faq);
        }
      }

      return reply.status(201).send({ drafts: insertedFaqs, count: insertedFaqs.length });
    },
  );
}
