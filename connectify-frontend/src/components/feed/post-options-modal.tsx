import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Post, updatePost, archivePost, deletePost } from '@/lib/api/posts.api';
import { useAuth } from '@/contexts/auth.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { followUser, unfollowUser, blockUser, muteUser, restrictUser } from '@/lib/api/users.api';

interface PostOptionsModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onShare: () => void;
}

export function PostOptionsModal({ post, isOpen, onClose, onEdit, onShare }: PostOptionsModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?._id === post.author._id;

  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
      toast.success('Post deleted');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to delete post');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: () => archivePost(post._id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success(data.isArchived ? 'Post archived' : 'Post unarchived');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to archive post');
    }
  });

  const commentsDisableMutation = useMutation({
    mutationFn: () => updatePost(post._id, { commentsDisabled: !post.commentsDisabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success(post.commentsDisabled ? 'Comments enabled' : 'Comments disabled');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message || 'Failed to update post');
    }
  });

  const isFollowing = user?.following?.includes(post.author._id);
  const isMuted = user?.mutedUsers?.includes(post.author._id);

  const followMutation = useMutation({
    mutationFn: () => isFollowing ? unfollowUser(post.author._id) : followUser(post.author._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success(isFollowing ? 'User unfollowed' : 'User followed');
      onClose();
    }
  });

  const blockMutation = useMutation({
    mutationFn: () => blockUser(post.author._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('User blocked');
      onClose();
    }
  });

  const muteMutation = useMutation({
    mutationFn: () => muteUser(post.author._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success(isMuted ? 'Posts unmuted' : 'Posts muted');
      onClose();
    }
  });

  const restrictMutation = useMutation({
    mutationFn: () => restrictUser(post.author._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('User restricted');
      onClose();
    }
  });

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyLink = () => {
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    onClose();
  };

  const handleAction = (action: () => void) => {
    action();
  };

  const menuButtonClass = "w-full py-3.5 text-sm border-b border-border transition-colors hover:bg-muted/50 last:border-b-0";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card w-full max-w-[400px] rounded-xl overflow-hidden flex flex-col text-center border border-border shadow-xl z-10"
        >
          {isOwner ? (
            <>
              <button onClick={() => handleAction(() => deleteMutation.mutate())} className={`${menuButtonClass} text-red-500 font-bold`}>
                Delete
              </button>
              <button onClick={() => handleAction(() => archiveMutation.mutate())} className={menuButtonClass}>
                {post.isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button onClick={() => handleAction(() => commentsDisableMutation.mutate())} className={menuButtonClass}>
                {post.commentsDisabled ? 'Turn on commenting' : 'Turn off commenting'}
              </button>
              <button onClick={() => handleAction(onEdit)} className={menuButtonClass}>
                Edit
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleAction(() => toast.success('Report submitted'))} className={`${menuButtonClass} text-red-500 font-bold`}>
                Report
              </button>
              <button onClick={() => handleAction(() => blockMutation.mutate())} className={`${menuButtonClass} text-red-500 font-bold`}>
                Block
              </button>
              <button onClick={() => handleAction(() => restrictMutation.mutate())} className={`${menuButtonClass} text-red-500 font-bold`}>
                Restrict
              </button>
              <button onClick={() => handleAction(() => followMutation.mutate())} className={`${menuButtonClass} ${isFollowing ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}`}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <button onClick={() => handleAction(() => muteMutation.mutate())} className={menuButtonClass}>
                {isMuted ? 'Unmute posts' : 'Mute posts'}
              </button>
            </>
          )}
          <button onClick={() => handleAction(onShare)} className={menuButtonClass}>
            Share
          </button>
          <button onClick={copyLink} className={menuButtonClass}>
            Copy link
          </button>
          <button onClick={onClose} className={menuButtonClass}>
            Cancel
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
