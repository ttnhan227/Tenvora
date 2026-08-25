const Footer = () => {
  return (
    <footer className="border-t border-border bg-background py-8 font-sans text-xs">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 max-w-6xl">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="h-5 w-5 object-contain" />
          <span className="font-bold text-foreground">VeriSpend</span>
          <span className="text-muted-foreground">• Corporate Expense & Compliance Intelligence</span>
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} VeriSpend Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
