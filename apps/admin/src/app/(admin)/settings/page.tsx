import { Card, CardHeader, CardTitle, CardContent } from "@saas-shop/ui";

const SECTIONS = [
  {
    title: "Account",
    icon: "👤",
    description: "Manage your store name, contact email, and timezone.",
    fields: ["Store name", "Contact email", "Timezone", "Currency"],
  },
  {
    title: "Team",
    icon: "👥",
    description: "Invite team members and manage their roles and permissions.",
    fields: ["Members", "Pending invites", "Roles"],
  },
  {
    title: "Billing",
    icon: "💳",
    description: "View your current plan, invoices, and payment methods.",
    fields: ["Current plan", "Next billing date", "Payment method"],
  },
  {
    title: "Security",
    icon: "🔒",
    description:
      "Configure two-factor authentication and review active sessions.",
    fields: [
      "Two-factor authentication",
      "Active sessions",
      "Password policy",
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-zinc-500 mt-1">Manage your store configuration.</p>
      </div>
      <div className="space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{section.icon}</span>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500 mb-4">{section.description}</p>
              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div
                    key={field}
                    className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                  >
                    <span className="text-sm font-medium text-zinc-700">
                      {field}
                    </span>
                    <span className="text-sm text-zinc-400">—</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
