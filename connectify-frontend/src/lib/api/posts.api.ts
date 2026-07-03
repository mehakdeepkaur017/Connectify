import { api } from '../axios';

export interface User {
  _id: string;
  fullName: string;
  username: string;
  avatar: string;
}

export interface Post {
  _id: string;
  author: User;
  caption: string;
  location?: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isArchived: boolean;
  commentsDisabled: boolean;
  isReel?: boolean;
  taggedUsers?: any[];
  createdAt: string;
}

export interface Comment {
  _id: string;
  post: string;
  author: User;
  text: string;
  isEdited: boolean;
  likes: string[];
  parentComment?: string;
  createdAt: string;
}

interface FeedResponse {
  success: boolean;
  message: string;
  data: {
    posts: Post[];
    page: number;
    hasMore: boolean;
  };
}

// POSTS

export const getFeed = async (page = 1, limit = 10): Promise<FeedResponse> => {
  const { data } = await api.get(`/posts?page=${page}&limit=${limit}`);
  return data;
};

export const getPostById = async (postId: string): Promise<Post> => {
  const { data } = await api.get(`/posts/${postId}`);
  return data.data;
};

export const getSavedPosts = async (page = 1, limit = 10): Promise<FeedResponse> => {
  const { data } = await api.get(`/users/me/saved?page=${page}&limit=${limit}`);
  return data.data;
};

export const getArchivedPosts = async (page = 1, limit = 10): Promise<{ posts: Post[]; page: number; hasMore: boolean }> => {
  const { data } = await api.get(`/users/me/archived-posts?page=${page}&limit=${limit}`);
  return data.data;
};

export const getExploreFeed = async ({ pageParam = 1, q }: { pageParam?: number, q?: string }): Promise<{ posts: Post[]; hasMore: boolean }> => {
  const url = q ? `/posts/explore?page=${pageParam}&limit=12&q=${encodeURIComponent(q)}` : `/posts/explore?page=${pageParam}&limit=12`;
  const { data } = await api.get(url);
  return data.data;
};

export const getReelsFeed = async ({ pageParam = 1 }: { pageParam?: number }): Promise<{ posts: Post[]; hasMore: boolean }> => {
  const { data } = await api.get(`/posts/reels?page=${pageParam}&limit=10`);
  return data.data;
};

export const getPostsByHashtag = async ({ hashtag, pageParam = 1 }: { hashtag: string, pageParam?: number }): Promise<{ posts: Post[]; tag: any; hasMore: boolean }> => {
  const { data } = await api.get(`/posts/explore/tags/${hashtag}?page=${pageParam}&limit=12`);
  return data.data;
};

export const getSuggestedFeed = async ({ pageParam = 1 }: { pageParam?: number }): Promise<{ posts: Post[]; hasMore: boolean }> => {
  const { data } = await api.get(`/posts/suggested?page=${pageParam}&limit=5`);
  return data.data;
};

export const createPost = async (formData: FormData) => {
  const { data } = await api.post('/posts', formData);
  return data;
};

export const updatePost = async (postId: string, updateData: { caption?: string; location?: string; commentsDisabled?: boolean }) => {
  const { data } = await api.patch(`/posts/${postId}`, updateData);
  return data.data;
};

export const archivePost = async (postId: string) => {
  const { data } = await api.patch(`/posts/${postId}/archive`);
  return data.data;
};

export const likePost = async (postId: string) => {
  const { data } = await api.post(`/posts/${postId}/like`);
  return data.data;
};

export const savePost = async (postId: string) => {
  const { data } = await api.post(`/posts/${postId}/save`);
  return data.data;
};

export const deletePost = async (postId: string) => {
  const { data } = await api.delete(`/posts/${postId}`);
  return data;
};

// COMMENTS

export const getComments = async (postId: string): Promise<Comment[]> => {
  const { data } = await api.get(`/posts/${postId}/comments`);
  return data.data;
};

export const createComment = async (postId: string, text: string, parentCommentId?: string) => {
  const { data } = await api.post(`/posts/${postId}/comments`, { text, parentCommentId });
  return data.data;
};

export const updateComment = async (commentId: string, text: string) => {
  const { data } = await api.patch(`/posts/comments/${commentId}`, { text });
  return data.data;
};

export const deleteComment = async (commentId: string) => {
  await api.delete(`/posts/comments/${commentId}`);
};

export const likeComment = async (commentId: string) => {
  const { data } = await api.post(`/posts/comments/${commentId}/like`);
  return data.data;
};
