'use client';

import * as React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likePost } from '@/lib/api/posts.api';
import { Post } from '@/lib/api/posts.api';

import { motion } from 'framer-motion';

interface LikeButtonProps {
  post: Post;
}

export function useLikeMutation(post: Post) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => likePost(post._id),
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
                  return {
                    ...p,
                    isLiked: !p.isLiked,
                    likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
                  };
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
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post'] });
      queryClient.invalidateQueries({ queryKey: ['exploreFeed'] });
      queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  });
}

export function LikeButton({ post }: LikeButtonProps) {
  const mutation = useLikeMutation(post);

  return (
    <motion.button 
      whileTap={{ scale: 0.8 }}
      onClick={() => mutation.mutate()} 
      className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-colors group outline-none"
    >
      <motion.div
        initial={false}
        animate={post.isLiked ? { scale: [1, 1.2, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Heart 
          className={cn(
            "w-6 h-6 transition-transform group-hover:scale-110", 
            post.isLiked ? "fill-red-500 text-red-500" : "text-foreground"
          )} 
        />
      </motion.div>
    </motion.button>
  );
}
