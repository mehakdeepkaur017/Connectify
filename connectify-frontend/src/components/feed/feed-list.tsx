'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getFeed, Post } from '@/lib/api/posts.api';
import { PostCard, PostSkeleton } from './post-card';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SuggestedFeed } from './suggested-feed';
import { SuggestedUsers } from './suggested-users';
import { useAuth } from '@/contexts/auth.context';

export function FeedList() {
  const { ref, inView } = useInView();
  const { user } = useAuth();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = 1 }) => getFeed(pageParam, 10),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.data.hasMore ? lastPage.data.page + 1 : undefined,
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'pending') {
    return (
      <div className="w-full max-w-[470px] mx-auto py-8 pb-24 sm:pb-8">
        <PostSkeleton />
        <PostSkeleton />
        <PostSkeleton />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-[470px] mx-auto py-20 flex flex-col items-center justify-center text-center">
        <p className="text-muted-foreground mb-4">Failed to load feed.</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  const posts = data.pages.flatMap((page) => page.data.posts);

  if (posts.length === 0) {
    const followsNobody = user?.following?.length === 0;

    return (
      <div className="w-full max-w-[470px] mx-auto py-10 flex flex-col items-center justify-center text-center px-4">
        {followsNobody && (
          <div className="w-full mb-6">
            <SuggestedUsers />
          </div>
        )}
        
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4 mt-4">
          <RefreshCcw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold mb-2">Welcome to Connectify</h3>
        <p className="text-muted-foreground max-w-sm mb-6">
          Follow people to see their posts here, or create a new post to get started!
        </p>
        
        <SuggestedFeed />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[470px] mx-auto py-8 pb-24 sm:pb-8">
      {posts.map((post: Post) => (
        <PostCard key={post._id} post={post} />
      ))}
      
      {/* Intersection Observer target */}
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
        {!hasNextPage && posts.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 className="text-lg font-bold">You&apos;re all caught up</h3>
            <p className="text-sm text-muted-foreground mb-4">You&apos;ve seen all new posts.</p>
          </div>
        )}
      </div>

      {!hasNextPage && posts.length > 0 && <SuggestedFeed />}
    </div>
  );
}
