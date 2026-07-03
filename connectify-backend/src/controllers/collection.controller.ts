import { Request, Response, NextFunction } from 'express';
import { Collection } from '../models/Collection';
import { Post } from '../models/Post';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';

export const createCollection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, postId } = req.body;
    const userId = req.user?._id;

    if (!name) {
      return next(new AppError('Collection name is required', 400));
    }

    const posts = postId ? [postId] : [];
    
    // Set a cover image if a post is provided
    let coverImage = '';
    if (postId) {
      const post = await Post.findById(postId);
      if (post && post.images && post.images.length > 0) {
        coverImage = post.images[0];
      }
    }

    const collection = await Collection.create({
      user: userId,
      name,
      posts,
      coverImage
    });

    res.status(201).json(new ApiResponse(true, 'Collection created successfully', collection));
  } catch (error: any) {
    if (error.code === 11000) {
      return next(new AppError('You already have a collection with this name', 400));
    }
    next(error);
  }
};

export const getCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const collections = await Collection.find({ user: userId }).sort({ updatedAt: -1 });

    res.status(200).json(new ApiResponse(true, 'Collections retrieved', collections));
  } catch (error) {
    next(error);
  }
};

export const getCollectionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const collection = await Collection.findOne({ _id: id, user: userId }).populate({
      path: 'posts',
      populate: { path: 'author', select: 'fullName username avatar' }
    });

    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    res.status(200).json(new ApiResponse(true, 'Collection retrieved', collection));
  } catch (error) {
    next(error);
  }
};

export const saveToCollection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { postId } = req.body;
    const userId = req.user?._id;

    if (!postId) {
      return next(new AppError('Post ID is required', 400));
    }

    const collection = await Collection.findOne({ _id: id, user: userId });
    if (!collection) {
      return next(new AppError('Collection not found', 404));
    }

    const isSaved = collection.posts.includes(postId as any);

    if (isSaved) {
      await Collection.findByIdAndUpdate(id, { $pull: { posts: postId } });
    } else {
      await Collection.findByIdAndUpdate(id, { $addToSet: { posts: postId } });
      
      // Update cover image if it's the first post or empty
      if (!collection.coverImage) {
        const post = await Post.findById(postId);
        if (post && post.images && post.images.length > 0) {
          await Collection.findByIdAndUpdate(id, { coverImage: post.images[0] });
        }
      }
    }

    res.status(200).json(new ApiResponse(true, isSaved ? 'Removed from collection' : 'Saved to collection'));
  } catch (error) {
    next(error);
  }
};
