import { Request, Response, NextFunction } from 'express';
import { Comment } from '../models/Comment';
import { Post } from '../models/Post';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { createNotification } from '../services/notification.service';
import { Notification } from '../models/Notification';

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text, parentCommentId } = req.body;
    const postId = req.params.postId as string;
    
    const post = await Post.findById(postId);
    if (!post) {
      return next(new AppError('Post not found', 404));
    }
    
    if (post.commentsDisabled) {
      return next(new AppError('Comments are disabled for this post', 403));
    }
    
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return next(new AppError('Parent comment not found', 404));
      }
    }
    
    const comment = await Comment.create({
      post: postId,
      author: req.user?._id,
      text,
      parentComment: parentCommentId || undefined,
    } as any);
    
    // Increment post commentsCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    
    await (comment as any).populate({ path: 'author', select: 'fullName username avatar' });
    
    // Notify
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        await createNotification({
          recipient: parentComment.author.toString(),
          sender: req.user?._id.toString() || '',
          type: 'reply',
          post: postId,
          comment: comment._id.toString()
        });
      }
    } else {
      await createNotification({
        recipient: post.author.toString(),
        sender: req.user?._id.toString() || '',
        type: 'comment',
        post: postId,
        comment: comment._id.toString()
      });
    }
    
    res.status(201).json(new ApiResponse(true, 'Comment added successfully', comment));
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    
    // Simple query to get all top level comments for a post
    // For a production app, we'd paginate this too
    const comments = await (Comment.find({ post: postId }) as any)
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: 'fullName username avatar' })
      .lean();
      
    // Fetch replies if needed, or frontend can fetch them on demand.
    // For simplicity, we just return top-level comments.
    
    res.status(200).json(new ApiResponse(true, 'Comments retrieved', comments));
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }
    
    if (comment.author.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to edit this comment', 403));
    }
    
    if (req.body.text !== undefined) {
      comment.text = req.body.text;
      comment.isEdited = true;
    }
    
    await comment.save();
    
    res.status(200).json(new ApiResponse(true, 'Comment updated successfully', comment));
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }
    
    // Check ownership
    if (comment.author.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to delete this comment', 403));
    }
    
    const postId = comment.post;
    await comment.deleteOne();
    
    // Clean up notifications related to this comment
    await Notification.deleteMany({ comment: comment._id });
    
    // Decrement post commentsCount
    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: -1 } });
    
    res.status(200).json(new ApiResponse(true, 'Comment deleted successfully'));
  } catch (error) {
    next(error);
  }
};

export const likeComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }
    
    const userId = req.user?._id;
    if (!userId) {
      return next(new AppError('Unauthorized', 401));
    }
    
    const isLiked = comment.likes.includes(userId as any);
    
    if (isLiked) {
      await Comment.findByIdAndUpdate(req.params.id, { $pull: { likes: userId } });
    } else {
      await Comment.findByIdAndUpdate(req.params.id, { $addToSet: { likes: userId } });
    }
    
    res.status(200).json(new ApiResponse(true, isLiked ? 'Comment unliked' : 'Comment liked'));
  } catch (error) {
    next(error);
  }
};

