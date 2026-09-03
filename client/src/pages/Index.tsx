import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import PlatformTour from "@/components/landing/PlatformTour";
import LedgerInteractiveDemo from "@/components/landing/LedgerInteractiveDemo";
import Features from "@/components/landing/Features";
import SecurityCompliance from "@/components/landing/SecurityCompliance";
import NewsMedia from "@/components/landing/NewsMedia";
import ApiExplorerPreview from "@/components/landing/ApiExplorerPreview";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635BFF]/20 selection:text-[#635BFF]">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <PlatformTour />
        <LedgerInteractiveDemo />
        <Features />
        <SecurityCompliance />
        <NewsMedia />
        <ApiExplorerPreview />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
