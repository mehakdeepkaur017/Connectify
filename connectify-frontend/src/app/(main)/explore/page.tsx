'use client';

import * as React from 'react';
import { ExploreGrid } from '@/components/explore/explore-grid';
import { useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/shared/route-guards';

export default function ExplorePage() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q');

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-screen pt-4 md:pt-10 px-0 md:px-4 w-full">
          {query && (
            <div className="max-w-4xl mx-auto mb-6 px-4 md:px-0">
              <h1 className="text-2xl font-bold">Search results for <span className="text-primary">#{query}</span></h1>
            </div>
          )}
          <ExploreGrid />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
