import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Calendar, Newspaper, ArrowRight, Building2, Landmark, Globe, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NEWS_ARTICLES } from "@/data/newsArticles";
import { intelligenceService, ExternalArticle } from "@/services/intelligenceService";

export default function NewsMedia() {
  const [articles, setArticles] = useState<ExternalArticle[]>([]);

  useEffect(() => {
    async function load() {
      const res = await intelligenceService.getFeed(undefined, undefined, 3);
      if (res.success && res.data && res.data.articles.length > 0) {
        setArticles(res.data.articles.slice(0, 3));
      } else {
        setArticles(
          NEWS_ARTICLES.slice(0, 3).map((a) => ({
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
    }
    load();
  }, []);

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
    <section id="news" className="py-24 border-t border-border/60 bg-muted/20 relative">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#C7D2FE] bg-[#EEF2FF] text-[#3730A3] dark:bg-[#312E81]/30 dark:text-[#A5B4FC] font-mono text-[11px] font-bold">
              <Newspaper className="h-3.5 w-3.5" />
              LIVE FINANCIAL ECOSYSTEM &amp; RESEARCH FEEDS
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Real-World Intelligence from Central Banks &amp; Industry Leaders
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Official publications, supervisory guidance, and infrastructure research from the Federal Reserve, European Central Bank, BIS, and Finextra.
            </p>
          </div>

          <div>
            <Link to="/news">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold rounded-md border-border bg-card">
                View All Live Feeds &amp; Reports
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Article Cards Grid with Real Publisher Editorial Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((article) => {
            const Icon = getSourceIcon(article.sourceCategory);
            return (
              <Link
                key={article.id}
                to={`/news/${article.id}`}
                className="group bg-card border border-border rounded-lg overflow-hidden shadow-[0_1px_3px_rgba(60,66,87,0.06),0_0_1px_rgba(60,66,87,0.12)] hover:shadow-md transition-all duration-200 flex flex-col justify-between p-6"
              >
                <div className="space-y-4">
                  {/* Publisher Header */}
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
                    <h3 className="text-base font-bold text-foreground group-hover:text-[#635BFF] transition-colors leading-snug line-clamp-2">
                      {article.title}
                    </h3>

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
      </div>
    </section>
  );
}
