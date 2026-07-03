import { api } from '../axios';
import { Post } from './posts.api';

export interface UserProfile {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar: string;
  bio?: string;
  website?: string;
  location?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  followers: Partial<UserProfile>[];
  following: Partial<UserProfile>[];
  followRequests?: Partial<UserProfile>[];
  isVerified?: boolean;
  isPrivate?: boolean;
  isRequested?: boolean;
  phone?: string;
  gender?: string;
  createdAt: string;
}

export interface GlobalSearchResult {
  users: Partial<UserProfile>[];
  hashtags: { name: string; postCount: number }[];
  places: { name: string; postCount: number }[];
}

export const getMe = async (): Promise<UserProfile> => {
  const { data } = await api.get('/users/me');
  return data.data;
};

export const updateMe = async (formData: FormData): Promise<UserProfile> => {
  const { data } = await api.patch('/users/me', formData);
  return data.data;
};

export const getUserByUsername = async (username: string): Promise<UserProfile> => {
  const { data } = await api.get(`/users/${username}`);
  return data.data;
};

export const followUser = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/follow`);
  return data;
};

export const unfollowUser = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/unfollow`);
  return data;
};

export const acceptFollowRequest = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/accept`);
  return data;
};

export const rejectFollowRequest = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/reject`);
  return data;
};

export const removeFollower = async (userId: string) => {
  const { data } = await api.post(`/users/${userId}/remove-follower`);
  return data;
};

export const getUserFollowers = async (userId: string): Promise<Partial<UserProfile>[]> => {
  const { data } = await api.get(`/users/${userId}/followers`);
  return data.data;
};

export const getUserFollowing = async (userId: string): Promise<Partial<UserProfile>[]> => {
  const { data } = await api.get(`/users/${userId}/following`);
  return data.data;
};

export const getUserPosts = async (userId: string): Promise<{ posts: Post[] }> => {
  const { data } = await api.get(`/users/${userId}/posts`);
  return data.data;
};

export const getUserTaggedPosts = async (userId: string): Promise<{ posts: Post[] }> => {
  const { data } = await api.get(`/users/${userId}/tagged`);
  return data.data;
};

export const getSavedPosts = async (): Promise<{ posts: Post[] }> => {
  const { data } = await api.get('/users/me/saved');
  return data.data;
};

export const getSuggestedUsers = async (): Promise<Partial<UserProfile>[]> => {
  const { data } = await api.get('/users/me/suggested');
  return data.data;
};

export const searchUsers = async (query: string): Promise<GlobalSearchResult> => {
  const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
  return data.data;
};

export const blockUser = async (userId: string): Promise<void> => {
  await api.post(`/users/${userId}/block`);
};

export const restrictUser = async (userId: string): Promise<void> => {
  await api.post(`/users/${userId}/restrict`);
};

export const muteUser = async (userId: string): Promise<void> => {
  await api.post(`/users/${userId}/mute`);
};

export const checkUsernameAvailability = async (username: string): Promise<{ available: boolean }> => {
  const { data } = await api.get(`/users/check-username?username=${username}`);
  return data.data;
};

export const getBlockedUsers = async (): Promise<Partial<UserProfile>[]> => {
  const { data } = await api.get('/users/settings/blocked');
  return data.data;
};

export const getRestrictedUsers = async (): Promise<Partial<UserProfile>[]> => {
  const { data } = await api.get('/users/settings/restricted');
  return data.data;
};
