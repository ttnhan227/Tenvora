import React, { useEffect, useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Radio,
  Building2,
  TrendingUp,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import {
  intelligenceService,
  ExternalArticle,
  MarketExchangeRate,
  IntelligenceSource,
} from "@/services/intelligenceService";

export default function IntelligenceHub() {
  const [articles, setArticles] = useState<ExternalArticle[]>([]);
  const [marketRates, setMarketRates] = useState<MarketExchangeRate[]>([]);
  const [sources, setSources] = useState<IntelligenceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Add Source State
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [sourceCategory, setSourceCategory] = useState("Central Banking");
  const [addingSource, setAddingSource] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [feedRes, ratesRes, sourcesRes] = await Promise.all([
      intelligenceService.getFeed(undefined, undefined, 50),
      intelligenceService.getMarketRates(),
      intelligenceService.getSources(),
    ]);

    if (feedRes.success && feedRes.data) setArticles(feedRes.data.articles);
    if (ratesRes.success && ratesRes.data) setMarketRates(ratesRes.data);
    if (sourcesRes.success && sourcesRes.data) setSources(sourcesRes.data);
    setLoading(false);
  }

  async function handleAddSource(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceName || !feedUrl) return;
    setAddingSource(true);
    const res = await intelligenceService.addSource({
      name: sourceName,
      feedUrl,
      category: sourceCategory,
      sourceType: "RSS",
    });
    setAddingSource(false);
    if (res.success) {
      setSourceDialogOpen(false);
      setSourceName("");
      setFeedUrl("");
      loadData();
    }
  }

  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchCat = categoryFilter === "ALL" || art.category.toLowerCase() === categoryFilter.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchQuery =
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.source.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [articles, categoryFilter, searchQuery]);

  const categories = [
    { label: "All Intelligence", value: "ALL" },
    { label: "Central Banking & Monetary Policy", value: "Central Banking" },
    { label: "Payment Infrastructure & Rails", value: "Payments" },
    { label: "BIS Research & Financial Stability", value: "Research" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground font-sans">
              Industry Intelligence &amp; FX Rates
            </h1>
            <p className="text-xs text-muted-foreground">
              Official bulletins from central banks, BIS working papers, payment rail updates, and ECB benchmark rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground bg-card"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-7 px-3 bg-foreground hover:bg-foreground/90 text-background text-xs font-semibold">
                  <Plus className="h-3 w-3 mr-1" />
                  Register Source Feed
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[440px] bg-card border border-border text-xs rounded-lg p-5">
                <form onSubmit={handleAddSource} className="space-y-3.5">
                  <DialogHeader className="space-y-1">
                    <DialogTitle className="text-sm font-bold flex items-center gap-2">
                      <Globe className="h-4 w-4 text-foreground" />
                      Register Regulatory RSS / XML Feed
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Adds an automated polling endpoint for central bank publications or payment rail advisories.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Publisher / Agency Name</Label>
                    <Input
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g. Bank for International Settlements"
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Feed URL (RSS / Atom / XML)</Label>
                    <Input
                      value={feedUrl}
                      onChange={(e) => setFeedUrl(e.target.value)}
                      placeholder="https://www.bis.org/rss/press.xml"
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Intelligence Domain</Label>
                    <Input
                      value={sourceCategory}
                      onChange={(e) => setSourceCategory(e.target.value)}
                      placeholder="Central Banking, Payments, or Research"
                      className="h-8 text-xs"
                    />
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={addingSource} className="h-8 px-4 bg-foreground text-background text-xs font-semibold">
                      {addingSource ? "Connecting..." : "Add Source Feed"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ECB Official Reference Rates Snapshot */}
        <div className="p-3.5 rounded border border-border bg-card space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-border/70 text-xs">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-foreground" />
              European Central Bank (ECB) Official FX Reference Rates
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Updated Daily at 16:00 CET
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {marketRates.map((rate) => (
              <div key={rate.targetCurrency} className="p-2 rounded bg-muted/20 border border-border/60 text-xs font-mono space-y-0.5">
                <div className="text-[10px] text-muted-foreground">{rate.baseCurrency} / {rate.targetCurrency}</div>
                <div className="font-bold text-foreground">{rate.rate.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === c.value
                    ? "bg-foreground text-background font-bold"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter intelligence..."
              className="w-full pl-7 pr-3 h-8 text-xs rounded border border-border bg-card font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        {/* Curated Feed Articles Grid */}
        <div className="border border-border bg-card rounded divide-y divide-border/60">
          {filteredArticles.map((art) => (
            <div key={art.id} className="p-4 hover:bg-muted/15 transition-colors space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-muted text-foreground border border-border">
                      {art.source}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(art.publishedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground/80">
                      • {art.category}
                    </span>
                  </div>
                  <a
                    href={art.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-foreground hover:underline block leading-snug"
                  >
                    {art.title}
                  </a>
                </div>
                <a
                  href={art.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground shrink-0 p-1 rounded hover:bg-muted/40"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {art.summary}
              </p>
            </div>
          ))}
          {filteredArticles.length === 0 && !loading && (
            <div className="p-12 text-center text-xs text-muted-foreground font-mono">
              No bulletins match your search criteria.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
