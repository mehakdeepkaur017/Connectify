import { api } from '../axios';

export interface Story {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar: string;
  };
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'text';
  text?: string;
  isViewed: boolean;
  viewers?: string[];
  likes: string[];
  metadata?: any;
  createdAt: string;
}

export interface StoryGroup {
  author: {
    _id: string;
    username: string;
    avatar: string;
  };
  hasUnviewed: boolean;
  stories: Story[];
}

export const createStory = async (formData: FormData): Promise<Story> => {
  const { data } = await api.post('/stories', formData);
  return data.data;
};

export const getStoryFeed = async (): Promise<StoryGroup[]> => {
  const { data } = await api.get('/stories');
  return data.data;
};

export const markStoryViewed = async (storyId: string) => {
  const { data } = await api.patch(`/stories/${storyId}/view`);
  return data.data;
};

export const deleteStory = async (storyId: string) => {
  const { data } = await api.delete(`/stories/${storyId}`);
  return data;
};

export const getArchivedStories = async (): Promise<Story[]> => {
  const { data } = await api.get('/users/me/archived-stories');
  return data.data;
};

export const archiveStory = async (storyId: string) => {
  const { data } = await api.patch(`/stories/${storyId}/archive`);
  return data;
};

export const likeStory = async (storyId: string) => {
  const { data } = await api.post(`/stories/${storyId}/like`);
  return data;
};

export const replyToStory = async (storyId: string, text?: string, emoji?: string) => {
  const { data } = await api.post(`/stories/${storyId}/reply`, { text, emoji });
  return data;
};

export const getStoryViewers = async (storyId: string) => {
  const { data } = await api.get(`/stories/${storyId}/viewers`);
  return data.data;
};
