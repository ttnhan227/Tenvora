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
    <section className="border-t border-border bg-card py-16 font-sans text-xs">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <div className="rounded-md border border-border bg-muted/20 p-8 sm:p-12 space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Ready to bring forensic clarity to company spend?
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-md mx-auto">
            Automate receipt ingestion, enforce policy limits, and generate audit-ready evidence in minutes.
          </p>
          <div className="pt-2">
            <Button
              size="sm"
              variant="signal"
              onClick={handleGetStarted}
              className="font-bold gap-1.5 h-9 px-6"
            >
              {isAuthenticated ? "Select Subscription Tier" : "Start Free Trial"}{" "}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
