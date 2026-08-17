import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "For small teams looking to automate expense controls.",
    features: [
      "Up to 500 expenses/month",
      "AI categorization & OCR",
      "Basic policy guardrails",
      "Email support",
      "3 user seats",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$79",
    period: "/month",
    description: "For growing companies needing automated audit workflows.",
    features: [
      "Up to 5,000 expenses/month",
      "Multi-signal risk engine",
      "Spreadsheet grid editor",
      "Priority review queue",
      "15 user seats",
      "QuickBooks & Xero export",
      "Custom policy limits",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored governance solutions for regulated organizations.",
    features: [
      "Unlimited expense volume",
      "Continuous policy training",
      "SOX audit log & SOC 2 reports",
      "Dedicated account manager",
      "Unlimited team seats",
      "Custom ERP integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const Pricing = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    if (!isAuthenticated) {
      navigate("/register");
    } else {
      navigate(`/subscription?plan=${planId}`);
    }
  };

  return (
    <section id="pricing" className="relative py-24 font-sans">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Simple, predictable <span className="text-primary">pricing</span>
          </h2>
          <p className="text-base text-muted-foreground">
            Clear tiers built for teams of all sizes. No hidden surcharges.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-xl border p-6 transition-all ${
                tier.popular
                  ? "border-primary bg-card shadow-md"
                  : "border-border bg-card shadow-sm hover:border-border/80"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  Recommended
                </div>
              )}

              <div className="mb-6">
                <h3 className="mb-1 text-lg font-bold text-foreground">{tier.name}</h3>
                <p className="mb-4 text-xs text-muted-foreground">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground font-mono">{tier.price}</span>
                  {tier.period && <span className="text-xs text-muted-foreground font-mono">{tier.period}</span>}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelectPlan(tier.id)}
                className={`w-full gap-2 rounded-lg text-xs font-semibold h-10 ${
                  tier.popular
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                size="default"
              >
                {tier.cta} {tier.popular && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
