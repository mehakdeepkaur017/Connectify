'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layouts/app-layout';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getPostsByHashtag } from '@/lib/api/posts.api';
import { useInView } from 'react-intersection-observer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ProfileGrid } from '@/components/profile/profile-grid';
import { Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/lib/utils';

export default function HashtagExplorePage() {
  const { hashtag: rawHashtag } = useParams() as { hashtag: string };
  const hashtag = decodeURIComponent(rawHashtag).replace(/^#/, '');

  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['hashtag', hashtag],
    queryFn: ({ pageParam }) => getPostsByHashtag({ hashtag, pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length + 1 : undefined;
    }
  });

  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Extract tag info from the first page
  const tagInfo = data?.pages[0]?.tag || { name: hashtag, postCount: 0 };
  const posts = data?.pages.flatMap(page => page.posts) || [];

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex flex-col w-full min-h-screen bg-background">
          <div className="w-full max-w-[935px] mx-auto px-4 sm:px-8 py-8 md:py-10 border-b border-border mb-8">
            <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
              {/* Tag Avatar */}
              <div className="flex-shrink-0">
                {posts.length > 0 && posts[0].images?.[0] ? (
                  <img 
                    src={getImageUrl(posts[0].images[0])} 
                    alt={`#${tagInfo.name}`}
                    className="w-24 h-24 md:w-[150px] md:h-[150px] rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-24 h-24 md:w-[150px] md:h-[150px] rounded-full border border-border flex items-center justify-center bg-muted/30">
                    <Hash className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col items-center md:items-start">
                <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4">
                  #{tagInfo.name}
                </h1>
                
                <div className="flex items-center gap-2 mb-6">
                  <span className="font-semibold">{tagInfo.postCount.toLocaleString()}</span>
                  <span className="text-muted-foreground">posts</span>
                </div>
                
                {/* Note: In Instagram, following hashtags is a complex feature. For now, we will add a UI button to meet the spec, but it could be purely cosmetic or trigger a basic follow logic if we built it on the backend. */}
                <Button className="font-semibold rounded-lg h-8 px-6 text-sm">
                  Follow
                </Button>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[935px] mx-auto px-4 sm:px-0">
            {status === 'pending' ? (
              <div className="w-full flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="pb-20">
                {posts.length > 0 ? (
                  <ProfileGrid posts={posts} isLoading={false} />
                ) : (
                  <div className="text-center text-muted-foreground py-20 flex flex-col items-center">
                    <div className="w-16 h-16 border-2 border-muted-foreground rounded-full flex items-center justify-center mb-4">
                      <Hash className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">No posts yet</h2>
                    <p className="mt-2">Be the first to post with this hashtag.</p>
                  </div>
                )}
                
                <div ref={ref} className="flex justify-center py-6">
                  {isFetchingNextPage && <LoadingSpinner />}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
