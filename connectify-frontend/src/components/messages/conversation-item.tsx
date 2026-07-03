import * as React from 'react';
import { Conversation } from '@/lib/api/messages.api';
import { BadgeCheck } from 'lucide-react';
import { getImageUrl, formatInstagramDate } from '@/lib/utils';
import { useAuth } from '@/contexts/auth.context';
import { cn } from '@/lib/utils';
import { useTypingStatus, useOnlineUsers } from '@/hooks/use-messages';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { user } = useAuth();
  
  if (!user) return null;

  // Find the other participant
  const otherUser = conversation.participants.find(p => p._id !== user._id) || conversation.participants[0];
  const unreadCount = conversation.unreadCount[user._id] || 0;
  
  const getMessagePreview = (msg: any) => {
    if (msg.isDeletedForEveryone) return 'Message deleted';
    switch (msg.messageType) {
      case 'image': return 'Sent an image';
      case 'video': return 'Sent a video';
      case 'voice': return 'Sent a voice message';
      case 'gif': return 'Sent a GIF';
      case 'post_share': return 'Sent a post';
      case 'reel_share': return 'Sent a reel';
      case 'profile_share': return 'Shared a profile';
      case 'story_share': return `Shared ${(msg.storyId as any)?.author?.username || 'a'}${!(msg.storyId as any)?.author?.username ? '' : "'s"} story`;
      case 'story_reply': return msg.text ? (msg.text) : `Shared ${(msg.storyId as any)?.author?.username || 'a'}${!(msg.storyId as any)?.author?.username ? '' : "'s"} story`;
      case 'system': return msg.text;
      default: return msg.text;
    }
  };
  
  const isLastMessageFromMe = conversation.lastMessageSender === user._id;

  const typingUsers = useTypingStatus(conversation._id);
  const onlineUsers = useOnlineUsers();
  const isTyping = typingUsers.includes(otherUser._id);
  const isOnline = onlineUsers.includes(otherUser._id);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-muted/50 transition-colors",
        isActive && "bg-muted"
      )}
    >
      <div className="relative shrink-0">
        <img 
          src={getImageUrl(otherUser.avatar) || undefined} 
          alt={otherUser.username}
          className="w-12 h-12 lg:w-14 lg:h-14 rounded-full object-cover border border-border"
        />
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0 hidden md:block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-semibold text-sm truncate">{otherUser.fullName || otherUser.username}</span>
            {(otherUser as any).isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 shrink-0" />}
          </div>
        </div>
        <div className="flex items-center text-xs text-muted-foreground mt-0.5">
          <span className={cn("truncate max-w-[120px] lg:max-w-[150px]", unreadCount > 0 && "font-semibold text-foreground")}>
            {isTyping ? (
              <span className="text-foreground font-medium italic">typing...</span>
            ) : conversation.lastMessage ? (
              <>
                {isLastMessageFromMe && 'You: '}
                {getMessagePreview(conversation.lastMessage)}
              </>
            ) : (
              'Tap to start chatting'
            )}
          </span>
          <span className="mx-1">•</span>
          <span className="shrink-0">{formatInstagramDate(conversation.lastMessageAt)}</span>
        </div>
      </div>
      {unreadCount > 0 && (
        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0 hidden md:block" />
      )}
      {/* Mobile unread indicator */}
      {unreadCount > 0 && (
        <div className="w-3 h-3 bg-blue-500 rounded-full absolute ml-9 mt-9 md:hidden border-2 border-background" />
      )}
    </div>
  );
}
