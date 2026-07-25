import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const CTA = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/subscription?plan=professional");
    } else {
      navigate("/register");
    }
  };

  return (
    <section className="relative overflow-hidden bg-hero py-24">
      <div className="pointer-events-none absolute inset-0 bg-glow-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_35%,transparent_70%,hsl(var(--secondary-foreground)/0.12))]" />
      <div className="container relative mx-auto px-4 text-center">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-card/70 px-6 py-14 shadow-[0_28px_80px_-50px_rgba(0,0,0,0.8)] backdrop-blur-sm md:px-10">
        <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
          Ready to verify every expense?
        </h2>
        <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">
          Use VeriSpend to automate receipt review, policy checks, and approval workflows.
        </p>
        <Button size="lg" className="gap-2 rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 shadow-[0_18px_48px_-20px_hsl(var(--primary))]" onClick={handleGetStarted}>
          {isAuthenticated ? "Choose Your Plan" : "Start Free Trial"} <ArrowRight className="h-4 w-4" />
        </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;
