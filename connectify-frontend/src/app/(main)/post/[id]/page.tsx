'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getPostById } from '@/lib/api/posts.api';
import { PostCard } from '@/components/feed/post-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/shared/route-guards';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['post', id],
    queryFn: () => getPostById(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center px-4">
        <h2 className="text-2xl font-bold mb-2">This page could not be found</h2>
        <p className="text-muted-foreground mb-6">
          The link you followed may be broken, or the page may have been removed.
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-primary font-semibold hover:underline"
        >
          Go back to Connectify
        </button>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="max-w-xl mx-auto py-6 md:py-10 px-4 sm:px-0 w-full">
          <div className="mb-4">
            <button 
              onClick={() => router.back()}
              className="flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>
          </div>
          <PostCard post={post} />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
