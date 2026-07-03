import { api } from '../axios';

export interface Notification {
  _id: string;
  recipient: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    avatar: string;
  };
  type: 'like' | 'comment' | 'reply' | 'follow' | 'follow_request' | 'follow_accept' | 'mention' | 'save' | 'story_like' | 'story_reply' | 'message_request';
  post?: {
    _id: string;
    images: string[];
  };
  comment?: {
    _id: string;
    text: string;
  };
  isRead: boolean;
  createdAt: string;
}

export const getNotifications = async ({ pageParam = 1 }): Promise<{ notifications: Notification[]; unreadCount: number; hasMore: boolean }> => {
  const { data } = await api.get(`/notifications?page=${pageParam}&limit=20`);
  return data.data;
};

export const markNotificationsRead = async () => {
  const { data } = await api.patch('/notifications');
  return data.data;
};

export const deleteNotification = async (id: string) => {
  const { data } = await api.delete(`/notifications/${id}`);
  return data;
};
