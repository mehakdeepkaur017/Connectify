import * as React from 'react';
import Link from 'next/link';

interface RichTextProps {
  text: string;
  className?: string;
}

export function RichText({ text, className = '' }: RichTextProps) {
  if (!text) return null;

  const parts = text.split(/(@[a-zA-Z0-9_.]+|#[a-zA-Z0-9_]+)/g);

  return (
    <span className={`whitespace-pre-wrap break-words ${className}`}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Link key={i} href={`/profile/${username}`} className="text-blue-500 hover:underline">
              {part}
            </Link>
          );
        }
        if (part.startsWith('#')) {
          const hashtag = part.slice(1);
          return (
            <Link key={i} href={`/explore?q=${hashtag}`} className="text-blue-500 hover:underline">
              {part}
            </Link>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
