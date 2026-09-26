import { BrandLogo } from "@/components/BrandLogo";

export default function Footer() {
  return <footer className="border-t bg-card/60"><div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6">
    <div><BrandLogo to="/" size="sm" /><p className="mt-3 max-w-sm">A friendly digital business notebook for small and local businesses.</p></div>
    <p>© {new Date().getFullYear()} Tenvora · Record it once.</p>
  </div></footer>;
}
