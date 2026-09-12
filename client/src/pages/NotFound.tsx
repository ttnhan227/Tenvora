import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.warn("404: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6 font-sans">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <BrandLogo size="lg" to="" />
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-8 shadow-sm space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-primary font-mono">
            404
          </h1>
          <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Page Not Found
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has moved. Head back to your freelancer dashboard or home screen.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button asChild className="text-xs font-semibold">
              <Link to="/dashboard">
                <Home size={14} className="mr-1.5" /> Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="text-xs">
              <Link to="/">
                <ArrowLeft size={14} className="mr-1.5" /> Return to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
