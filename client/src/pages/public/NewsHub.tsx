import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { NEWS_ARTICLES } from "@/data/newsArticles";
import { intelligenceService, ExternalArticle } from "@/services/intelligenceService";
import { Newspaper, Calendar, ArrowRight, Search, Building2, Landmark, Globe, Layers, ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function NewsHub() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [articles, setArticles] = useState<ExternalArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await intelligenceService.getFeed(selectedCategory === "ALL" ? undefined : selectedCategory);
      if (res.success && res.data && res.data.articles.length > 0) {
        setArticles(res.data.articles);
      } else {
        // Fallback to static verified articles
        setArticles(
          NEWS_ARTICLES.map((a) => ({
            id: a.id,
            source: a.source,
            sourceCategory: a.category,
            title: a.title,
            summary: a.excerpt,
            canonicalUrl: a.canonicalUrl,
            publishedAt: a.date,
            retrievedAt: new Date().toISOString(),
            language: "en",
            contentHash: a.id,
            operationalImpactTag: a.operationalImpactTag,
            tenvoraAnalysis: a.tenvoraAnalysis,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, [selectedCategory]);

  const categories = [
    "ALL",
    "Regulatory",
    "Research",
    "Payments",
    "Infrastructure",
  ];

  const filteredArticles = articles.filter((article) => {
    const q = search.toLowerCase();
    const matchesSearch =
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.source.toLowerCase().includes(q) ||
      (article.operationalImpactTag && article.operationalImpactTag.toLowerCase().includes(q));

    const matchesCategory = selectedCategory === "ALL" || article.sourceCategory.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header Banner */}
          <div className="py-12 border-b border-border/80 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] font-mono text-[11px] font-bold">
              <Newspaper className="h-3.5 w-3.5" />
              FINANCIAL INTELLIGENCE, RESEARCH &amp; REGULATORY FEEDS
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Real-World Financial Architecture &amp; Industry Bulletins
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Official publications, regulatory supervision updates, and payment infrastructure research from the Federal Reserve, European Central Bank, Bank for International Settlements, and leading fintech journals.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-semibold rounded-md px-3.5 h-8 ${
                    selectedCategory === cat
                      ? "bg-[#635BFF] hover:bg-[#533AFD] text-white shadow-xs"
                      : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "ALL" ? "All Live Sources" : cat}
                </Button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search real reports & topics..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs rounded-md h-9"
              />
            </div>
          </div>

          {/* Articles Grid with Authentic Authoritative Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
            {filteredArticles.map((article) => {
              const Icon = getSourceIcon(article.sourceCategory);
              return (
                <Link
                  key={article.id}
                  to={`/news/${article.id}`}
                  className="group bg-card border border-border rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)] hover:shadow-md transition-all duration-200 flex flex-col justify-between p-6"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-[#EEF2FF] dark:bg-[#312E81]/40 border border-[#C7D2FE] dark:border-[#6366F1]/40 flex items-center justify-center text-[#635BFF]">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-foreground font-mono">
                          {article.source}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-muted text-muted-foreground border border-border">
                        {article.sourceCategory}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-foreground group-hover:text-[#635BFF] transition-colors leading-snug line-clamp-2">
                        {article.title}
                      </h2>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {article.summary}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/70 flex items-center justify-between text-xs font-semibold text-[#635BFF] group-hover:underline">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono font-normal">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono">
                      Inspect Report
                      <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredArticles.length === 0 && !loading && (
            <div className="text-center py-20 text-muted-foreground text-xs font-mono">
              No reports found matching your search term.
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
