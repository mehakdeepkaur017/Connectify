import * as React from 'react';
import { Conversation } from '@/lib/api/messages.api';
import { getImageUrl } from '@/lib/utils';
import { BellOff, Ban, UserX, Trash2, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useConversationMedia } from '@/hooks/use-messages';

import { deleteConversation, clearChat, muteConversation } from '@/lib/api/messages.api';
import { blockUser, restrictUser } from '@/lib/api/users.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth.context';

import { UserProfile } from '@/lib/api/users.api';

interface ChatInfoProps {
  conversation: Conversation;
  otherUser: Partial<UserProfile>;
  onClose: () => void;
  onSearchClick: () => void;
}

export function ChatInfo({ conversation, otherUser, onClose, onSearchClick }: ChatInfoProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [showMedia, setShowMedia] = React.useState(false);
  const [fullscreenMedia, setFullscreenMedia] = React.useState<{url: string, type: string} | null>(null);

  const { data: mediaData, fetchNextPage, hasNextPage, isFetchingNextPage } = useConversationMedia(showMedia ? conversation._id : '');

  const isMuted = user && conversation.mutedBy?.includes(user._id);
  const isRestricted = user && user.restrictedUsers?.includes(otherUser._id as string);
  const isBlocked = user && user.blockedUsers?.includes(otherUser._id as string);

  const blockMutation = useMutation({
    mutationFn: () => otherUser._id ? blockUser(otherUser._id) : Promise.resolve(),
    onSuccess: () => {
      if (!user || !otherUser._id) return;
      const newBlockedUsers = isBlocked 
        ? user.blockedUsers?.filter(id => id !== otherUser._id) || []
        : [...(user.blockedUsers || []), otherUser._id];
      updateUser({ blockedUsers: newBlockedUsers });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const restrictMutation = useMutation({
    mutationFn: () => otherUser._id ? restrictUser(otherUser._id) : Promise.resolve(),
    onSuccess: () => {
      if (!user || !otherUser._id) return;
      const newRestrictedUsers = isRestricted 
        ? user.restrictedUsers?.filter(id => id !== otherUser._id) || []
        : [...(user.restrictedUsers || []), otherUser._id];
      updateUser({ restrictedUsers: newRestrictedUsers });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const muteMutation = useMutation({
    mutationFn: () => muteConversation(conversation._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteConversation(conversation._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push('/messages');
    }
  });

  const clearMutation = useMutation({
    mutationFn: () => clearChat(conversation._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation._id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      alert('Chat cleared');
    }
  });

  const confirmAction = (action: string, fn: () => void) => {
    if (window.confirm(`Are you sure you want to ${action}?`)) {
      fn();
    }
  };
  return (
    <div className="w-full md:w-[350px] h-full border-l border-border bg-background flex flex-col shrink-0 overflow-y-auto">
      <div className="h-[60px] md:h-[75px] shrink-0 border-b border-border flex items-center justify-between px-4">
        <h2 className="font-semibold text-lg">Details</h2>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex flex-col items-center pb-6 border-b border-border mb-6">
        <img 
          src={getImageUrl(otherUser.avatar) || undefined} 
          alt={otherUser.username}
          className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-background shadow-sm"
        />
        <h3 className="text-xl font-bold">{otherUser.fullName || otherUser.username}</h3>
        <p className="text-muted-foreground text-sm mb-4">Instagram • Connectify</p>
        <Link 
          href={`/profile/${otherUser.username}`}
          className="px-4 py-1.5 bg-muted rounded-lg font-semibold text-sm hover:bg-muted/80 transition-colors"
        >
          Profile
        </Link>
      </div>

      <div className="flex flex-col border-b border-border">
        <button onClick={() => muteMutation.mutate()} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
          <span className="font-semibold">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
          <BellOff className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={onSearchClick} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left border-t border-border">
          <span className="font-semibold">Search in conversation</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <button onClick={() => setShowMedia(true)} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left border-t border-border">
          <span className="font-semibold">Shared Media</span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex flex-col mt-4">
        <button onClick={() => confirmAction(isRestricted ? 'unrestrict this user' : 'restrict this user', () => restrictMutation.mutate())} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left text-red-500">
          <Ban className="w-5 h-5" />
          <span className="font-semibold">{isRestricted ? 'Unrestrict' : 'Restrict'}</span>
        </button>
        <button onClick={() => confirmAction(isBlocked ? 'unblock this user' : 'block this user', () => blockMutation.mutate())} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left text-red-500">
          <UserX className="w-5 h-5" />
          <span className="font-semibold">{isBlocked ? 'Unblock' : 'Block'}</span>
        </button>
        <button onClick={() => confirmAction('clear chat history', () => clearMutation.mutate())} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left text-red-500">
          <Trash2 className="w-5 h-5" />
          <span className="font-semibold">Clear chat</span>
        </button>
        <button onClick={() => confirmAction('delete this conversation? This will remove the conversation from your inbox and clear messages for you.', () => deleteMutation.mutate())} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left text-red-500">
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">Delete chat</span>
        </button>
      </div>

      {/* Shared Media Overlay */}
      {showMedia && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="h-[60px] md:h-[75px] shrink-0 border-b border-border flex items-center px-4 gap-4">
            <button onClick={() => setShowMedia(false)} className="p-2 hover:bg-muted rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg">Shared Media</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-1 grid grid-cols-3 gap-1">
            {mediaData?.pages.map((page, i) => (
              <React.Fragment key={i}>
                {page.media.map((item: any, j: number) => (
                  <div 
                    key={j} 
                    className="aspect-square bg-muted relative group cursor-pointer"
                    onClick={() => setFullscreenMedia({ url: item.url, type: item.type })}
                  >
                    {item.type === 'video' ? (
                      <video src={getImageUrl(item.url)} className="w-full h-full object-cover" />
                    ) : (
                      <img src={getImageUrl(item.url)} className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </React.Fragment>
            ))}
            {mediaData?.pages[0]?.media.length === 0 && (
              <div className="col-span-3 text-center text-muted-foreground p-8 text-sm">
                No shared media
              </div>
            )}
            {hasNextPage && (
              <div className="col-span-3 flex justify-center p-4">
                <button 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="text-blue-500 text-sm font-semibold"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Media Viewer */}
      {fullscreenMedia && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setFullscreenMedia(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white transition-colors z-[101]"
            onClick={(e) => { e.stopPropagation(); setFullscreenMedia(null); }}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {fullscreenMedia.type === 'video' ? (
              <video 
                src={getImageUrl(fullscreenMedia.url)} 
                controls
                autoPlay
                className="max-w-full max-h-[90vh] object-contain rounded-lg" 
              />
            ) : (
              <img 
                src={getImageUrl(fullscreenMedia.url)} 
                alt="Shared media" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
