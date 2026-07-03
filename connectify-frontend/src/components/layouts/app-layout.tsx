'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LeftSidebar } from './left-sidebar';
import { RightSidebar } from './right-sidebar';
import { TopNav } from './top-nav';
import { BottomNav } from './bottom-nav';
import { useFollowEvents } from '@/hooks/use-follow-events';

interface AppLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  hideRightSidebar?: boolean;
}

export function AppLayout({ children, fullWidth = false, hideRightSidebar = false }: AppLayoutProps) {
  useFollowEvents();
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop/Tablet Left Navigation */}
      <LeftSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Navigation */}
        <TopNav />

        {/* Main Feed Content */}
        <main className={cn(
          "flex-1 w-full pb-20 md:pb-6",
          !fullWidth && "max-w-[650px] mx-auto"
        )}>
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>

      {/* Desktop Right Sidebar */}
      {!hideRightSidebar && <RightSidebar />}
    </div>
  );
}
