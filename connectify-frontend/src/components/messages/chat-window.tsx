import * as React from 'react';
import { useConversationMessages, useRealtimeMessages, useTypingStatus, useOnlineUsers } from '@/hooks/use-messages';
import { Conversation, markSeen } from '@/lib/api/messages.api';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { ChatInfo } from './chat-info';
import { Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { getImageUrl, cn } from '@/lib/utils';
import { LoadingSpinner } from '../ui/loading-spinner';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { searchMessages, Message, acceptMessageRequest } from '@/lib/api/messages.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, fetchNextPage, hasNextPage } = useConversationMessages(conversation._id);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showInfo, setShowInfo] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Message[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<Message | null>(null);
  const [editMessage, setEditMessage] = React.useState<Message | null>(null);
  
  
  const typingUsers = useTypingStatus(conversation._id);
  const onlineUsers = useOnlineUsers();
  
  const otherUser = conversation.participants.find(p => p._id !== user?._id) || conversation.participants[0];
  const isOtherUserOnline = onlineUsers.includes(otherUser._id);
  const isRequest = user && conversation.isRequestFor?.includes(user._id);

  const acceptMutation = useMutation({
    mutationFn: () => acceptMessageRequest(conversation._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  const deleteChatMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/messages/conversations/${conversation._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onBack();
    }
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/users/${otherUser._id}/block`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    }
  });

  useRealtimeMessages(conversation._id);

  // Mark as seen when opening
  React.useEffect(() => {
    if (conversation.unreadCount[user?._id || ''] > 0) {
      markSeen(conversation._id);
    }
  }, [conversation, user?._id]);

  // Auto-scroll to bottom on mount/conversation change
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView();
    }
  }, [conversation._id]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (bottomRef.current && containerRef.current) {
      const isNearBottom = Math.abs(containerRef.current.scrollTop) < 300;
      const latestMsg = data?.pages[0]?.messages?.[0];
      const isMe = latestMsg && typeof latestMsg.sender !== 'string' && latestMsg.sender._id === user?._id;
      
      if (isNearBottom || isMe || latestMsg?._id.startsWith('temp-')) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (bottomRef.current) {
      bottomRef.current.scrollIntoView();
    }
  }, [data?.pages[0]?.messages?.[0]?._id, user?._id]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (Math.abs(scrollTop) >= scrollHeight - clientHeight - 100 && hasNextPage && !showSearch) {
      fetchNextPage();
    }
  };

  React.useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchMessages(conversation._id, searchQuery);
        setSearchResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, showSearch, conversation._id]);

  if (!user) return null;
  const formatDateGroup = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const allMessages = React.useMemo(() => {
    if (!data) return [];
    const msgs: Message[] = [];
    const seenIds = new Set();
    data.pages.forEach(page => {
      page.messages.forEach((msg: Message) => {
        if (!seenIds.has(msg._id)) {
          seenIds.add(msg._id);
          msgs.push(msg);
        }
      });
    });
    return msgs;
  }, [data]);

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className={cn("flex-1 h-full flex flex-col bg-background relative transition-all", showInfo ? "hidden md:flex" : "flex")}>
        {/* Header */}
      <div className="h-[60px] md:h-[75px] shrink-0 border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="md:hidden p-1 mr-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <Link href={`/profile/${otherUser.username}`} className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={getImageUrl(otherUser.avatar) || undefined} 
                alt={otherUser.username}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
              {isOtherUserOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{otherUser.fullName || otherUser.username}</h3>
              {isOtherUserOnline && <p className="text-xs text-muted-foreground">Active now</p>}
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-2">

          <button 
            onClick={() => setShowInfo(!showInfo)}
            className={cn("p-2 hover:bg-muted rounded-full transition-colors", showInfo && "bg-muted")}
          >
            <Info className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="h-14 border-b border-border flex items-center px-4 bg-muted/30">
          <div className="flex-1 flex items-center bg-muted rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <input 
              type="text" 
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-sm"
              autoFocus
            />
          </div>
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="ml-4 text-sm font-semibold">
            Cancel
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse no-scrollbar"
      >
        <div ref={bottomRef} />

        {typingUsers.length > 0 && (
          <div className="flex w-full mb-2 justify-start items-center">
            <img 
              src={getImageUrl(otherUser.avatar) || undefined} 
              alt={otherUser.username}
              className="w-7 h-7 rounded-full object-cover mr-2"
            />
            <div className="px-4 py-2 rounded-2xl bg-muted text-foreground flex items-center gap-1 h-[36px]">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {showSearch && searchQuery ? (
          <div className="flex flex-col flex-1 p-4 overflow-y-auto">
            {isSearching ? (
              <div className="flex justify-center mt-4"><LoadingSpinner /></div>
            ) : searchResults.length === 0 ? (
              <div className="text-center mt-4 text-muted-foreground text-sm">No results found</div>
            ) : (
              searchResults.map((msg) => (
                <div key={msg._id} className="mb-4">
                  <MessageBubble 
                    message={msg} 
                    showAvatar={true} 
                    otherUserId={otherUser._id} 
                    onReply={setReplyTo}
                    onEdit={setEditMessage}
                  />
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {allMessages.map((msg: Message, index: number) => {
              const previousMsg = allMessages[index + 1]; // Chronologically older message
              const nextMsg = allMessages[index - 1];     // Chronologically newer message
              
              const isOptimistic = msg._id.startsWith('temp-');
              
              const isSameSenderAsPrev = previousMsg && typeof msg.sender !== 'string' && typeof previousMsg.sender !== 'string' && msg.sender._id === previousMsg.sender._id;
              const isSameSenderAsNext = nextMsg && typeof msg.sender !== 'string' && typeof nextMsg.sender !== 'string' && msg.sender._id === nextMsg.sender._id;
              
              const timeDiffPrev = previousMsg ? new Date(msg.createdAt).getTime() - new Date(previousMsg.createdAt).getTime() : 0;
              const timeDiffNext = nextMsg ? new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() : 0;
              
              const isGroupedWithPrev = isSameSenderAsPrev && timeDiffPrev < 5 * 60 * 1000;
              const isGroupedWithNext = isSameSenderAsNext && timeDiffNext < 5 * 60 * 1000;

              const isFirstInGroup = !isGroupedWithPrev;
              const isLastInGroup = !isGroupedWithNext;
              
              // Only show avatar if it's the chronologically LAST (bottom-most) message in the group
              const showAvatar = isLastInGroup;

              // Date group logic
              let showDateGroup = false;
              if (previousMsg) {
                const prevDate = new Date(previousMsg.createdAt);
                const currDate = new Date(msg.createdAt);
                showDateGroup = prevDate.toDateString() !== currDate.toDateString();
              } else if (index === allMessages.length - 1) {
                // Last message in the entire list
                showDateGroup = true;
              }
              
              return (
                <React.Fragment key={msg._id}>
                  <MessageBubble 
                    message={msg} 
                    showAvatar={showAvatar} 
                    otherUserId={otherUser._id} 
                    isOptimistic={isOptimistic}
                    onReply={setReplyTo}
                    onEdit={setEditMessage}
                    isLatest={index === 0}
                    isFirstInGroup={isFirstInGroup}
                    isLastInGroup={isLastInGroup}
                  />
                  {showDateGroup && (
                    <div className="flex justify-center my-6">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {formatDateGroup(new Date(msg.createdAt))}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}

        {/* Profile Intro */}
        {(!data || data.pages[0].messages.length === 0) && !isLoading && (
          <div className="flex flex-col items-center justify-center py-10 mt-auto">
            <img 
              src={getImageUrl(otherUser.avatar) || undefined} 
              alt={otherUser.username}
              className="w-24 h-24 rounded-full object-cover mb-4"
            />
            <h3 className="text-xl font-bold">{otherUser.fullName || otherUser.username}</h3>
            <p className="text-muted-foreground text-sm">Instagram • Connectify</p>
            <Link 
              href={`/profile/${otherUser.username}`}
              className="mt-4 px-4 py-1.5 bg-muted rounded-lg font-semibold text-sm hover:bg-muted/80 transition-colors"
            >
              View Profile
            </Link>
          </div>
        )}
      </div>

        {/* Input or Banner */}
        {isRequest ? (
          <div className="p-4 border-t border-border bg-background text-center flex flex-col gap-2">
            <h4 className="font-semibold text-sm">Message Request</h4>
            <p className="text-xs text-muted-foreground mb-2">If you accept, they will be able to call you and see information such as your Activity Status and when you&apos;ve read messages.</p>
            <div className="flex justify-center gap-3">
              <Button variant="destructive" onClick={() => blockMutation.mutate()} disabled={blockMutation.isPending}>Block</Button>
              <Button variant="secondary" onClick={() => deleteChatMutation.mutate()} disabled={deleteChatMutation.isPending}>Delete</Button>
              <Button variant="default" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
            </div>
          </div>
        ) : (
          <MessageInput 
            conversationId={conversation._id} 
            replyTo={replyTo}
            editMessage={editMessage}
            onClearReply={() => setReplyTo(null)}
            onClearEdit={() => setEditMessage(null)}
          />
        )}
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className={cn("w-full md:w-auto md:max-w-[350px] shrink-0 h-full", !showInfo && "hidden")}>
          <ChatInfo 
            conversation={conversation} 
            otherUser={otherUser} 
            onClose={() => setShowInfo(false)} 
            onSearchClick={() => { setShowInfo(false); setShowSearch(true); }}
          />
        </div>
      )}
    </div>
  );
}
