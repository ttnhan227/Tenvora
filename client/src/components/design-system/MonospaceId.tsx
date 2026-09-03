import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface MonospaceIdProps {
  id: string;
  truncateLength?: number;
  to?: string;
  label?: string;
  className?: string;
  showCopy?: boolean;
}

export function MonospaceId({
  id,
  truncateLength = 8,
  to,
  label,
  className,
  showCopy = true,
}: MonospaceIdProps) {
  const [copied, setCopied] = useState(false);

  if (!id) return <span className="text-muted-foreground font-mono text-xs">—</span>;

  const display =
    truncateLength > 0 && id.length > truncateLength
      ? `${id.substring(0, truncateLength)}...`
      : id;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success(`Copied ${label || "ID"} to clipboard`);
    setTimeout(() => setCopied(false), 1500);
  };

  const idElement = (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground/90 group/id cursor-pointer select-all",
        to && "text-emerald-600 dark:text-emerald-400 hover:underline",
        className
      )}
    >
      <span>{display}</span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy to clipboard"
          className="opacity-0 group-hover/id:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-opacity"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {to ? (
          <Link to={to} className="inline-flex items-center gap-0.5">
            {idElement}
          </Link>
        ) : (
          idElement
        )}
      </TooltipTrigger>
      <TooltipContent className="font-mono text-xs max-w-sm break-all bg-card text-foreground border border-border">
        <p className="text-[10px] text-muted-foreground uppercase font-bold">{label || "Identifier"}</p>
        <p>{id}</p>
      </TooltipContent>
    </Tooltip>
  );
}
