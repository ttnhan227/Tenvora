import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Pricing from "@/components/landing/Pricing";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5291/api";

const Index = () => {
  useEffect(() => {
    // Wake the Render backend as soon as a visitor reaches the landing page.
    void fetch(`${API_BASE_URL}/health`).catch(() => {
      // A sleeping backend can take a while to start; don't block the landing page.
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
