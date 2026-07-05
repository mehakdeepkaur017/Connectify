import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getExploreFeed, Post } from '@/lib/api/posts.api';
import { useInView } from 'react-intersection-observer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getImageUrl, cn } from '@/lib/utils';
import { Heart, MessageCircle } from 'lucide-react';
import { InstagramDesktopPostViewer } from '@/components/feed/instagram-desktop-post-viewer';
import { useSearchParams } from 'next/navigation';

export function ExploreGrid() {
  const searchParams = useSearchParams();
  const query = searchParams?.get('q') || '';
  const { ref, inView } = useInView();
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status
  } = useInfiniteQuery({
    queryKey: ['exploreFeed', query],
    queryFn: ({ pageParam }) => getExploreFeed({ pageParam, q: query }),
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

  if (status === 'pending') {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'error') {
    return <div className="text-center py-10 text-red-500">Error loading explore feed.</div>;
  }

  const allPosts = data?.pages?.flatMap(page => page.posts) || [];

  // Backend now handles the query natively, so we don't need client-side filtering unless desired
  const filteredPosts = allPosts;
  const selectedPost = allPosts.find(p => p._id === selectedPostId) || null;

  return (
    <>
      <div className="grid grid-cols-3 grid-flow-dense gap-1 md:gap-4 max-w-4xl mx-auto pb-20">
        {filteredPosts.map((post: Post, index: number) => {
          // Dynamic grid pattern: make some posts 2x2
          const isLarge = index % 10 === 0 || index % 10 === 7;
          return (
          <div 
            key={post._id} 
            className={cn(
              "bg-muted relative group cursor-pointer overflow-hidden",
              isLarge ? "col-span-2 row-span-2" : "col-span-1 row-span-1",
              "aspect-square"
            )}
            onClick={() => setSelectedPostId(post._id)}
          >
            <img 
              src={getImageUrl(post.images[0])} 
              alt={post.caption || 'Explore post'} 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
              <div className="flex items-center gap-2 font-semibold">
                <Heart className="w-5 h-5 fill-white" />
                <span>{post.likesCount}</span>
              </div>
              <div className="flex items-center gap-2 font-semibold">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>{post.commentsCount}</span>
              </div>
            </div>
          </div>
          );
        })}
        
        <div ref={ref} className="col-span-3 flex justify-center py-6">
          {isFetchingNextPage && <LoadingSpinner />}
        </div>
      </div>

      {selectedPost && (
        <InstagramDesktopPostViewer
          post={selectedPost}
          isOpen={!!selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </>
  );
}
