'use client';

import * as React from 'react';
import Link from 'next/link';
import { SuggestedUsers } from '@/components/sidebar/suggested-users';
import { TrendingHashtags } from '@/components/sidebar/trending-hashtags';
import { useAuth } from '@/contexts/auth.context';
import { getImageUrl } from '@/lib/utils';
import dynamic from 'next/dynamic';

const SwitchAccountModal = dynamic(() => import('@/components/auth/switch-account-modal').then(m => m.SwitchAccountModal), { ssr: false });

export function RightSidebar() {
  const { user } = useAuth();
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = React.useState(false);

  return (
    <aside className="hidden lg:flex flex-col w-[320px] h-screen sticky top-0 border-l border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="p-6 flex-1 flex flex-col gap-8 overflow-y-auto no-scrollbar">
        
        {/* Current User Mini Profile */}
        <div className="flex items-center justify-between gap-4 py-2">
          <Link href={user ? `/profile/${user.username}` : '/login'} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <img
              src={getImageUrl(user?.avatar) || undefined}
              alt="Avatar"
              className="w-12 h-12 rounded-full border border-border object-cover"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{user?.username || 'user'}</span>
              <span className="text-sm text-muted-foreground">{user?.fullName || 'Current User'}</span>
            </div>
          </Link>
          <button 
            onClick={() => setIsSwitchAccountOpen(true)}
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Switch
          </button>
        </div>

        <SuggestedUsers />
        <TrendingHashtags />

        {/* Footer */}
        <div className="mt-4 flex flex-col gap-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <Link href="/about" className="hover:underline">About</Link>
            <Link href="/help" className="hover:underline">Help</Link>
            <a href="/api" className="hover:underline">API</a>
            <a href="#" className="hover:underline">Jobs</a>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <a href="#" className="hover:underline">Language</a>
          </div>
          <span>© 2026 Connectify</span>
        </div>
      </div>
      
      <SwitchAccountModal isOpen={isSwitchAccountOpen} onClose={() => setIsSwitchAccountOpen(false)} />
    </aside>
  );
}
