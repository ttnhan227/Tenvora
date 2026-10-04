import {
  Camera,
  Plus,
  Receipt,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[320px] select-none">
      {/* Outer Glow */}
      <div className="absolute -inset-4 rounded-[3.5rem] bg-linear-to-tr from-primary/20 via-amber-500/10 to-transparent blur-2xl pointer-events-none" />

      {/* Phone Hardware Chassis */}
      <div className="relative rounded-[3rem] border-8 border-zinc-900 bg-zinc-950 p-2 shadow-2xl ring-1 ring-white/10 dark:border-zinc-800">
        {/* Dynamic Island / Camera Punch Hole */}
        <div className="absolute left-1/2 top-4 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-black flex items-center justify-end px-2">
          <div className="h-2 w-2 rounded-full bg-zinc-800/80 ring-1 ring-zinc-700/50" />
        </div>

        {/* Screen Container */}
        <div className="relative h-[610px] w-full overflow-hidden rounded-[2.3rem] bg-background font-sans text-xs flex flex-col justify-between border border-border/50">
          
          {/* Status Bar */}
          <div className="flex h-9 items-center justify-between px-6 pt-1 text-[11px] font-semibold text-muted-foreground">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="h-2.5 w-4 rounded-sm border border-current p-0.5 flex items-center">
                <div className="h-full w-full bg-current rounded-2xs" />
              </div>
            </div>
          </div>

          {/* App Content Scrollable Area */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1 space-y-3 custom-scrollbar">
            
            {/* Mobile Header */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-sm">
                  T
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight text-foreground">Global FinOps</h4>
                  <p className="text-[10px] text-muted-foreground">Bilingual Retail Edition</p>
                </div>
              </div>
              <span className="rounded-full bg-[hsl(var(--success)/.12)] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--success))]">
                Online
              </span>
            </div>

            {/* Daily Financial Summary Card */}
            <div className="rounded-2xl bg-linear-to-br from-primary to-primary/85 p-4 text-primary-foreground shadow-sm">
              <div className="flex items-center justify-between text-primary-foreground/80">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Today's Sales</span>
                <span className="flex items-center gap-0.5 text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold">
                  <TrendingUp className="h-3 w-3" /> +14%
                </span>
              </div>
              <p className="mt-1.5 text-2xl font-black tracking-tight tabular-nums">
                ₫14,850,000
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2 text-[10px] text-primary-foreground/85">
                <span>Received: <strong>₫11,200,000</strong></span>
                <span>Debt: <strong className="text-amber-200">₫3,650,000</strong></span>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground/80">Sale</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                  <Camera className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground/80">Receipt</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground/80">Debts</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 shadow-xs">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold text-foreground/80">Expense</span>
              </div>
            </div>

            {/* Activity Stream */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-foreground/90">Recent Records</span>
                <span className="text-[10px] text-primary font-semibold">View all</span>
              </div>

              {/* Record 1 */}
              <div className="flex items-center justify-between rounded-xl border bg-card/80 p-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[11px]">Anh Nam (Wholesale)</p>
                    <p className="text-[9px] text-muted-foreground">Sale · Paid full in cash</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground tabular-nums text-[11px]">₫2,700,000</p>
                  <p className="text-[9px] text-[hsl(var(--success))] font-bold">Completed</p>
                </div>
              </div>

              {/* Record 2 */}
              <div className="flex items-center justify-between rounded-xl border bg-card/80 p-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Users className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[11px]">Chị Hoa Salon</p>
                    <p className="text-[9px] text-muted-foreground">Sale on credit (50% paid)</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground tabular-nums text-[11px]">₫1,450,000</p>
                  <p className="text-[9px] text-amber-600 font-bold">Due in 7d</p>
                </div>
              </div>

              {/* Record 3 */}
              <div className="flex items-center justify-between rounded-xl border bg-card/80 p-2.5 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                    <Receipt className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-[11px]">Store Supplies & Rent</p>
                    <p className="text-[9px] text-muted-foreground">Photo receipt attached</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-foreground tabular-nums text-[11px]">₫820,000</p>
                  <p className="text-[9px] text-muted-foreground">Expense</p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom App Navigation Bar */}
          <div className="flex h-14 items-center justify-around border-t bg-card/95 px-3 py-1 text-muted-foreground backdrop-blur-md">
            <div className="flex flex-col items-center gap-0.5 text-primary font-bold">
              <div className="h-1 w-5 rounded-full bg-primary mb-0.5" />
              <Receipt className="h-4 w-4" />
              <span className="text-[9px]">Home</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 hover:text-foreground">
              <Users className="h-4 w-4" />
              <span className="text-[9px]">Debts</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 hover:text-foreground">
              <Camera className="h-4 w-4" />
              <span className="text-[9px]">Scan</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 hover:text-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="text-[9px]">Settings</span>
            </div>
          </div>

          {/* iOS Home Indicator Bar */}
          <div className="flex justify-center pb-1.5 pt-0.5 bg-card">
            <div className="h-1 w-28 rounded-full bg-zinc-400/40" />
          </div>

        </div>
      </div>
    </div>
  );
}
