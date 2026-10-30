import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { businessService } from "@/services/businessService";
import { useLanguage } from "@/contexts/LanguageContext";

export interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const DEFAULT_PRESETS = [
  "item", "cái", "kg", "g", "box", "hộp", "bag", "bao", "túi",
  "bottle", "chai", "can", "lon", "pack", "gói", "m", "hour", "giờ", "set", "bộ"
];

export function UnitCombobox({
  value,
  onChange,
  id,
  placeholder,
  required = false,
  disabled = false,
  className,
}: UnitComboboxProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const unitsQuery = useQuery({
    queryKey: ["product-units"],
    queryFn: () => businessService.getProductUnits(),
    staleTime: 60_000,
  });

  const allUnits = useMemo(() => {
    const list = unitsQuery.data && unitsQuery.data.length > 0 ? unitsQuery.data : DEFAULT_PRESETS;
    const set = new Set<string>();
    list.forEach((u) => {
      if (u && u.trim()) set.add(u.trim());
    });
    if (value && value.trim()) set.add(value.trim());
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [unitsQuery.data, value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allUnits;
    return allUnits.filter((u) => u.toLowerCase().includes(term));
  }, [allUnits, search]);

  const exactMatch = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allUnits.some((u) => u.toLowerCase() === term);
  }, [allUnits, search]);

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

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setSearch("");
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
        <span className="truncate">{value || placeholder || t("Select unit…")}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1 z-50 w-full min-w-[200px] rounded-xl border bg-popover p-2 text-popover-foreground shadow-md outline-none"
        >
          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search or enter unit…")}
              className="h-8 text-xs"
              autoFocus
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {search.trim() && !exactMatch && (
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t("Use")} &quot;{search.trim()}&quot;</span>
                </button>
              )}
              {filtered.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs text-left transition-colors",
                    value.toLowerCase() === u.toLowerCase()
                      ? "bg-accent font-bold text-accent-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <span className="truncate">{u}</span>
                  {value.toLowerCase() === u.toLowerCase() && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
              {filtered.length === 0 && !search.trim() && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {t("No units found")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
