"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@saas-shop/ui";
import { cn } from "@saas-shop/ui";

const FAQS = [
  {
    question: "How do I add a new product?",
    answer:
      "Navigate to the Products page and click the 'Add product' button. Fill in the product details including title, SKU, price, and inventory levels, then click Save.",
  },
  {
    question: "How do I import products from Shopify?",
    answer:
      "Go to Integrations and connect your Shopify store. Once connected, head to Imports and create a new import job selecting 'Shopify' as the source.",
  },
  {
    question: "Can I manage multiple stores?",
    answer:
      "Yes. Use the shop switcher in the top-left sidebar to switch between your connected shops. Each shop maintains its own products, orders, and customers.",
  },
  {
    question: "How are orders synced?",
    answer:
      "Orders are synced in real time via webhooks when you have an active integration. You can also trigger a manual sync from the Imports page.",
  },
  {
    question: "How do I invite team members?",
    answer:
      "Go to Settings > Team and enter the email address of the person you want to invite. They will receive an email with instructions to join your store account.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is encrypted at rest and in transit. You can also enable two-factor authentication under Settings > Security for additional protection.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-zinc-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-zinc-50 transition-colors"
      >
        <span className="font-medium text-zinc-900">{question}</span>
        <span
          className={cn(
            "text-zinc-400 transition-transform ml-4 flex-shrink-0",
            open && "rotate-180"
          )}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-4 text-sm text-zinc-600">{answer}</div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">FAQ</h1>
        <p className="text-zinc-500 mt-1">Frequently asked questions.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Common Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {FAQS.map((faq) => (
            <FaqItem key={faq.question} {...faq} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
