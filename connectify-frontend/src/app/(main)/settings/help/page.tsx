'use client';
import * as React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function HelpPage() {
  const helpLinks = [
    { title: 'Help Center', href: '#' },
    { title: 'Privacy and Security Help', href: '#' },
    { title: 'Support Requests', href: '#' },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Help</h1>
      <div className="space-y-4">
        {helpLinks.map((link, idx) => (
          <Link key={idx} href={link.href} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors">
            <span className="font-semibold text-sm">{link.title}</span>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
