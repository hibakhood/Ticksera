interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const label = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2 px-1 py-0.5 animate-fade-in">
      <div className="flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl px-3.5 py-2.5 shadow-sm">
        <div className="flex items-end gap-[3px] h-3.5 mr-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 italic">{label}…</span>
      </div>
    </div>
  );
}
