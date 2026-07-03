import React from 'react';
import { Post } from '@/lib/api/posts.api';
import { Heart, MessageCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import { motion } from 'framer-motion';
import { InstagramDesktopPostViewer } from '@/components/feed/instagram-desktop-post-viewer';

interface ProfileGridProps {
  posts: Post[];
  isLoading?: boolean;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function ProfileGrid({ 
  posts, 
  isLoading, 
  emptyIcon = <CameraIcon className="w-10 h-10" />, 
  emptyTitle = "No Posts Yet",
  emptyDescription
}: ProfileGridProps) {
  const [selectedPostId, setSelectedPostId] = React.useState<string | null>(null);
  const selectedPost = React.useMemo(() => posts.find(p => p._id === selectedPostId) || null, [posts, selectedPostId]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 md:gap-7 mt-1 md:mt-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="aspect-square bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-foreground">
        <div className="w-[90px] h-[90px] border-[1.5px] border-foreground rounded-full flex items-center justify-center mb-6">
          {emptyIcon}
        </div>
        <h2 className="text-3xl font-bold">{emptyTitle}</h2>
        {emptyDescription && (
          <p className="mt-4 text-[14px] text-center max-w-[350px]">{emptyDescription}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 md:gap-7 mt-1 md:mt-4">
        {posts.map(post => (
          <div 
            key={post._id} 
            className="aspect-square relative group cursor-pointer overflow-hidden bg-muted"
            onClick={() => setSelectedPostId(post._id)}
          >
            {post.images && post.images.length > 0 && (
              <motion.img 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={getImageUrl(post.images[0])} 
                alt="" 
                className="w-full h-full object-cover" 
                loading="lazy"
              />
            )}
            
            {/* Multiple images indicator */}
            {post.images && post.images.length > 1 && (
              <div className="absolute top-2 right-2 text-white drop-shadow-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex items-center text-white font-bold gap-2">
                <Heart className="w-6 h-6 fill-white text-white" />
                <span className="text-lg">{post.likesCount}</span>
              </div>
              <div className="flex items-center text-white font-bold gap-2">
                <MessageCircle className="w-6 h-6 fill-white text-white" />
                <span className="text-lg">{post.commentsCount}</span>
              </div>
            </div>
          </div>
        ))}
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

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
    </svg>
  );
}
