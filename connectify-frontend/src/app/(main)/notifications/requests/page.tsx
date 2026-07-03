'use client';

import React from 'react';
import { FollowRequestsList } from '@/components/notifications/follow-requests';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { AppLayout } from '@/components/layouts/app-layout';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function FollowRequestsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="w-full max-w-[600px] mx-auto">
          <div className="flex items-center gap-4 p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <Link href="/notifications" className="hover:bg-muted p-2 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold">Follow Requests</h1>
          </div>
          <FollowRequestsList />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
