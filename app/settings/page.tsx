import Link from "next/link";
import { BarChart3, Search, Settings2 } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { SettingsNav } from "../src/components/settings/SettingsNav";
import { Card } from "../src/components/ui/card";

const settingCards = [
  {
    href: "/settings/seo",
    title: "SEO Settings",
    description:
      "Manage site identity, social defaults, robots behavior, sale visibility, and free delivery amount.",
    icon: Search,
  },
  {
    href: "/settings/pricing",
    title: "Pricing Rules",
    description:
      "Control vendor-price reduction rules and access the pricing tools used for imported products.",
    icon: Settings2,
  },
  {
    href: "/settings/pricing-audit",
    title: "Pricing Audit",
    description:
      "Audit imported pricing against product_input_jsons.input_json and run dry-run or small-batch syncs.",
    icon: BarChart3,
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<Settings2 />}
        title="Settings"
        description="Organize platform settings by area and open the tool you need."
      />

      <SettingsNav />

      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-3">
        {settingCards.map((card) => {
          const Icon = card.icon;

          return (
            <Link key={card.href} href={card.href} className="block">
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className="rounded-r1 bg-primary p-3 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">{card.title}</h2>
                    <p className="text-sm text-gray-500">{card.description}</p>
                    <span className="inline-flex text-sm font-medium text-primary">
                      Open
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}