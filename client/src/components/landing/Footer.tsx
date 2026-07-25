const Footer = () => {
  return (
    <footer className="border-t border-border/60 bg-background py-12">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
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
