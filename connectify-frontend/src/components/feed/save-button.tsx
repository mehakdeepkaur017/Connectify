'use client';

import * as React from 'react';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { savePost } from '@/lib/api/posts.api';
import { Post } from '@/lib/api/posts.api';
import { motion } from 'framer-motion';
import { CollectionsPopup } from './collections-popup';
import { toast } from 'sonner';

interface SaveButtonProps {
  post: Post;
}

export function SaveButton({ post }: SaveButtonProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => savePost(post._id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      
      const previousFeed = queryClient.getQueryData(['feed']);
      
      queryClient.setQueryData(['feed'], (old: { pages: { data: { posts: Post[] } }[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: {
              ...page.data,
              posts: page.data.posts.map((p: Post) => {
                if (p._id === post._id) {
                  return { ...p, isSaved: !p.isSaved };
                }
                return p;
              })
            }
          }))
        };
      });
      
      return { previousFeed };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['feed'], context?.previousFeed);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['exploreFeed'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      if (!post.isSaved) { // it was just saved (previous state was unsaved)
        toast.success('Saved to All Posts');
      }
    }
  });

  const [isHovered, setIsHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500); // 500ms delay before showing popup
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300); // 300ms delay before hiding to allow moving mouse into popup
  };

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.button 
        whileTap={{ scale: 0.8 }}
        onClick={() => {
          mutation.mutate();
          setIsHovered(false);
        }} 
        className="p-2 -mr-2 rounded-full hover:bg-muted/50 transition-colors group outline-none"
      >
        <motion.div
          initial={false}
          animate={post.isSaved ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Bookmark 
            className={cn(
              "w-6 h-6 transition-transform group-hover:scale-110", 
              post.isSaved ? "fill-foreground text-foreground" : "text-foreground"
            )} 
          />
        </motion.div>
      </motion.button>
      
      <CollectionsPopup 
        post={post}
        isOpen={isHovered}
        onClose={() => setIsHovered(false)}
      />
    </div>
  );
}
