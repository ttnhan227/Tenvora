import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkspaceAiInsight } from "@/components/assistant/WorkspaceAiInsight";
import {
  clientService,
  ClientSummary,
  CreateClientRequest,
  UpdateClientRequest,
} from "@/services/clientService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building,
  DollarSign,
  Clock,
  Search,
  FileText,
  Edit2,
  Archive,
  TrendingUp,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ClientsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const preferredCurrency = user?.preferredCurrency || "USD";
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Client Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClient, setNewClient] = useState<CreateClientRequest>({
    name: "",
    contactEmail: "",
    phone: "",
    company: "",
    address: "",
    currency: preferredCurrency,
    defaultPaymentTermsDays: 14,
    hourlyRate: 120,
    notes: "",
  });

  // Edit Client Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientSummary | null>(null);

  const loadClients = async () => {
    try {
      setLoading(true);
      setLoadError("");
      const data = await clientService.getClients();
      setClients(data);
    } catch (err) {
      console.error("Failed to load clients:", err);
      setLoadError("We couldn't load your client directory. Your data has not been changed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.contactEmail) {
      toast.error("Client name and contact email are required");
      return;
    }

    try {
      setSubmitting(true);
      await clientService.createClient(newClient);
      setAddModalOpen(false);
      setNewClient({
        name: "",
        contactEmail: "",
        phone: "",
        company: "",
        address: "",
        currency: preferredCurrency,
        defaultPaymentTermsDays: 14,
        hourlyRate: 120,
        notes: "",
      });
      toast.success("Client added successfully! 🎉");
      await loadClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientToEdit) return;

    try {
      setSubmitting(true);
      await clientService.updateClient(clientToEdit.id, {
        name: clientToEdit.name,
        contactEmail: clientToEdit.contactEmail,
        phone: clientToEdit.phone,
        company: clientToEdit.company,
        address: clientToEdit.address,
        currency: clientToEdit.currency,
        defaultPaymentTermsDays: clientToEdit.defaultPaymentTermsDays,
        hourlyRate: clientToEdit.hourlyRate,
        notes: clientToEdit.notes,
      });
      setEditModalOpen(false);
      setClientToEdit(null);
      toast.success("Client details updated!");
      await loadClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update client");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Are you sure you want to archive this client?")) return;
    try {
      await clientService.deleteClient(id);
      toast.success("Client archived.");
      await loadClients();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "The client could not be archived.");
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contactEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);

  const formatCurrencyBreakdown = (value: (client: ClientSummary) => number) => {
    const totals = clients.reduce<Record<string, number>>((acc, client) => {
      acc[client.currency] = (acc[client.currency] || 0) + value(client);
      return acc;
    }, {});

    const entries = Object.entries(totals).filter(([, total]) => total !== 0);
    if (entries.length === 0) return formatMoney(0, preferredCurrency);
    return entries.map(([currency, total]) => formatMoney(total, currency)).join(" · ");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Client Directory &amp; CRM
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage client contact details, default hourly rates, payment terms, and lifetime revenue tracking.
            </p>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Client
          </Button>
        </div>

        {loadError && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Client data is temporarily unavailable</p>
              <p className="mt-1 text-muted-foreground">{loadError}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadClients()}>
              Try again
            </Button>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Active Clients</p>
            <p className="text-2xl font-bold text-foreground mt-1">{clients.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Direct billable client relationships</p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Lifetime Revenue Collected</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrencyBreakdown((client) => client.totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Across {formatCurrencyBreakdown((client) => client.totalInvoiced)} invoiced
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Total Client Receivables</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatCurrencyBreakdown((client) => client.outstandingBalance)}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              Outstanding across open invoices
            </p>
          </div>
        </div>

        <WorkspaceAiInsight
          title="AI client summary"
          prompt="Which client needs follow-up first and why? Use payment terms, overdue invoices, and outstanding client amounts from my workspace."
        />

        {/* Search Bar */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              aria-label="Search clients"
              placeholder="Search clients by name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground border border-border rounded-xl bg-card">
            Loading clients...
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border border-border rounded-xl bg-card space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">
              {searchQuery ? `No clients matching "${searchQuery}"` : "No clients yet — add your first client to start billing"}
            </p>
            <p className="text-xs">
              {searchQuery
                ? "Try searching by a different name, email, or company."
                : "Keep track of contact info, custom hourly rates, and agreed payment terms all in one place."}
            </p>
            {!searchQuery && <p className="text-[11px] font-medium text-primary">Use Add New Client at the top to create the first record.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                        {client.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-sm leading-tight">
                          {client.name}
                        </h3>
                        {client.company && (
                          <p className="text-xs text-muted-foreground">{client.company}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setClientToEdit(client);
                          setEditModalOpen(true);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={`Edit ${client.name}`}
                        title={`Edit ${client.name}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClient(client.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Archive ${client.name}`}
                        title={`Archive ${client.name}`}
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span className="truncate">{client.contactEmail}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Terms & Rates pills */}
                  <div className="mt-3.5 flex flex-wrap gap-1.5 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                      Net {client.defaultPaymentTermsDays} Days
                    </span>
                    {client.hourlyRate && (
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium border border-primary/20">
                        {formatMoney(client.hourlyRate, client.currency)}/hr
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                      {client.currency}
                    </span>
                  </div>
                </div>

                {/* Financial Summary & Quick Action */}
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">Paid (Lifetime)</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatMoney(client.totalPaid, client.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase">Outstanding</p>
                      <p className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatMoney(client.outstandingBalance, client.currency)}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/invoices?client=${client.id}`)}
                    className="w-full h-8 text-xs font-semibold bg-background hover:bg-muted border border-border text-foreground gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Invoices ({client.openInvoicesCount} open)
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Client Dialog */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Add New Client
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Save client contact info and billing defaults for 1-click invoicing.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateClient} className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label htmlFor="new-client-name" className="text-xs font-semibold">Client / Contact Name *</Label>
                <Input
                  id="new-client-name"
                  required
                  placeholder="e.g., Sarah Chen"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="new-client-email" className="text-xs font-semibold">Contact Email *</Label>
                  <Input
                    id="new-client-email"
                    type="email"
                    required
                    placeholder="billing@client.com"
                    value={newClient.contactEmail}
                    onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="new-client-phone" className="text-xs font-semibold">Phone (Optional)</Label>
                  <Input
                    id="new-client-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-client-company" className="text-xs font-semibold">Company / Brand Name</Label>
                <Input
                  id="new-client-company"
                  placeholder="e.g., Starlight Studio LLC"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  className="text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="new-client-currency" className="text-xs font-semibold">Currency</Label>
                  <Select
                    value={newClient.currency}
                    onValueChange={(v) => setNewClient({ ...newClient, currency: v })}
                  >
                    <SelectTrigger id="new-client-currency" className="text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectItem value="USD" className="text-xs">USD ($)</SelectItem>
                      <SelectItem value="EUR" className="text-xs">EUR (€)</SelectItem>
                      <SelectItem value="GBP" className="text-xs">GBP (£)</SelectItem>
                      <SelectItem value="SGD" className="text-xs">SGD (S$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-client-terms" className="text-xs font-semibold">Payment Terms (Days)</Label>
                  <Input
                    id="new-client-terms"
                    type="number"
                    min="0"
                    placeholder="14"
                    value={newClient.defaultPaymentTermsDays}
                    onChange={(e) =>
                      setNewClient({ ...newClient, defaultPaymentTermsDays: parseInt(e.target.value) || 14 })
                    }
                    className="text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-client-rate" className="text-xs font-semibold">Hourly Rate ({newClient.currency})</Label>
                  <Input
                    id="new-client-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120"
                    value={newClient.hourlyRate}
                    onChange={(e) =>
                      setNewClient({ ...newClient, hourlyRate: parseFloat(e.target.value) || 0 })
                    }
                    className="text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-client-notes" className="text-xs font-semibold">Notes</Label>
                <Textarea
                  id="new-client-notes"
                  placeholder="Project scope, billing preferences, etc."
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  rows={2}
                  className="text-xs bg-background"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                >
                  {submitting ? "Saving..." : "Save Client"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-md bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                Edit Client
              </DialogTitle>
            </DialogHeader>

            {clientToEdit && (
              <form onSubmit={handleUpdateClient} className="space-y-3 py-2 text-xs">
                <div className="space-y-1">
                  <Label htmlFor="edit-client-name" className="text-xs font-semibold">Client Name *</Label>
                  <Input
                    id="edit-client-name"
                    required
                    value={clientToEdit.name}
                    onChange={(e) => setClientToEdit({ ...clientToEdit, name: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-client-email" className="text-xs font-semibold">Contact Email *</Label>
                    <Input
                      id="edit-client-email"
                      type="email"
                      required
                      value={clientToEdit.contactEmail}
                      onChange={(e) =>
                        setClientToEdit({ ...clientToEdit, contactEmail: e.target.value })
                      }
                      className="text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-client-phone" className="text-xs font-semibold">Phone</Label>
                    <Input
                      id="edit-client-phone"
                      type="tel"
                      value={clientToEdit.phone || ""}
                      onChange={(e) => setClientToEdit({ ...clientToEdit, phone: e.target.value })}
                      className="text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-client-company" className="text-xs font-semibold">Company</Label>
                  <Input
                    id="edit-client-company"
                    value={clientToEdit.company || ""}
                    onChange={(e) => setClientToEdit({ ...clientToEdit, company: e.target.value })}
                    className="text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-client-terms" className="text-xs font-semibold">Payment Terms (Days)</Label>
                    <Input
                      id="edit-client-terms"
                      type="number"
                      min="0"
                      value={clientToEdit.defaultPaymentTermsDays}
                      onChange={(e) =>
                        setClientToEdit({
                          ...clientToEdit,
                          defaultPaymentTermsDays: parseInt(e.target.value) || 14,
                        })
                      }
                      className="text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-client-rate" className="text-xs font-semibold">Hourly Rate ({clientToEdit.currency})</Label>
                    <Input
                      id="edit-client-rate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={clientToEdit.hourlyRate || 0}
                      onChange={(e) =>
                        setClientToEdit({
                          ...clientToEdit,
                          hourlyRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="text-xs bg-background"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                  >
                    {submitting ? "Saving..." : "Update Client"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ClientsList;
