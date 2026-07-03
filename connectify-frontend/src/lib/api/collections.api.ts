import { api } from '../axios';
import { Post } from './posts.api';

export interface Collection {
  _id: string;
  name: string;
  coverImage?: string;
  posts: Post[] | string[];
}

export const createCollection = async (name: string, postId?: string): Promise<Collection> => {
  const { data } = await api.post('/collections', { name, postId });
  return data.data;
};

export const getCollections = async (): Promise<Collection[]> => {
  const { data } = await api.get('/collections');
  return data.data;
};

export const getCollectionById = async (id: string): Promise<Collection> => {
  const { data } = await api.get(`/collections/${id}`);
  return data.data;
};

export const saveToCollection = async (collectionId: string, postId: string) => {
  const { data } = await api.post(`/collections/${collectionId}/save`, { postId });
  return data.data;
};
