import React, { useEffect } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/axios';
import { useAuth } from '@/contexts/auth.context';
import {
  getConversations,
  getConversationMessages,
  getConversationMedia,
  Conversation,
  Message
} from '@/lib/api/messages.api';

// Socket singleton
let socket: Socket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

export const useSocket = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      return;
    }

    if (!socket) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
      
      socket = io(socketUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
        auth: (cb) => {
          let token = api.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
          if (!token && typeof window !== 'undefined') {
            token = localStorage.getItem('connectify_access_token') || undefined;
          }
          cb({ token });
        }
      });

      socket.on('connect_error', (err) => {
        if (err.message === 'Authentication error') {
          // Token may be expired / being refreshed — retry after a delay
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (socket && !socket.connected) {
              socket.connect();
            }
          }, 3000);
        }
        // xhr poll errors are transient during initial load — suppress
      });
      
      socket.on('connect', () => {
        if (reconnectTimer) clearTimeout(reconnectTimer);
      });
    }

    return () => {
      // Don't disconnect on unmount to keep connection alive across navigation
      // But we clear the timer to avoid memory leaks
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated]);

  return socket;
};

export const useConversations = (type: 'active' | 'request' = 'active') => {
  return useInfiniteQuery({
    queryKey: ['conversations', type],
    queryFn: ({ pageParam = 1 }) => getConversations(pageParam, type),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  });
};

export const useConversationMessages = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam = 1 }) => getConversationMessages(conversationId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!conversationId,
  });
};

export const useConversationMedia = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ['media', conversationId],
    queryFn: ({ pageParam = 1 }) => getConversationMedia(conversationId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: !!conversationId,
  });
};

export const useRealtimeMessages = (conversationId?: string) => {
  const queryClient = useQueryClient();
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage: Message) => {
      // Update specific conversation messages
      queryClient.setQueryData(['messages', newMessage.conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        const firstPage = data.pages[0];
        // Ensure we don't add duplicates
        if (firstPage.messages.some((m: Message) => m._id === newMessage._id)) return oldData;

        return {
          ...data,
          pages: [
            {
              ...firstPage,
              messages: [newMessage, ...firstPage.messages],
            },
            ...data.pages.slice(1),
          ],
        };
      });

      // Update conversation list
      queryClient.setQueryData(['conversations'], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { conversations: Conversation[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            conversations: page.conversations.map((conv: Conversation) => {
              if (conv._id === newMessage.conversationId) {
                return {
                  ...conv,
                  lastMessage: newMessage,
                  lastMessageAt: newMessage.createdAt,
                  lastMessageSender: typeof newMessage.sender === 'object' ? (newMessage.sender as any)._id : newMessage.sender,
                };
              }
              return conv;
            }).sort((a: Conversation, b: Conversation) => 
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            )
          }))
        };
      });

      // Optimistically emit delivered if we are not the sender
      // Actually we'll do this in the component level when receiving.
    };

    const handleMessageEdited = (editedMessage: Message) => {
      queryClient.setQueryData(['messages', editedMessage.conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m: Message) => 
              m._id === editedMessage._id ? editedMessage : m
            )
          }))
        };
      });
    };

    const handleMessageDeleted = ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
      queryClient.setQueryData(['messages', conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m: Message) => m._id !== messageId)
          }))
        };
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] }); // Simplest way to update lastMessage
    };

    const handleMessagesSeen = ({ conversationId: cId, userId }: { conversationId: string, userId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', cId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleMessageDelivered = ({ messageId, conversationId: cId }: { messageId: string, conversationId: string }) => {
      queryClient.setQueryData(['messages', cId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m: Message) => 
              m._id === messageId ? { ...m, status: 'delivered' } : m
            )
          }))
        };
      });
    };

    const handleMessageReacted = (reactedMessage: Message) => {
      queryClient.setQueryData(['messages', reactedMessage.conversationId], (oldData: unknown) => {
        if (!oldData) return oldData;
        const data = oldData as { pages: { messages: Message[] }[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m: Message) => 
              m._id === reactedMessage._id ? reactedMessage : m
            )
          }))
        };
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messagesSeen', handleMessagesSeen);
    socket.on('messageReacted', handleMessageReacted);
    socket.on('messageDelivered', handleMessageDelivered);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messagesSeen', handleMessagesSeen);
      socket.off('messageReacted', handleMessageReacted);
      socket.off('messageDelivered', handleMessageDelivered);
    };
  }, [socket, queryClient]);
};

export const useTypingStatus = (conversationId: string) => {
  const socket = useSocket();
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleTyping = ({ conversationId: cId, userId }: { conversationId: string, userId: string }) => {
      if (cId === conversationId) {
        setTypingUsers(prev => Array.from(new Set([...prev, userId])));
      }
    };

    const handleStopTyping = ({ conversationId: cId, userId }: { conversationId: string, userId: string }) => {
      if (cId === conversationId) {
        setTypingUsers(prev => prev.filter(id => id !== userId));
      }
    };

    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [socket, conversationId]);

  return typingUsers;
};

export const useOnlineUsers = () => {
  const socket = useSocket();
  const [onlineUsers, setOnlineUsers] = React.useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (users: string[]) => {
      setOnlineUsers(users);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => Array.from(new Set([...prev, userId])));
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    };

    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    
    socket.emit('getOnlineUsers');

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
    };
  }, [socket]);

  return onlineUsers;
};
