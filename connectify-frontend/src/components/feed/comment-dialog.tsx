'use client';

import * as React from 'react';
import { X, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, createComment, Comment as CommentType, Post } from '@/lib/api/posts.api';
import { CommentItem } from './comment-item';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/auth.context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/utils';

interface CommentDialogProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentDialog({ post, isOpen, onClose }: CommentDialogProps) {
  const [text, setText] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<{ id: string; username: string } | null>(null);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    mutation.mutate();
  };

  const handleReply = (commentId: string, username: string) => {
    setReplyTo({ id: commentId, username });
    if (!text.startsWith(`@${username} `)) {
      setText(`@${username} `);
    }
    inputRef.current?.focus();
  };

  const topLevelComments = React.useMemo(() => {
    return comments?.filter((c: CommentType) => !c.parentComment) || [];
  }, [comments]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border-border max-h-[85vh] flex flex-col">
        <DialogHeader className="p-4 border-b border-border/50 text-center">
          <DialogTitle className="text-base font-semibold">Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground flex flex-col items-center justify-center h-full">
              <p className="font-semibold">No comments yet.</p>
              <p className="text-sm">Be the first to comment.</p>
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

        {!post.commentsDisabled ? (
          <div className="border-t border-border bg-card flex-shrink-0">
            {replyTo && (
              <div className="px-4 py-2 bg-muted/50 text-xs text-muted-foreground flex items-center justify-between">
                <span>Replying to <strong>{replyTo.username}</strong></span>
                <button onClick={() => { setReplyTo(null); setText(''); }} className="hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="p-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <img
                  src={getImageUrl(user?.avatar) || undefined}
                  alt={user?.username}
                  className="w-8 h-8 rounded-full border border-border object-cover flex-shrink-0"
                />
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-muted/50 border-none rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || mutation.isPending}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Comments are turned off for this post.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
