'use client';
import * as React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  const links = [
    { title: 'Data Policy', href: '#' },
    { title: 'Terms of Use', href: '#' },
    { title: 'Open Source Libraries', href: '#' },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">About Connectify</h1>
      <p className="text-sm text-muted-foreground mb-8">Version 1.0.0-production</p>
      <div className="space-y-4">
        {links.map((link, idx) => (
          <Link key={idx} href={link.href} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-accent transition-colors">
            <span className="font-semibold text-sm">{link.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
