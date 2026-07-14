import { ShieldCheck } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/60 bg-background py-12">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <ShieldCheck className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="block font-bold text-foreground">VeriSpend</span>
            <span className="block text-xs text-muted-foreground">AI-powered expense review and compliance</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 VeriSpend. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
