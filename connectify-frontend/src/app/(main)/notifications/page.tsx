'use client';

import * as React from 'react';
import { NotificationFeed } from '@/components/notifications/notification-feed';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { AppLayout } from '@/components/layouts/app-layout';

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <NotificationFeed />
      </AppLayout>
    </ProtectedRoute>
  );
}
