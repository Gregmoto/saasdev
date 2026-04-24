import { Card, CardHeader, CardTitle, CardContent } from "@saas-shop/ui";

const INTEGRATIONS = [
  {
    name: "Shopify",
    icon: "🛍️",
    description: "Sync products, orders, and customers from your Shopify store.",
    status: "Available",
  },
  {
    name: "WooCommerce",
    icon: "🛒",
    description: "Import data from your WooCommerce / WordPress shop.",
    status: "Available",
  },
  {
    name: "PrestaShop",
    icon: "🏬",
    description: "Connect your PrestaShop catalog and orders.",
    status: "Available",
  },
  {
    name: "Stripe",
    icon: "💳",
    description: "Process payments and manage subscriptions via Stripe.",
    status: "Available",
  },
  {
    name: "Klarna",
    icon: "🏦",
    description: "Offer buy-now-pay-later checkout powered by Klarna.",
    status: "Coming soon",
  },
  {
    name: "Mailchimp",
    icon: "📧",
    description: "Sync your customer list and automate email campaigns.",
    status: "Coming soon",
  },
  {
    name: "Google Shopping",
    icon: "🔍",
    description: "Publish your product feed to Google Shopping.",
    status: "Coming soon",
  },
  {
    name: "Meta Ads",
    icon: "📣",
    description: "Connect your catalog to Facebook and Instagram Ads.",
    status: "Coming soon",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Integrations</h1>
        <p className="text-zinc-500 mt-1">
          Connect your store with third-party services.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {INTEGRATIONS.map((item) => (
          <Card key={item.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">{item.icon}</span>
                {item.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-3">{item.description}</p>
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                  item.status === "Available"
                    ? "bg-green-100 text-green-700"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {item.status}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
