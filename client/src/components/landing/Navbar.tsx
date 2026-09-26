import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Navbar() {
  const auth = useOptionalAuth();
  return <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-xl">
    <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
      <BrandLogo to="/" size="md" />
      <div className="flex items-center gap-2"><ThemeToggle />
        {auth?.isAuthenticated ? <Button asChild size="sm"><Link to="/dashboard">Open workspace<ArrowRight className="ml-2 h-4 w-4" /></Link></Button> : <>
          <Button asChild variant="ghost" size="sm"><Link to="/login">Sign in</Link></Button>
          <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/register">Start my notebook</Link></Button>
        </>}
      </div>
    </div>
  </header>;
}
