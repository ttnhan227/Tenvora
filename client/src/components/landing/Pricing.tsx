import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const tiers = [
  {
    id: "starter",
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For small teams automating expense collection and review.",
    features: [
      "Up to 500 expenses / month",
      "OCR receipt field extraction",
      "Basic policy guardrails",
      "Email alerts & digests",
      "3 team seats",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$79",
    period: "/mo",
    description: "For growing organizations requiring risk scoring and accounting sync.",
    features: [
      "Up to 5,000 expenses / month",
      "Multi-signal risk engine",
      "Fast-entry spreadsheet ledger",
      "Priority review queue",
      "15 team seats",
      "QuickBooks & Xero export",
      "Custom category limits",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Tailored governance solutions for regulated enterprises.",
    features: [
      "Unlimited expense volume",
      "Reviewer model calibration",
      "SOX 404 & SOC 2 compliance hub",
      "Dedicated account engineer",
      "Unlimited team seats",
      "Custom ERP data connectors",
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
    <section id="pricing" className="py-16 font-sans text-xs">
      <div className="container mx-auto px-4 max-w-5xl space-y-10">
        <div className="text-center space-y-2 max-w-lg mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Predictable Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Clear tiers built for every team scale
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-md border p-5 flex flex-col justify-between space-y-4 bg-card ${
                tier.popular ? "border-foreground ring-1 ring-foreground" : "border-border"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-foreground">{tier.name}</h3>
                  {tier.popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[hsl(var(--accent-signal))] text-black">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{tier.description}</p>
                <div className="font-mono pt-1">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  {tier.period && <span className="text-xs text-muted-foreground">{tier.period}</span>}
                </div>

                <ul className="space-y-2 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => handleSelectPlan(tier.id)}
                size="xs"
                variant={tier.popular ? "signal" : "default"}
                className="w-full font-bold h-8"
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
