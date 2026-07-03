'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, MessageCircle, Send, Edit2, Trash2, Link as LinkIcon, User } from 'lucide-react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatInstagramDate, getImageUrl } from '@/lib/utils';
import { Post, updatePost, deletePost } from '@/lib/api/posts.api';
import { LikeButton, useLikeMutation } from './like-button';
import { SaveButton } from './save-button';
import { ImageCarousel } from './image-carousel';
import { CommentDrawer } from './comment-drawer';
import { CommentDialog } from './comment-dialog';
import { PostOptionsModal } from './post-options-modal';
import { SharePostModal } from './share-post-modal';
import { RichText } from '@/components/ui/rich-text';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useAuth } from '@/contexts/auth.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PostProps {
  post: Post;
}

export function PostCard({ post }: PostProps) {
  const [isCommentOpen, setIsCommentOpen] = React.useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editCaption, setEditCaption] = React.useState(post.caption);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isOwner = user?._id === post.author._id;
  const likeMutation = useLikeMutation(post);

  const formattedDate = React.useMemo(() => {
    try {
      return formatInstagramDate(post.createdAt);
    } catch {
      return 'just now';
    }
  }, [post.createdAt]);

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post deleted');
    }
  });

  const editMutation = useMutation({
    mutationFn: () => updatePost(post._id, { caption: editCaption }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setIsEditing(false);
      toast.success('Post updated');
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCaption.trim()) return;
    editMutation.mutate();
  };

  const copyLink = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 mx-0 sm:mx-4"
    >
      <GlassCard className="p-0 overflow-hidden sm:rounded-[24px] border-x-0 sm:border-x">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.username}`}>
              <img
                src={getImageUrl(post.author.avatar) || undefined}
                alt={post.author.username}
                className="w-10 h-10 rounded-full border border-border object-cover"
              />
            </Link>
            <div className="flex flex-col">
              <Link href={`/profile/${post.author.username}`} className="text-sm font-semibold hover:underline cursor-pointer">
                {post.author.username}
              </Link>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                {formattedDate}
              </span>
            </div>
          </div>
          
          <button onClick={() => setIsOptionsOpen(true)} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-full outline-none transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        <div className="relative">
          <ImageCarousel 
            images={post.images} 
            onDoubleTap={() => {
              if (!post.isLiked) {
                likeMutation.mutate();
              }
            }}
          />
          {post.taggedUsers && post.taggedUsers.length > 0 && (
            <TaggedUsersOverlay taggedUsers={post.taggedUsers} />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <LikeButton post={post} />
              
              <button 
                onClick={() => setIsCommentOpen(true)}
                disabled={post.commentsDisabled && post.commentsCount === 0}
                className={cn(
                  "text-foreground hover:text-muted-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-muted/50",
                  (post.commentsDisabled && post.commentsCount === 0) && "opacity-50 cursor-not-allowed"
                )}
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              
              <button onClick={() => setIsShareOpen(true)} className="text-foreground hover:text-muted-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-muted/50">
                <Send className="w-6 h-6" />
              </button>
            </div>
            <SaveButton post={post} />
          </div>

          {/* Likes & Caption */}
          <div className="font-semibold text-sm mb-1">{post.likesCount.toLocaleString()} likes</div>
          
          {(post.caption || isEditing) && (
            <CaptionContent post={post} editMutation={editMutation} isEditing={isEditing} setIsEditing={setIsEditing} editCaption={editCaption} setEditCaption={setEditCaption} handleEditSubmit={handleEditSubmit} />
          )}
          
          <button 
            onClick={() => setIsCommentOpen(true)}
            disabled={post.commentsDisabled && post.commentsCount === 0}
            className={cn(
              "text-sm mt-2 text-left transition-colors",
              (post.commentsDisabled && post.commentsCount === 0) 
                ? "text-muted-foreground/50 cursor-not-allowed" 
                : "text-muted-foreground hover:underline"
            )}
          >
            {post.commentsDisabled 
              ? (post.commentsCount > 0 ? `View all ${post.commentsCount} comments (turned off)` : 'Comments turned off')
              : (post.commentsCount > 0 ? `View all ${post.commentsCount} comments` : 'Add a comment...')}
          </button>
        </div>
      </GlassCard>

      {isDesktop ? (
        <CommentDialog 
          post={post}
          isOpen={isCommentOpen} 
          onClose={() => setIsCommentOpen(false)} 
        />
      ) : (
        <CommentDrawer 
          post={post} 
          isOpen={isCommentOpen} 
          onClose={() => setIsCommentOpen(false)} 
        />
      )}

      <PostOptionsModal 
        post={post}
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        onEdit={() => {
          setIsOptionsOpen(false);
          setIsEditing(true);
        }}
        onShare={() => {
          setIsOptionsOpen(false);
          setIsShareOpen(true);
        }}
      />

      <SharePostModal
        postId={post._id}
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </motion.div>
  );
}

function TaggedUsersOverlay({ taggedUsers }: { taggedUsers: any[] }) {
  const [showTags, setShowTags] = React.useState(false);
  
  return (
    <>
      <button 
        onClick={() => setShowTags(!showTags)}
        className="absolute bottom-4 left-4 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors z-10 shadow-md backdrop-blur-sm"
      >
        <User className="w-4 h-4" />
      </button>
      
      <AnimatePresence>
        {showTags && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-4 pointer-events-none z-10"
          >
            <div className="flex flex-wrap gap-2 justify-center pointer-events-auto mt-auto mb-16">
              {taggedUsers.map(u => (
                <Link 
                  key={u._id} 
                  href={`/profile/${u.username}`}
                  className="bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-black transition-colors shadow-lg"
                >
                  {u.username}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { UseMutationResult } from '@tanstack/react-query';

interface CaptionContentProps {
  post: Post;
  editMutation: UseMutationResult<unknown, Error, void, unknown>;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  editCaption: string;
  setEditCaption: (val: string) => void;
  handleEditSubmit: (e: React.FormEvent) => void;
}

function CaptionContent({ post, editMutation, isEditing, setIsEditing, editCaption, setEditCaption, handleEditSubmit }: CaptionContentProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTruncated, setIsTruncated] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (textRef.current && !isExpanded) {
      // Check if text is overflowing its container
      setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [post.caption, isExpanded]);

  return (
    <motion.div layout className="text-sm">
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="mt-2 flex flex-col gap-2">
          <textarea 
            autoFocus
            className="w-full bg-muted rounded p-3 text-sm outline-none border border-border focus:border-primary min-h-[80px]"
            value={editCaption}
            onChange={e => setEditCaption(e.target.value)}
            disabled={editMutation?.isPending}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={editMutation?.isPending || !editCaption.trim()}>
              {editMutation?.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      ) : (
        <motion.div layout className="relative">
          <div 
            ref={textRef}
            className={cn(
              "break-words whitespace-pre-wrap",
              !isExpanded && "line-clamp-3"
            )}
          >
            <Link href={`/profile/${post.author.username}`} className="font-semibold mr-2 hover:underline">{post.author.username}</Link>
            <RichText text={post.caption} />
          </div>
          
          {isTruncated && !isExpanded && (
            <button 
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground hover:text-foreground font-medium mt-1 inline-block"
            >
              more
            </button>
          )}
          {isExpanded && (
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground font-medium mt-1 block"
            >
              less
            </button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function PostSkeleton() {
  return (
    <div className="mb-6 mx-0 sm:mx-4">
      <div className="bg-card/50 border sm:rounded-[24px] overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex flex-col gap-2">
            <div className="w-24 h-3 bg-muted rounded-full animate-pulse" />
            <div className="w-16 h-2 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
        <div className="w-full aspect-square sm:aspect-[4/5] bg-muted animate-pulse" />
        <div className="p-4 flex flex-col gap-3">
          <div className="flex gap-4">
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="w-20 h-3 bg-muted rounded-full animate-pulse" />
          <div className="w-full h-3 bg-muted rounded-full animate-pulse" />
          <div className="w-2/3 h-3 bg-muted rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
