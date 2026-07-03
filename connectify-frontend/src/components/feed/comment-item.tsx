'use client';

import * as React from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateComment, deleteComment, likeComment, Comment as CommentType } from '@/lib/api/posts.api';
import { MoreHorizontal, Trash2, Edit2, X, Check, Heart } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth.context';
import { formatInstagramDate, getImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CommentItemProps {
  comment: CommentType;
  allComments: CommentType[];
  postId: string;
  onReply?: (commentId: string, username: string) => void;
  level?: number;
}

export function CommentItem({ comment, allComments, postId, onReply, level = 0 }: CommentItemProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?._id === comment.author._id;
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(comment.text);
  const [showReplies, setShowReplies] = React.useState(false);

  // Find direct children
  const replies = React.useMemo(() => {
    return allComments.filter(c => c.parentComment === comment._id);
  }, [allComments, comment._id]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteComment(comment._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    }
  });

  const editMutation = useMutation({
    mutationFn: () => updateComment(comment._id, editText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      setIsEditing(false);
    }
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;
    editMutation.mutate();
  };

  const likeMutation = useMutation({
    mutationFn: () => likeComment(comment._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    }
  });

  const isLiked = user ? comment.likes?.includes(user._id) : false;
  const hasReplies = replies.length > 0;

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only trigger if not editing to avoid accidental likes while clicking input
    if (!isEditing) {
      likeMutation.mutate();
    }
  };

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      className={`flex gap-3 py-2 ${level > 0 ? 'mt-2' : 'border-b border-border/50'} group`}
    >
      <Link href={`/profile/${comment.author.username}`} className="shrink-0" onClick={e => e.stopPropagation()}>
        <img
          src={getImageUrl(comment.author.avatar) || undefined}
          alt={comment.author.username}
          className={`${level > 0 ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover`}
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="flex-1 flex gap-2">
              <input 
                autoFocus
                className="flex-1 bg-muted rounded px-3 py-1 text-sm outline-none border border-border focus:border-primary"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                disabled={editMutation.isPending}
              />
              <button type="submit" disabled={editMutation.isPending} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                <Check className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="inline-block max-w-[90%]">
              <Link href={`/profile/${comment.author.username}`} className="font-semibold text-sm mr-2 hover:underline">{comment.author.username}</Link>
              <span className="text-sm break-words whitespace-pre-wrap">{comment.text}</span>
            </div>
          )}

          <div className="flex items-center">
            {isOwner && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1 outline-none">
                  <MoreHorizontal className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => deleteMutation.mutate()}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {!isEditing && (
              <button 
                onClick={() => likeMutation.mutate()} 
                className="ml-2 self-center shrink-0 transition-transform active:scale-90"
              >
                <Heart className={`w-3.5 h-3.5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-foreground'}`} />
              </button>
            )}
          </div>
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-4 mt-1 text-[11px] text-muted-foreground font-medium">
            <span>{formatInstagramDate(comment.createdAt)}</span>
            <button 
              onClick={() => onReply?.(comment._id, comment.author.username)}
              className="hover:text-foreground transition-colors"
            >
              Reply
            </button>
            {comment.isEdited && (
              <span className="text-muted-foreground/60">Edited</span>
            )}
            {comment.likes?.length > 0 && (
              <span className="font-semibold text-foreground/80">{comment.likes.length} like{comment.likes.length > 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {/* View Replies Toggle */}
        {hasReplies && !showReplies && (
          <button 
            onClick={() => setShowReplies(true)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mt-2 hover:text-foreground group/replies"
          >
            <div className="w-6 h-[1px] bg-muted-foreground/50 group-hover/replies:bg-foreground" />
            View {replies.length} replies
          </button>
        )}
        
        {hasReplies && showReplies && (
          <button 
            onClick={() => setShowReplies(false)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mt-2 hover:text-foreground group/replies"
          >
            <div className="w-6 h-[1px] bg-muted-foreground/50 group-hover/replies:bg-foreground" />
            Hide replies
          </button>
        )}

        {/* Render Replies */}
        {showReplies && (
          <div className="mt-2">
            {replies.map(reply => (
              <CommentItem 
                key={reply._id} 
                comment={reply} 
                allComments={allComments} 
                postId={postId}
                onReply={onReply}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
