import React from 'react';

function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyBase}-${i}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={`${keyBase}-${i}`}>{part}</React.Fragment>;
  });
}

function classifyLine(line: string): 'bullet' | 'numbered' | 'paragraph' | 'heading' | 'divider' {
  const trimmed = line.trim();
  if (!trimmed) return 'divider';
  if (/^([•·]|\*|-)\s+/.test(trimmed)) return 'bullet';
  if (/^\d+[.)]\s+/.test(trimmed)) return 'numbered';
  if (/^(#{1,3})\s+/.test(trimmed)) return 'heading';
  return 'paragraph';
}

interface Props {
  text: string;
  bot?: boolean;
}

export default function ChatMessageText({ text, bot = false }: Props) {
  const lines = text.split('\n');

  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={i} className="h-1" />;
        }
        const kind = classifyLine(line);

        if (kind === 'bullet') {
          const content = trimmed.replace(/^([•·]|\*|-)\s+/, '');
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className={bot ? 'text-violet-400' : 'text-gray-400'} aria-hidden>•</span>
              <span className="flex-1 break-words">{renderInline(content, `b-${i}`)}</span>
            </div>
          );
        }

        if (kind === 'numbered') {
          const match = trimmed.match(/^(\d+)[.)]\s+/);
          const content = trimmed.replace(/^(\d+)[.)]\s+/, '');
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className={`font-semibold ${bot ? 'text-violet-500' : 'text-gray-500'}`} aria-hidden>
                {match?.[1]}.
              </span>
              <span className="flex-1 break-words">{renderInline(content, `n-${i}`)}</span>
            </div>
          );
        }

        if (kind === 'heading') {
          const content = trimmed.replace(/^#{1,3}\s+/, '');
          return (
            <div key={i} className="font-semibold text-gray-900 dark:text-white pt-1 break-words">
              {renderInline(content, `h-${i}`)}
            </div>
          );
        }

        return (
          <p key={i} className="break-words whitespace-pre-wrap">
            {renderInline(trimmed, `p-${i}`)}
          </p>
        );
      })}
    </div>
  );
}
