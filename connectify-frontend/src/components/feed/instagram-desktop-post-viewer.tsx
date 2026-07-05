'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, createComment, likePost, Comment as CommentType, Post } from '@/lib/api/posts.api';
import { CommentItem } from './comment-item';
import { PostOptionsModal } from './post-options-modal';
import { SharePostModal } from './share-post-modal';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/auth.context';
import { ImageCarousel } from './image-carousel';
import { formatInstagramDate, getImageUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LikeButton } from './like-button';
import { SaveButton } from './save-button';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { RichText } from '@/components/ui/rich-text';

interface InstagramDesktopPostViewerProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export function InstagramDesktopPostViewer({ post, isOpen, onClose }: InstagramDesktopPostViewerProps) {
  const [text, setText] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<{ id: string; username: string } | null>(null);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', post._id],
    queryFn: () => getComments(post._id),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: () => createComment(post._id, text, replyTo?.id),
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', post._id] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'user'] });
    }
  });

  const likePostMutation = useMutation({
    mutationFn: () => likePost(post._id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const previousData = queryClient.getQueryData(['feed']);
      
      queryClient.setQueryData(['feed'], (oldData: { pages: { posts: Post[] }[] } | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (p._id === post._id) {
                return {
                  ...p,
                  isLiked: !p.isLiked,
                  likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1
                };
              }
              return p;
            })
          }))
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['feed'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      queryClient.invalidateQueries({ queryKey: ['exploreFeed'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    mutation.mutate();
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
    inputRef.current?.focus();
  };

  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const topLevelComments = React.useMemo(() => {
    return comments?.filter((c: CommentType) => !c.parentComment) || [];
  }, [comments]);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="desktop-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity flex items-center justify-center p-4 md:p-10" 
            onClick={onClose} 
          >
            {/* Close button in top right of screen like Instagram */}
            <button className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors p-2" onClick={onClose}>
              <X className="w-8 h-8" />
            </button>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[1200px] h-[90vh] max-h-[850px] bg-card z-50 rounded-r-lg rounded-l-none md:rounded-lg shadow-2xl flex flex-col md:flex-row overflow-hidden border border-border"
            >
              {/* Left Side - Image */}
              <div className="w-full md:w-[55%] lg:w-[60%] bg-black flex flex-col items-center justify-center relative">
                <ImageCarousel 
                  images={post.images} 
                  onDoubleTap={() => {
                    if (!post.isLiked) {
                      likePostMutation.mutate();
                    } else {
                      // If already liked, still show animation but don't mutate backend.
                      // The image carousel handles the animation when onDoubleTap is called.
                    }
                  }}
                />
              </div>

              {/* Right Side - Interactions */}
              <div className="w-full md:w-[45%] lg:w-[40%] flex flex-col h-full bg-card relative">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Link href={`/profile/${post.author.username}`}>
                      <img
                        src={getImageUrl(post.author.avatar) || undefined}
                        alt={post.author.username}
                        className="w-8 h-8 rounded-full border border-border object-cover"
                      />
                    </Link>
                    <Link href={`/profile/${post.author.username}`} className="text-sm font-semibold hover:underline">
                      {post.author.username}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsOptionsOpen(true)} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground hover:text-muted-foreground">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Comment List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                  {/* Original Post Caption as first 'comment' */}
                  {post.caption && (
                    <div className="flex gap-3 pb-4">
                      <Link href={`/profile/${post.author.username}`} className="shrink-0">
                        <img
                          src={getImageUrl(post.author.avatar) || undefined}
                          alt={post.author.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 mt-1">
                        <div className="inline">
                          <Link href={`/profile/${post.author.username}`} className="font-semibold text-sm mr-2 hover:underline">
                            {post.author.username}
                          </Link>
                          <RichText text={post.caption} className="text-sm" />
                        </div>
                      </div>
                    </div>
                  )}

                  {post.commentsDisabled ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-muted-foreground">
                      <p className="font-semibold text-lg">Comments are disabled.</p>
                    </div>
                  ) : isLoading ? (
                    <div className="flex justify-center py-10">
                      <LoadingSpinner />
                    </div>
                  ) : topLevelComments.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
                      <p className="font-semibold text-lg">No comments yet.</p>
                      <p className="text-sm">Start the conversation.</p>
                    </div>
                  ) : (
                    topLevelComments.map((comment: CommentType) => (
                      <CommentItem 
                        key={comment._id} 
                        comment={comment} 
                        allComments={comments || []}
                        postId={post._id} 
                        onReply={handleReply}
                      />
                    ))
                  )}
                </div>

                {/* Bottom Actions Area */}
                <div className="border-t border-border bg-card">
                  <div className="px-4 py-3 pb-1 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <LikeButton post={post} />
                      <button 
                        onClick={() => inputRef.current?.focus()}
                        className="text-foreground hover:text-muted-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-muted/50"
                      >
                        <svg aria-label="Comment" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                          <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path>
                        </svg>
                      </button>
                      <button 
                        onClick={() => setIsShareOpen(true)}
                        className="text-foreground hover:text-muted-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-muted/50"
                      >
                        <svg aria-label="Share Post" fill="currentColor" height="24" role="img" viewBox="0 0 24 24" width="24">
                          <line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line>
                          <polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon>
                        </svg>
                      </button>
                    </div>
                    <SaveButton post={post} />
                  </div>
                  
                  <div className="px-4 mb-2">
                    <span className="font-semibold text-sm">{post.likesCount.toLocaleString()} likes</span>
                    <div className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wide">
                      {formatInstagramDate(post.createdAt)}
                    </div>
                  </div>

                  {replyTo && !post.commentsDisabled && (
                    <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground flex items-center justify-between border-t border-border">
                      <span>Replying to <strong>{replyTo.username}</strong></span>
                      <button onClick={() => setReplyTo(null)} className="hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {!post.commentsDisabled && (
                    <div className="px-4 py-3 border-t border-border flex items-center">
                      <form onSubmit={handleSubmit} className="flex items-center gap-3 w-full">
                        <div className="flex-1 relative">
                          <input
                            ref={inputRef}
                            type="text"
                            placeholder="Add a comment..."
                            className="w-full bg-transparent outline-none text-sm pr-10 placeholder:text-muted-foreground"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            disabled={mutation.isPending}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!text.trim() || mutation.isPending}
                          className="text-primary font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-primary/80 transition-colors"
                        >
                          {mutation.isPending ? <LoadingSpinner size="sm" /> : 'Post'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Post Options Modal */}
                <PostOptionsModal
                  post={post}
                  isOpen={isOptionsOpen}
                  onClose={() => setIsOptionsOpen(false)}
                  onEdit={() => { setIsOptionsOpen(false); /* Add edit logic here if needed, usually just redirect or open edit modal */ }}
                  onShare={() => { setIsOptionsOpen(false); setIsShareOpen(true); }}
                />

                {/* Share Modal */}
                <SharePostModal 
                  isOpen={isShareOpen} 
                  onClose={() => setIsShareOpen(false)} 
                  postId={post._id} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PostOptionsModal 
        post={post}
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onEdit={() => {
          setIsOptionsOpen(false);
          toast.info('Editing from viewer coming soon');
        }}
        onShare={() => {
          setIsOptionsOpen(false);
          setIsShareOpen(true);
        }}
      />

    </>
  );
}
