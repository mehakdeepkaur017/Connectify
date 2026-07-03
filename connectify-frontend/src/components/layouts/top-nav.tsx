'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth.context';
import { Heart, Search, Menu } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { ThemeToggle } from '@/components/shared/theme-toggle';

export function TopNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <header className="md:hidden sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/home" className="flex items-center">
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
            Connectify
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button className="text-muted-foreground hover:text-primary transition-colors">
            <Heart className="h-6 w-6" />
          </button>
          <ThemeToggle />
          <Link href={user ? `/profile/${user.username}` : '/login'}>
            <img
              src={user?.avatar || undefined}
              alt="Avatar"
              className="w-8 h-8 rounded-full border border-border"
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
