'use client';

import * as React from 'react';
import { X, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, createComment, Comment as CommentType } from '@/lib/api/posts.api';
import { CommentItem } from './comment-item';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/contexts/auth.context';

interface CommentDrawerProps {
  post: { _id: string; commentsDisabled: boolean };
  isOpen: boolean;
  onClose: () => void;
}

export function CommentDrawer({ post, isOpen, onClose }: CommentDrawerProps) {
  const postId = post._id;
  const [text, setText] = React.useState('');
  const [replyTo, setReplyTo] = React.useState<{ id: string; username: string } | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: () => createComment(postId, text, replyTo?.id),
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-[500px] h-[80vh] sm:h-[600px] bg-card z-50 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-border flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-center flex-1">Comments</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No comments yet.</p>
              <p className="text-sm">Start the conversation.</p>
            </div>
          ) : (
            topLevelComments.map((comment: CommentType) => (
              <CommentItem 
                key={comment._id} 
                comment={comment} 
                allComments={comments || []} 
                postId={postId}
                onReply={handleReply}
              />
            ))
          )}
        </div>

        {/* Input */}
        {!post.commentsDisabled ? (
          <div className="border-t border-border bg-card">
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
                  src={`https://i.pravatar.cc/150?u=${user?._id}`}
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
      </div>
    </>
  );
}
