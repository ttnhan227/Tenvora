import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Loader2, Sparkles, Building2, User, Package } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitCombobox } from "@/components/business/UnitCombobox";
import { businessService, apiError } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface ComboboxOption<T = any> {
  id: string;
  label: string;
  sublabel?: string;
  data?: T;
}

export interface CreatableComboboxProps<T = any> {
  value: string;
  onChange: (value: string, item?: T) => void;
  options: ComboboxOption<T>[];
  entityType: "supplier" | "customer" | "product";
  placeholder?: string;
  searchPlaceholder?: string;
  onCreated?: (item: any) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export function CreatableCombobox<T = any>({
  value,
  onChange,
  options,
  entityType,
  placeholder,
  searchPlaceholder,
  onCreated,
  disabled = false,
  id,
  className,
}: CreatableComboboxProps<T>) {
  const { t, isVietnamese } = useLanguage();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Quick Create Form States
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createUnit, setCreateUnit] = useState(isVietnamese ? "cái" : "item");
  const [createPrice, setCreatePrice] = useState<number | string>("");
  const [createCost, setCreateCost] = useState<number | string>("");
  const [createTermsDays, setCreateTermsDays] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.id === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(term))
    );
  }, [options, search]);

  const exactMatch = useMemo(() => {
    const term = search.trim().toLowerCase();
    return options.some((opt) => opt.label.toLowerCase() === term);
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (option: ComboboxOption<T>) => {
    onChange(option.id, option.data);
    setOpen(false);
    setSearch("");
  };

  const handleStartQuickCreate = (name: string) => {
    setCreateName(name);
    setCreatePhone("");
    setCreateUnit(isVietnamese ? "cái" : "item");
    setCreatePrice("");
    setCreateCost("");
    setCreateTermsDays("");
    setOpen(false);
    setQuickCreateOpen(true);
  };

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      toast.error(t("Name is required"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (entityType === "supplier") {
        const terms = createTermsDays !== "" ? Number(createTermsDays) : undefined;
        const res = await businessService.createSupplier({
          name: createName.trim(),
          phone: createPhone.trim() || undefined,
          paymentTermsDays: terms,
        });
        await qc.invalidateQueries({ queryKey: ["suppliers"] });
        onChange(res.id, res as unknown as T);
        onCreated?.(res);
        toast.success(t("Supplier created"));
      } else if (entityType === "customer") {
        const res = await businessService.createCustomer({
          name: createName.trim(),
          phone: createPhone.trim() || undefined,
        });
        await qc.invalidateQueries({ queryKey: ["customers"] });
        onChange(res.id, res as unknown as T);
        onCreated?.(res);
        toast.success(t("Customer created"));
      } else if (entityType === "product") {
        const priceNum = Number(createPrice) || 0;
        const costNum = createCost !== "" ? Number(createCost) : undefined;
        const res = await businessService.createProduct({
          name: createName.trim(),
          unit: createUnit || (isVietnamese ? "cái" : "item"),
          defaultPrice: priceNum,
          costPrice: costNum,
        });
        await qc.invalidateQueries({ queryKey: ["products"] });
        onChange(res.id, res as unknown as T);
        onCreated?.(res);
        toast.success(t("Product created"));
      }

      setQuickCreateOpen(false);
      setSearch("");
    } catch (err) {
      toast.error(apiError(err, t("Could not create item.")));
    } finally {
      setIsSubmitting(false);
    }
  };

  const entityIcon = () => {
    if (entityType === "supplier") return <Building2 className="h-4 w-4 text-primary" />;
    if (entityType === "customer") return <User className="h-4 w-4 text-primary" />;
    return <Package className="h-4 w-4 text-primary" />;
  };

  const entityTitle = () => {
    if (entityType === "supplier") return t("Quick Add Supplier");
    if (entityType === "customer") return t("Quick Add Customer");
    return t("Quick Add Product");
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        id={id}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "w-full justify-between font-normal text-left",
          !value && "text-muted-foreground",
          className
        )}
      >
        <span className="truncate">
          {selectedOption?.label || placeholder || t("Select option…")}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[240px] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg outline-none"
        >
          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder || t("Search or type new name…")}
              className="h-8 text-xs"
              autoFocus
            />

            <div className="max-h-56 overflow-y-auto space-y-1">
              {/* Creatable Quick Add Row */}
              {search.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => handleStartQuickCreate(search.trim())}
                  className="flex w-full items-center gap-2 rounded-lg bg-primary/10 px-2.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {t("Create")} &quot;{search.trim()}&quot;
                  </span>
                </button>
              )}

              {filtered.map((opt) => {
                const isSelected = value === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
                      isSelected
                        ? "bg-accent font-bold text-accent-foreground"
                        : "hover:bg-muted"
                    )}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate font-semibold">{opt.label}</p>
                      {opt.sublabel && (
                        <p className="truncate text-[11px] text-muted-foreground">{opt.sublabel}</p>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                );
              })}

              {filtered.length === 0 && !search.trim() && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  <p>{t("No items found.")}</p>
                  <button
                    type="button"
                    onClick={() => handleStartQuickCreate("")}
                    className="mt-2 inline-flex items-center gap-1 text-primary font-bold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t("Create new")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INLINE QUICK CREATE DIALOG - ZERO NAVIGATE-AWAY */}
      <Dialog open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                {entityIcon()}
              </span>
              <DialogTitle>{entityTitle()}</DialogTitle>
            </div>
            <DialogDescription>
              {t("Create inline without navigating away. Form state remains preserved.")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickCreateSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("Name")} *</Label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={t("Name")}
                required
                autoFocus
              />
            </div>

            {/* Supplier Fields */}
            {entityType === "supplier" && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("Phone Number")}</Label>
                  <Input
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="0912 345 678"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Payment terms (days)")}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={createTermsDays}
                    onChange={(e) => setCreateTermsDays(e.target.value)}
                    placeholder="15, 30..."
                  />
                </div>
              </>
            )}

            {/* Customer Fields */}
            {entityType === "customer" && (
              <div className="space-y-1.5">
                <Label>{t("Phone Number")}</Label>
                <Input
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                  placeholder="0912 345 678"
                />
              </div>
            )}

            {/* Product Fields */}
            {entityType === "product" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("Unit of Measure")} *</Label>
                    <UnitCombobox
                      value={createUnit}
                      onChange={setCreateUnit}
                      placeholder={t("Unit")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("Selling Price")}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={createPrice}
                      onChange={(e) => setCreatePrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("Cost Price (Optional)")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={createCost}
                    onChange={(e) => setCreateCost(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickCreateOpen(false)}
                disabled={isSubmitting}
              >
                {t("Cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5 font-bold">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t("Save & Select")}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
