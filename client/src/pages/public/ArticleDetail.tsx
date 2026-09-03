import React, { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { NEWS_ARTICLES } from "@/data/newsArticles";
import { intelligenceService, ExternalArticle } from "@/services/intelligenceService";
import { ArrowLeft, Calendar, BookOpen, ExternalLink, Scale, Landmark, ShieldCheck, Building2, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ExternalArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (!slug) return;

      // 1. Try finding by ID directly from API
      const res = await intelligenceService.getArticleById(slug);
      if (res.success && res.data) {
        setArticle(res.data);
        setLoading(false);
        return;
      }

      // 2. Try searching feed
      const feedRes = await intelligenceService.getFeed();
      if (feedRes.success && feedRes.data) {
        const found = feedRes.data.articles.find(
          (a) => a.id === slug || a.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").includes(slug)
        );
        if (found) {
          setArticle(found);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to static verified articles
      const staticFound = NEWS_ARTICLES.find((a) => a.id === slug || a.slug === slug);
      if (staticFound) {
        setArticle({
          id: staticFound.id,
          source: staticFound.source,
          sourceCategory: staticFound.category,
          title: staticFound.title,
          summary: staticFound.excerpt,
          canonicalUrl: staticFound.canonicalUrl,
          publishedAt: staticFound.date,
          retrievedAt: new Date().toISOString(),
          language: "en",
          contentHash: staticFound.id,
          operationalImpactTag: staticFound.operationalImpactTag,
          tenvoraAnalysis: staticFound.tenvoraAnalysis,
        });
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (!loading && !article) {
    return <Navigate to="/news" replace />;
  }

  if (loading || !article) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center font-sans">
        <div className="text-xs font-mono text-muted-foreground animate-pulse">
          Loading verified intelligence report...
        </div>
      </div>
    );
  }

  const getSourceIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "regulatory":
        return Landmark;
      case "research":
        return Globe;
      case "infrastructure":
        return Layers;
      default:
        return Building2;
    }
  };

  const Icon = getSourceIcon(article.sourceCategory);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-24">
        <article className="container mx-auto px-4 max-w-4xl">
          {/* Back link */}
          <div className="mb-8">
            <Link to="/news">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Intelligence Feeds
              </Button>
            </Link>
          </div>

          {/* Article Header */}
          <header className="space-y-4 pb-8 border-b border-border/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#6366F1]/40">
                {article.sourceCategory}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-muted text-muted-foreground border border-border">
                Source: {article.source}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              {article.title}
            </h1>

            {/* Author & Meta Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-[#EEF2FF] dark:bg-[#312E81]/40 border border-[#C7D2FE] dark:border-[#6366F1]/40 flex items-center justify-center text-[#635BFF]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">{article.source}</p>
                  <p className="text-xs text-muted-foreground">Official Institutional Publication</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.publishedAt).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-[#0E6251] dark:text-[#6EE7B7]">
                  <ShieldCheck className="h-4 w-4 text-[#00D924]" />
                  Verified Feed
                </span>
              </div>
            </div>
          </header>

          {/* Key Takeaways Card */}
          <Card className="border border-[#C7D2FE] bg-[#EEF2FF]/40 dark:bg-[#312E81]/15 dark:border-[#6366F1]/30 my-8 shadow-xs">
            <CardContent className="p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3730A3] dark:text-[#A5B4FC] font-mono flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#635BFF]" />
                Official Executive Summary
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {article.summary}
              </p>
            </CardContent>
          </Card>

          {/* Tenvora Operational Impact Note */}
          {article.tenvoraAnalysis && (
            <Card className="border border-border bg-card my-8 shadow-xs">
              <CardContent className="p-6 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#635BFF]" />
                  Tenvora Operational Impact Assessment
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {article.tenvoraAnalysis}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Primary Outbound Call to Action to Canonical Source */}
          <div className="p-6 rounded-lg border border-border bg-card shadow-sm space-y-4 my-10 text-center sm:text-left sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground font-sans">
                Read the Complete Report on the Official Source
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Canonical: <code className="font-mono text-[#635BFF] break-all">{article.canonicalUrl}</code>
              </p>
            </div>

            <a
              href={article.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#635BFF] hover:bg-[#533AFD] text-white font-bold text-xs shadow-xs mt-4 sm:mt-0 shrink-0"
            >
              <span>Read on {article.source}</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
