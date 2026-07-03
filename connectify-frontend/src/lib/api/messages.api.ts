import { api } from '../axios';
import { User } from './posts.api';

export interface Conversation {
  _id: string;
  participants: User[];
  lastMessage?: Message;
  lastMessageAt: string;
  lastMessageSender?: string;
  unreadCount: Record<string, number>;
  mutedBy: string[];
  isRequestFor?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: string | { _id: string; username: string; avatar: string; fullName?: string };
  text: string;
  images: string[];
  videoUrl?: string;
  voiceUrl?: string;
  gifUrl?: string;
  messageType: 'text' | 'image' | 'video' | 'voice' | 'gif' | 'system' | 'story_reply' | 'story_share' | 'post_share' | 'profile_share' | 'reel_share';
  storyId?: string;
  postId?: any; // populated post object
  sharedProfileId?: any; // populated user object
  reelId?: any; // populated reel/post object
  forwardedFrom?: any; // populated message object
  isEdited: boolean;
  status: 'sent' | 'delivered' | 'seen';
  seenBy: string[];
  deliveredTo?: string[];
  repliedTo?: Message | string;
  reactions?: { emoji: string; user: string | any }[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  messageId: string;
  createdAt: string;
  sender: string;
}

export interface GetMediaResponse {
  media: MediaItem[];
  page: number;
  hasMore: boolean;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
  page: number;
  hasMore: boolean;
}

export interface GetMessagesResponse {
  messages: Message[];
  page: number;
  hasMore: boolean;
}

export const getConversations = async (page = 1, type: 'active' | 'request' = 'active', limit = 20): Promise<GetConversationsResponse> => {
  const { data } = await api.get(`/messages/conversations?page=${page}&limit=${limit}&type=${type}`);
  return data.data;
};

export const createConversation = async (receiverId: string): Promise<Conversation> => {
  const { data } = await api.post('/messages/conversations', { receiverId });
  return data.data;
};

export const getConversationMessages = async (conversationId: string, page = 1, limit = 50): Promise<GetMessagesResponse> => {
  const { data } = await api.get(`/messages/conversations/${conversationId}?page=${page}&limit=${limit}`);
  return data.data;
};

export const sendMessage = async (conversationId: string, formData: FormData): Promise<Message> => {
  const { data } = await api.post(`/messages/conversations/${conversationId}/messages`, formData);
  return data.data;
};

export const editMessage = async (messageId: string, text: string): Promise<Message> => {
  const { data } = await api.patch(`/messages/${messageId}`, { text });
  return data.data;
};

export const deleteMessage = async (messageId: string, type: 'me' | 'everyone' = 'everyone'): Promise<void> => {
  await api.delete(`/messages/${messageId}?type=${type}`);
};

export const reactToMessage = async (messageId: string, emoji: string): Promise<Message> => {
  const { data } = await api.post(`/messages/${messageId}/react`, { emoji });
  return data.data;
};

export const markSeen = async (conversationId: string): Promise<void> => {
  await api.patch(`/messages/conversations/${conversationId}/seen`);
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await api.delete(`/messages/conversations/${conversationId}`);
};

export const clearChat = async (conversationId: string): Promise<void> => {
  await api.post(`/messages/conversations/${conversationId}/clear`);
};

export const muteConversation = async (conversationId: string): Promise<void> => {
  await api.post(`/messages/conversations/${conversationId}/mute`);
};

export const searchMessages = async (conversationId: string, query: string): Promise<Message[]> => {
  const { data } = await api.get(`/messages/conversations/${conversationId}/search?q=${encodeURIComponent(query)}`);
  return data.data;
};

export const getConversationMedia = async (conversationId: string, page = 1, limit = 30): Promise<GetMediaResponse> => {
  const { data } = await api.get(`/messages/conversations/${conversationId}/media?page=${page}&limit=${limit}`);
  return data.data;
};

export const forwardMessage = async (messageId: string, targetConversationIds: string[]): Promise<Message[]> => {
  const { data } = await api.post(`/messages/${messageId}/forward`, { targetConversationIds });
  return data.data;
};

export const acceptMessageRequest = async (conversationId: string): Promise<Conversation> => {
  const { data } = await api.post(`/messages/conversations/${conversationId}/accept`);
  return data.data;
};
