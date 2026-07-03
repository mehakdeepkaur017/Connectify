import { Request, Response, NextFunction } from 'express';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { Hashtag } from '../models/Hashtag';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { createNotification } from '../services/notification.service';
import { Notification } from '../models/Notification';
import { uploadToCloudinary } from '../config/cloudinary';

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { caption, commentsDisabled, location, isReel, taggedUsers } = req.body;
    
    // In Express, req.files contains the array of files from multer
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return next(new AppError('Please upload at least one image', 400));
    }
    
    // Upload files to Cloudinary concurrently
    const uploadPromises = files.map(file => uploadToCloudinary(file.buffer, 'connectify/posts'));
    const uploadResults = await Promise.all(uploadPromises);
    const images = uploadResults.map(result => result.secure_url);
    
    const safeCaption = caption || '';
    const hashtags = safeCaption.match(/#[a-z0-9_]+/gi)?.map((h: string) => h.toLowerCase()) || [];
    const uniqueHashtags = [...new Set(hashtags)] as string[];

    let parsedTaggedUsers: string[] = [];
    if (taggedUsers) {
      try {
        parsedTaggedUsers = JSON.parse(taggedUsers);
      } catch (e) {}
    }

    const mentionsMap: { originalUsername: string, user: any }[] = [];
    const mentionMatches = safeCaption.match(/@([a-zA-Z0-9_.]+)/g) || [];
    const mentionUsernames: string[] = [...new Set((mentionMatches as string[]).map((m: string) => m.substring(1)))];
    
    if (mentionUsernames.length > 0) {
      const users = await User.find({ username: { $in: mentionUsernames } }).select('_id username');
      for (const username of mentionUsernames) {
        const foundUser = users.find(u => u.username === username);
        if (foundUser) {
          mentionsMap.push({ originalUsername: username, user: foundUser._id });
        }
      }
    }

    const post = await Post.create({
      author: req.user?._id,
      caption: safeCaption,
      images,
      hashtags: uniqueHashtags,
      commentsDisabled: commentsDisabled === 'true',
      isReel: isReel === 'true',
      location,
      taggedUsers: parsedTaggedUsers,
      mentions: mentionsMap,
    });
    
    // Update Hashtags
    for (const tag of uniqueHashtags) {
      await Hashtag.findOneAndUpdate(
        { name: tag },
        { 
          $inc: { postCount: 1 },
          $addToSet: { posts: post._id }
        },
        { upsert: true, new: true }
      );
    }
    
    // Increment user postsCount
    await User.findByIdAndUpdate(req.user?._id, { $inc: { postsCount: 1 } });
    
    // Populate author before returning
    await (post as any).populate({ path: 'author', select: 'fullName username avatar' });
    
    res.status(201).json(new ApiResponse(true, 'Post created successfully', post));
  } catch (error) {
    next(error);
  }
};
export const getPostById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await (Post.findById(req.params.id) as any)
      .populate({ path: 'author', select: 'fullName username avatar isPrivate followers' })
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .lean();
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    const userId = req.user?._id?.toString();

    const author = post.author;
    if (author.isPrivate && author._id.toString() !== userId) {
      if (!userId || !author.followers.some((f: any) => f.toString() === userId)) {
        return next(new AppError('This post is from a private account', 403));
      }
    }

    const formattedPost = {
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
    };
    
    res.status(200).json(new ApiResponse(true, 'Post retrieved successfully', formattedPost));
  } catch (error) {
    next(error);
  }
};

export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    if (post.author.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to edit this post', 403));
    }
    
    if (req.body.caption !== undefined) {
      const oldHashtags = post.hashtags || [];
      const safeCaption = req.body.caption || '';
      const newHashtagsMatches = safeCaption.match(/#[a-z0-9_]+/gi)?.map((h: string) => h.toLowerCase()) || [];
      const uniqueNewHashtags = [...new Set(newHashtagsMatches)] as string[];
      
      const addedTags = uniqueNewHashtags.filter((tag: string) => !oldHashtags.includes(tag));
      const removedTags = oldHashtags.filter((tag: string) => !uniqueNewHashtags.includes(tag));
      
      post.caption = req.body.caption;
      post.hashtags = uniqueNewHashtags;
      
      const mentionsMap: { originalUsername: string, user: any }[] = [];
      const mentionMatches = safeCaption.match(/@([a-zA-Z0-9_.]+)/g) || [];
      const mentionUsernames: string[] = [...new Set((mentionMatches as string[]).map((m: string) => m.substring(1)))];
      
      if (mentionUsernames.length > 0) {
        const users = await User.find({ username: { $in: mentionUsernames } }).select('_id username');
        for (const username of mentionUsernames) {
          const foundUser = users.find(u => u.username === username);
          if (foundUser) {
            mentionsMap.push({ originalUsername: username, user: foundUser._id });
          }
        }
      }
      post.mentions = mentionsMap as any;

      for (const tag of addedTags) {
        await Hashtag.findOneAndUpdate(
          { name: tag },
          { $inc: { postCount: 1 }, $addToSet: { posts: post._id } },
          { upsert: true }
        );
      }
      for (const tag of removedTags) {
        await Hashtag.findOneAndUpdate(
          { name: tag },
          { $inc: { postCount: -1 }, $pull: { posts: post._id } }
        );
      }
    }
    if (req.body.location !== undefined) {
      post.location = req.body.location;
    }
    if (req.body.taggedUsers !== undefined) {
      try {
        post.taggedUsers = JSON.parse(req.body.taggedUsers);
      } catch (e) {}
    }
    if (req.body.commentsDisabled !== undefined) {
      post.commentsDisabled = req.body.commentsDisabled;
    }
    if (req.body.isArchived !== undefined) {
      post.isArchived = req.body.isArchived;
    }
    
    await post.save();
    
    res.status(200).json(new ApiResponse(true, 'Post updated successfully', post));
  } catch (error) {
    next(error);
  }
};

export const archivePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    if (post.author.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to archive this post', 403));
    }
    
    post.isArchived = !post.isArchived;
    await post.save();
    
    res.status(200).json(new ApiResponse(true, post.isArchived ? 'Post archived' : 'Post unarchived', post));
  } catch (error) {
    next(error);
  }
};

export const getFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) {
      return next(new AppError('User not found', 404));
    }
    
    // Only show posts from users the current user is following, plus their own posts
    const authorsToFetch = [...currentUser.following, currentUser._id];
    
    const posts = await (Post.find({ 
      isArchived: { $ne: true },
      author: { $in: authorsToFetch }
    }) as any)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'author', select: 'fullName username avatar isPrivate' })
      .populate({ path: 'taggedUsers', select: 'username fullName avatar' })
      .populate({ path: 'mentions.user', select: 'username fullName avatar' })
      .lean();
      
    // Transform data to match frontend expectations (isLiked, isSaved)
    const userId = req.user?._id?.toString();
    const formattedPosts = posts.map((post: any) => ({
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
      // Remove raw arrays to save bandwidth if not needed, but frontend might need them
    }));
      
    res.status(200).json(new ApiResponse(true, 'Feed retrieved', {
      posts: formattedPosts,
      page,
      hasMore: posts.length === limit
    }));
  } catch (error) {
    next(error);
  }
};

export const getExploreFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const query = req.query.q as string;
    
    const matchStage: any = { isArchived: { $ne: true } };
    if (query) {
      matchStage.caption = { $regex: query, $options: 'i' };
    }
    
    // Aggregation pipeline for randomized/engagement explore feed
    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          engagementScore: { $add: [{ $size: { $ifNull: ['$likes', []] } }, { $ifNull: ['$commentsCount', 0] }] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
        }
      },
      { $unwind: '$author' },
      { $match: { 'author.isPrivate': { $ne: true } } }, // Exclude private accounts
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.role': 0,
          'author.followers': 0,
          'author.following': 0,
          'author.blockedUsers': 0,
          'author.mutedUsers': 0,
          'author.restrictedUsers': 0,
          'author.followRequests': 0,
        }
      }
    ]);
    
    const userId = req.user?._id?.toString();
    const populatedPosts = await Post.populate(posts, [
      { path: 'taggedUsers', select: 'username fullName avatar' },
      { path: 'mentions.user', select: 'username fullName avatar' }
    ]);
    const formattedPosts = (populatedPosts as any[]).map((post: any) => ({
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
    }));
      
    res.status(200).json(new ApiResponse(true, 'Explore feed retrieved', {
      posts: formattedPosts,
      page,
      hasMore: posts.length === limit
    }));
  } catch (error) {
    next(error);
  }
};

export const getSuggestedFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const currentUser = await User.findById(req.user?._id);
    if (!currentUser) return next(new AppError('User not found', 404));

    const skip = (page - 1) * limit;

    const posts = await Post.aggregate([
      { 
        $match: { 
          isArchived: { $ne: true },
          author: { $nin: [...currentUser.following, currentUser._id] } // Exclude following and self
        } 
      },
      {
        $addFields: {
          engagementScore: { $add: [{ $size: { $ifNull: ['$likes', []] } }, { $ifNull: ['$commentsCount', 0] }] }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
        }
      },
      { $unwind: '$author' },
      { $match: { 'author.isPrivate': { $ne: true } } },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.role': 0,
          'author.followers': 0,
          'author.following': 0,
          'author.blockedUsers': 0,
          'author.mutedUsers': 0,
          'author.restrictedUsers': 0,
          'author.followRequests': 0,
        }
      }
    ]);
    
    const userId = req.user?._id?.toString();
    const populatedPosts = await Post.populate(posts, [
      { path: 'taggedUsers', select: 'username fullName avatar' },
      { path: 'mentions.user', select: 'username fullName avatar' }
    ]);
    const formattedPosts = (populatedPosts as any[]).map((post: any) => ({
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
    }));
      
    res.status(200).json(new ApiResponse(true, 'Suggested feed retrieved', {
      posts: formattedPosts,
      page,
      hasMore: posts.length === limit
    }));
  } catch (error) {
    next(error);
  }
};

export const getReelsFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Aggregation pipeline for randomized reels feed
    const posts = await Post.aggregate([
      { $match: { isArchived: { $ne: true }, isReel: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
        }
      },
      { $unwind: '$author' },
      { $match: { 'author.isPrivate': { $ne: true } } }, // Exclude private accounts
      { $sample: { size: limit } }, // Randomize
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.role': 0,
          'author.followers': 0,
          'author.following': 0,
          'author.blockedUsers': 0,
          'author.mutedUsers': 0,
          'author.restrictedUsers': 0,
          'author.followRequests': 0,
        }
      }
    ]);
    
    const userId = req.user?._id?.toString();
    const populatedPosts = await Post.populate(posts, [
      { path: 'taggedUsers', select: 'username fullName avatar' },
      { path: 'mentions.user', select: 'username fullName avatar' }
    ]);
    const formattedPosts = (populatedPosts as any[]).map((post: any) => ({
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
    }));
      
    res.status(200).json(new ApiResponse(true, 'Reels feed retrieved', {
      posts: formattedPosts,
      page,
      hasMore: true // Infinite random scrolling
    }));
  } catch (error) {
    next(error);
  }
};

export const getPostsByHashtag = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const skip = (page - 1) * limit;
    const hashtag = (req.params.hashtag as string).toLowerCase();

    // Aggregation pipeline to fetch posts by hashtag and exclude private authors
    const posts = await Post.aggregate([
      { $match: { hashtags: hashtag, isArchived: { $ne: true } } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author',
        }
      },
      { $unwind: '$author' },
      { $match: { 'author.isPrivate': { $ne: true } } },
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.role': 0,
          'author.followers': 0,
          'author.following': 0,
          'author.blockedUsers': 0,
          'author.mutedUsers': 0,
          'author.restrictedUsers': 0,
          'author.followRequests': 0,
        }
      }
    ]);

    const userId = req.user?._id?.toString();
    const populatedPosts = await Post.populate(posts, [
      { path: 'taggedUsers', select: 'username fullName avatar' },
      { path: 'mentions.user', select: 'username fullName avatar' }
    ]);
    const formattedPosts = (populatedPosts as any[]).map((post: any) => ({
      ...post,
      isLiked: userId ? post.likes.some((id: any) => id.toString() === userId) : false,
      isSaved: userId ? post.savedBy.some((id: any) => id.toString() === userId) : false,
      likesCount: post.likes.length,
    }));

    // Find the hashtag metadata
    const { Hashtag } = await import('../models/Hashtag');
    const tag = await Hashtag.findOne({ name: hashtag }).lean();

    res.status(200).json(new ApiResponse(true, 'Hashtag posts retrieved', {
      posts: formattedPosts,
      tag: tag || { name: hashtag, postCount: 0 },
      page,
      hasMore: posts.length === limit
    }));
  } catch (error) {
    next(error);
  }
};

export const likePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }
    
    const isLiked = post.likes.includes(userId as any);
    
    if (isLiked) {
      // Unlike
      await Post.findByIdAndUpdate(req.params.id, { $pull: { likes: userId } });
    } else {
      // Like
      await Post.findByIdAndUpdate(req.params.id, { $addToSet: { likes: userId } });
      
      // Notify post author
      await createNotification({
        recipient: post.author.toString(),
        sender: userId.toString(),
        type: 'like',
        post: post._id.toString()
      });
    }
    
    res.status(200).json(new ApiResponse(true, isLiked ? 'Post unliked' : 'Post liked'));
  } catch (error) {
    next(error);
  }
};

export const savePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }
    
    const isSaved = post.savedBy.includes(userId as any);
    
    if (isSaved) {
      await Post.findByIdAndUpdate(req.params.id, { $pull: { savedBy: userId } });
    } else {
      await Post.findByIdAndUpdate(req.params.id, { $addToSet: { savedBy: userId } });
    }
    
    res.status(200).json(new ApiResponse(true, isSaved ? 'Post removed from saved' : 'Post saved'));
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    // Check ownership
    if (post.author.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to delete this post', 403));
    }
    
    const hashtags = post.hashtags || [];
    for (const tag of hashtags) {
      await Hashtag.findOneAndUpdate(
        { name: tag },
        { $inc: { postCount: -1 }, $pull: { posts: post._id } }
      );
    }

    await post.deleteOne();
    
    // Clean up notifications related to this post
    await Notification.deleteMany({ post: post._id });
    
    // Decrement user postsCount
    await User.findByIdAndUpdate(req.user?._id, { $inc: { postsCount: -1 } });
    
    res.status(200).json(new ApiResponse(true, 'Post deleted successfully'));
  } catch (error) {
    next(error);
  }
};
