import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeAssistantMarkdown } from "@/lib/assistantMarkdown";

const FINANCIAL_VALUE_PATTERN = /(\$?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|USD|EUR|GBP|days?|invoices?))?)/gi;

function emphasizeFinancialValues(children: React.ReactNode) {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;

    return child.split(FINANCIAL_VALUE_PATTERN).map((part, index) =>
      index % 2 === 1 ? (
        <span
          key={`${part}-${index}`}
          className="mx-0.5 inline-flex whitespace-nowrap rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[0.9em] font-bold text-foreground ring-1 ring-border/70"
        >
          {part}
        </span>
      ) : part
    );
  });
}

export function AssistantMessageContent({ text }: { text: string }) {
  return (
    <div className="assistant-markdown space-y-3 break-words text-sm leading-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="text-base font-bold tracking-tight text-foreground">{children}</h2>,
          h2: ({ children }) => <h3 className="text-sm font-bold tracking-tight text-foreground">{children}</h3>,
          h3: ({ children }) => <h4 className="text-sm font-semibold text-foreground">{children}</h4>,
          p: ({ children }) => <p className="leading-6 text-foreground/90">{emphasizeFinancialValues(children)}</p>,
          ul: ({ children }) => <ul className="ml-1 list-disc space-y-1.5 pl-5 marker:text-primary">{children}</ul>,
          ol: ({ children }) => <ol className="ml-1 list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-primary">{children}</ol>,
          li: ({ children }) => <li className="pl-1 text-foreground/90">{emphasizeFinancialValues(children)}</li>,
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/50 bg-background/50 px-3 py-2 text-muted-foreground">{children}</blockquote>,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-border bg-background/40">
              <table className="w-full border-collapse text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-border bg-muted/70 px-3 py-2 font-bold text-foreground">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/60 px-3 py-2 align-top">{emphasizeFinancialValues(children)}</td>,
          code: ({ children }) => <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs ring-1 ring-border">{children}</code>,
          a: ({ children, href }) => <a href={href} className="font-semibold text-primary underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
        }}
      >
        {normalizeAssistantMarkdown(text)}
      </ReactMarkdown>
    </div>
  );
}
