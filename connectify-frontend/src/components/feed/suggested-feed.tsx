'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getSuggestedFeed, Post } from '@/lib/api/posts.api';
import { PostCard, PostSkeleton } from './post-card';

export function SuggestedFeed() {
  const { ref, inView } = useInView();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['suggestedFeed'],
    queryFn: ({ pageParam = 1 }) => getSuggestedFeed({ pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'pending') {
    return (
      <div className="w-full mt-10">
        <h3 className="text-sm font-semibold text-muted-foreground mb-6 text-center">Suggested for you</h3>
        <PostSkeleton />
      </div>
    );
  }

  if (status === 'error') {
    return null;
  }

  const posts = data.pages.flatMap((page) => page.posts);

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-10 pt-10 border-t border-border">
      <h3 className="text-sm font-semibold text-muted-foreground mb-6 text-center uppercase tracking-widest">
        Suggested for you
      </h3>
      
      {posts.map((post: Post) => (
        <PostCard key={post._id} post={post} />
      ))}
      
      <div ref={ref} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && (
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
