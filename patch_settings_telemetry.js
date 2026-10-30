const fs = require('fs');
const file = 'client/src/pages/settings/SettingsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const isCrlf = content.includes('\r\n');
const eol = isCrlf ? '\r\n' : '\n';

// 1. Update imports
content = content.replace(
  'import { useQueryClient } from "@tanstack/react-query";',
  'import { useQuery, useQueryClient } from "@tanstack/react-query";'
);
content = content.replace(
  '  Store,' + eol + '  Globe,',
  '  Activity,' + eol + '  Store,' + eol + '  Globe,' + eol + '  Sparkles,'
);
content = content.replace(
  'import apiClient from "@/services/apiClient";',
  'import apiClient from "@/services/apiClient";' + eol + 'import { telemetryService } from "@/services/telemetryService";'
);

// 2. Update activeTab & add telemetry query
content = content.replace(
  '  const [activeTab, setActiveTab] = useState<"store" | "display" | "account">(' + eol + '    user?.role === "TenantAdmin" ? "store" : "display"' + eol + '  );',
  '  const [activeTab, setActiveTab] = useState<"store" | "display" | "account" | "telemetry">(' + eol + '    user?.role === "TenantAdmin" ? "store" : "display"' + eol + '  );' + eol + eol +
  '  const { data: telemetryResult } = useQuery({' + eol +
  '    queryKey: ["telemetry-summary"],' + eol +
  '    queryFn: () => telemetryService.getSummary(),' + eol +
  '    enabled: canManageWorkspace && activeTab === "telemetry",' + eol +
  '  });' + eol +
  '  const telemetry = telemetryResult?.data;'
);

// 3. Update tabs navigation
content = content.replace(
  '${canManageWorkspace ? "sm:grid-cols-3" : "sm:grid-cols-2"}',
  '${canManageWorkspace ? "sm:grid-cols-4" : "sm:grid-cols-2"}'
);

const accountButtonEnd = '<span>{t("settings.tabAccount", "Tài khoản & Mật khẩu")}</span>' + eol + '          </button>';
const telemetryButton = accountButtonEnd + eol + eol +
  '          {canManageWorkspace && (' + eol +
  '            <button' + eol +
  '              type="button"' + eol +
  '              onClick={() => setActiveTab("telemetry")}' + eol +
  '              className={`friendly-focus flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${' + eol +
  '                activeTab === "telemetry"' + eol +
  '                  ? "bg-primary text-primary-foreground shadow-sm"' + eol +
  '                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"' + eol +
  '              }`}' + eol +
  '            >' + eol +
  '              <Activity size={18} />' + eol +
  '              <span>{t("settings.tabTelemetry", "AI Metrics & Trust")}</span>' + eol +
  '            </button>' + eol +
  '          )}';

content = content.replace(accountButtonEnd, telemetryButton);

// 4. Add Tab 4 Telemetry content before footer links
const footerAnchor = '<div className="flex flex-wrap gap-5 border-t pt-5 text-sm">';
const telemetrySection = `{/* TAB 4: AI Telemetry & Trust */}
        {activeTab === "telemetry" && canManageWorkspace && (
          <div className="space-y-6 animate-fade-in">
            <Card className="rounded-2xl border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("telemetry.title", undefined, "AI Metrics, Telemetry & Trust")}
                </CardTitle>
                <CardDescription>
                  {t(
                    "telemetry.desc",
                    undefined,
                    "Real-time measurement of AI assistant throughput, user correction frequency, and draft acceptance.",
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("telemetry.total_drafts", undefined, "Total Drafts Recorded")}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-foreground">
                      {telemetry?.totalDraftsRecorded ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {telemetry?.totalConfirmed ?? 0} {t("telemetry.confirmed", undefined, "confirmed")}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      {t("telemetry.acceptance_rate", undefined, "Accepted Without Edits")}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                      {telemetry?.acceptanceRate ?? 0}%
                    </p>
                    <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                      {telemetry?.confirmedWithoutEdits ?? 0} {t("telemetry.clean_records", undefined, "clean records")}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-primary/10 border-primary/30">
                    <p className="text-xs text-primary font-medium">
                      {t("telemetry.avg_time", undefined, "Avg Time to Record")}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-foreground font-mono">
                      {(((telemetry?.averageRecordingTimeMs ?? 0) / 1000) || 0).toFixed(1)}s
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("telemetry.input_to_saved", undefined, "Capture to save")}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-medium">
                      {t("telemetry.corrections_per_draft", undefined, "Fields Corrected / Draft")}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-foreground font-mono">
                      {telemetry?.averageFieldsCorrected ?? 0}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {telemetry?.totalErrors ?? 0} {t("telemetry.errors_flagged", undefined, "errors flagged")} ({telemetry?.errorRate ?? 0}%)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {t("telemetry.trust_principles", undefined, "Privacy & Integrity Principles")}
                    </p>
                    <p className="mt-1 leading-relaxed">
                      {t(
                        "telemetry.trust_details",
                        undefined,
                        "All AI actions operate in a staged PendingConfirmation state. The AI model has no direct database write access. Every mutation creates an audit log entry and allows a 15-minute rollback window.",
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3">
                    {t("telemetry.recent_activity", undefined, "Recent AI Operations")}
                  </h4>
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-2.5">{t("telemetry.event", undefined, "Event")}</th>
                          <th className="p-2.5">{t("telemetry.intent", undefined, "Intent")}</th>
                          <th className="p-2.5">{t("telemetry.duration", undefined, "Duration")}</th>
                          <th className="p-2.5">{t("telemetry.corrections", undefined, "Corrections")}</th>
                          <th className="p-2.5">{t("common.status", undefined, "Status")}</th>
                          <th className="p-2.5">{t("common.date", undefined, "Date")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(!telemetry?.recentEvents || telemetry.recentEvents.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                              {t("telemetry.no_events", undefined, "No AI telemetry events recorded yet.")}
                            </td>
                          </tr>
                        ) : (
                          telemetry.recentEvents.map((evt) => (
                            <tr key={evt.id} className="hover:bg-muted/30">
                              <td className="p-2.5 font-medium">{evt.eventType}</td>
                              <td className="p-2.5 text-muted-foreground">{evt.intent}</td>
                              <td className="p-2.5 font-mono text-muted-foreground">{evt.durationMs}ms</td>
                              <td className="p-2.5 font-mono">{evt.fieldsCorrectedCount}</td>
                              <td className="p-2.5">
                                {evt.isError ? (
                                  <span className="inline-flex rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                                    Error
                                  </span>
                                ) : evt.acceptedWithoutEdits ? (
                                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                    Accepted Clean
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                                    Edited
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-muted-foreground">
                                {new Date(evt.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}`.replace(/\n/g, eol) + eol + eol + '        ' + footerAnchor;

content = content.replace(footerAnchor, telemetrySection);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated SettingsPage.tsx with AI telemetry tab');
