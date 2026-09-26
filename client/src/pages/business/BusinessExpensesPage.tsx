import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EmptyState, LoadingState, PageHeader } from "@/components/business/BusinessUI";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  apiError,
  businessMoney,
  businessService,
} from "@/services/businessService";
const categories = [
  "Transportation",
  "Utilities",
  "Supplies",
  "Rent",
  "Wages",
  "Marketing",
  "Maintenance",
  "Miscellaneous",
];
export default function BusinessExpensesPage() {
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(params.get("create") === "1");
  const [form, setForm] = useState({
    category: "Transportation",
    amount: 0,
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
  });
  const query = useQuery({
    queryKey: ["business-expenses", search, category],
    queryFn: () =>
      businessService.getBusinessExpenses(
        search,
        category === "all" ? "" : category,
      ),
  });
  const create = useMutation({
    mutationFn: () => businessService.createBusinessExpense(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-expenses"] });
      qc.invalidateQueries({ queryKey: ["business-dashboard"] });
      setOpen(false);
      setForm({ ...form, amount: 0, description: "" });
      toast.success("Expense recorded");
    },
    onError: (e) => toast.error(apiError(e, "Could not record the expense.")),
  });
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader eyebrow="Everyday spending" title="Expenses" description="Quickly note transport, rent, supplies, and other business costs—no accounting setup needed." actions={<Button onClick={() => setOpen(true)}><Plus />Add expense</Button>} />
        <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description or category"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {query.isLoading ? (
          <LoadingState label="Opening your expense records…" />
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState icon={Receipt} title={search || category !== "all" ? "No expenses match those filters" : "No expenses yet"} description={search || category !== "all" ? "Try clearing the search or choosing all categories." : "Transportation, utilities, supplies, and other everyday costs will appear here."} action={!search && category === "all" && <Button onClick={() => setOpen(true)}>Add first expense</Button>} />
        ) : (
          <div className="paper-card overflow-hidden">
            <div className="divide-y">
              {query.data!.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-4 p-5"
                >
                  <div>
                    <p className="font-semibold">{e.category}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {e.description || "No description"} ·{" "}
                      {new Date(e.expenseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {businessMoney(e.amount, e.currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>Record a simple business cost with its category and date.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((x) => (
                    <SelectItem key={x} value={x}>
                      {x}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount *</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  required
                  min=".0001"
                  step=".0001"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date *</Label>
                <Input
                  id="expense-date"
                  type="date"
                  required
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.expenseDate}
                  onChange={(e) =>
                    setForm({ ...form, expenseDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={create.isPending}>
                {create.isPending ? "Recording…" : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
