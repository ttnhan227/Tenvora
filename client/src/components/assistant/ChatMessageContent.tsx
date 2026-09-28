interface ChatMessageContentProps {
  content: string;
  className?: string;
}

export function ChatMessageContent({ content, className = "" }: ChatMessageContentProps) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`.trim()}>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={`${index}-${part.slice(0, 12)}`}>{part.slice(2, -2)}</strong>
        ) : (
          part
        )
      )}
    </div>
  );
}
