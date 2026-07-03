import { Request, Response, NextFunction } from 'express';
import { Story } from '../models/Story';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import { createNotification } from '../services/notification.service';
import { uploadToCloudinary } from '../config/cloudinary';

export const createStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mediaType, text, metadata } = req.body;
    let mediaUrl = '';

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, 'connectify/stories');
      mediaUrl = uploadResult.secure_url;
    }

    if (!mediaUrl && !text) {
      return next(new AppError('Story must contain either media or text', 400));
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await Story.create({
      author: req.user?._id,
      mediaUrl,
      mediaType: mediaType || 'image',
      text,
      metadata: metadata ? JSON.parse(metadata) : undefined,
      expiresAt,
    });

    await (story as any).populate({ path: 'author', select: 'username avatar' });

    res.status(201).json(new ApiResponse(true, 'Story created successfully', story));
  } catch (error) {
    next(error);
  }
};

export const getStoryFeed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Include the user's own stories as well as followed users
    const authorsToFetch = [...user.following, userId];

    const stories = await (Story.find({ 
      author: { $in: authorsToFetch },
      expiresAt: { $gt: new Date() }, // Only active stories
      isArchived: { $ne: true }
    }) as any)
      .sort({ createdAt: 1 })
      .populate({ path: 'author', select: 'username avatar' })
      .lean();

    // Group stories by author
    const groupedStories = stories.reduce((acc: any, story: any) => {
      const authorId = story.author._id.toString();
      if (!acc[authorId]) {
        acc[authorId] = {
          author: story.author,
          stories: [],
          hasUnviewed: false
        };
      }
      
      // Filter out the author from viewers (author should never count as a viewer)
      const filteredViewers = story.viewers.filter(
        (id: any) => id.toString() !== story.author._id.toString()
      );
      
      const isViewed = filteredViewers.some((id: any) => id.toString() === userId?.toString());
      if (!isViewed) {
        acc[authorId].hasUnviewed = true;
      }
      
      acc[authorId].stories.push({
        ...story,
        viewers: filteredViewers,
        isViewed
      });
      
      return acc;
    }, {});

    // Sort: Users with unviewed stories first, then own stories first, then chronological
    const feed = Object.values(groupedStories).sort((a: any, b: any) => {
      if (a.author._id.toString() === userId?.toString()) return -1;
      if (b.author._id.toString() === userId?.toString()) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0; // fallback
    });

    res.status(200).json(new ApiResponse(true, 'Stories retrieved', feed));
  } catch (error) {
    next(error);
  }
};

export const markStoryViewed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    // Don't mark the author as a viewer of their own story
    const story = await Story.findById(id);
    if (!story) return next(new AppError('Story not found', 404));
    if (story.author.toString() === userId?.toString()) {
      return res.status(200).json(new ApiResponse(true, 'Story marked as viewed'));
    }

    await Story.findByIdAndUpdate(id, {
      $addToSet: { viewers: userId }
    });

    res.status(200).json(new ApiResponse(true, 'Story marked as viewed'));
  } catch (error) {
    next(error);
  }
};

export const deleteStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const story = await Story.findOne({ _id: id, author: req.user?._id });
    if (!story) return next(new AppError('Story not found or unauthorized', 404));
    await story.deleteOne();
    res.status(200).json(new ApiResponse(true, 'Story deleted'));
  } catch (error) {
    next(error);
  }
};

export const archiveStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const story = await Story.findOne({ _id: id, author: req.user?._id });
    if (!story) return next(new AppError('Story not found or unauthorized', 404));
    story.isArchived = true;
    await story.save();
    res.status(200).json(new ApiResponse(true, 'Story archived'));
  } catch (error) {
    next(error);
  }
};

export const likeStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const story = await Story.findById(id).populate('author');
    
    if (!story) return next(new AppError('Story not found', 404));

    const author = story.author as any;
    if (author.isPrivate && author._id.toString() !== userId?.toString()) {
      if (!userId || !author.followers.includes(userId as any)) {
        return next(new AppError('This account is private', 403));
      }
    }
    
    const isLiked = story.likes.includes(userId as any);
    if (isLiked) {
      await Story.findByIdAndUpdate(id, { $pull: { likes: userId } });
    } else {
      await Story.findByIdAndUpdate(id, { $addToSet: { likes: userId } });
      await createNotification({
        recipient: story.author.toString(),
        sender: userId?.toString() || '',
        type: 'story_like'
      });
    }
    
    res.status(200).json(new ApiResponse(true, isLiked ? 'Story unliked' : 'Story liked'));
  } catch (error) {
    next(error);
  }
};

export const getStoryViewers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const story = await Story.findOne({ _id: id }).populate({
      path: 'viewers',
      select: 'username avatar fullName',
    });

    if (!story) {
      return next(new AppError('Story not found or you are not the author', 404));
    }

    res.status(200).json(new ApiResponse(true, 'Story viewers retrieved', story.viewers));
  } catch (error) {
    next(error);
  }
};

export const replyToStory = async (req: Request, res: Response, next: NextFunction) => {
  import('../models/Conversation').then(async ({ Conversation }) => {
    import('../models/Message').then(async ({ Message }) => {
      try {
        const { id } = req.params;
        const { text, emoji } = req.body; // allow emoji reactions too
        const userId = req.user!._id;

        const story = await Story.findById(id).populate('author');
        if (!story) return next(new AppError('Story not found', 404));

        const author = story.author as any;
        if (author.isPrivate && author._id.toString() !== userId.toString()) {
          if (!author.followers.includes(userId as any)) {
            return next(new AppError('This account is private', 403));
          }
        }

        if (author._id.toString() === userId.toString()) {
          return next(new AppError('Cannot reply to your own story', 400));
        }

        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [userId, story.author as any] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [userId, story.author as any],
          });
        }

        const messageText = emoji || text;

        const message = await Message.create({
          conversationId: conversation._id,
          sender: userId,
          text: messageText,
          messageType: 'story_reply',
          storyId: story._id,
        });

        conversation.lastMessage = message._id as any;
        conversation.lastMessageAt = new Date();
        conversation.lastMessageSender = userId as any;
        await conversation.save();

        await message.populate('sender', 'username fullName avatar');
        await message.populate({
          path: 'storyId',
          select: 'mediaUrl mediaType author',
          populate: { path: 'author', select: 'username avatar' }
        });

        // Emit socket event
        import('../services/socket.service').then(({ getSocketService }) => {
          const socketService = getSocketService();
          if (socketService) {
            conversation!.participants.forEach((pId) => {
              socketService.emitToUser(pId.toString(), 'newMessage', message);
            });
          }
        });

        res.status(200).json(new ApiResponse(true, 'Replied to story', message));
      } catch (error) {
        next(error);
      }
    });
  });
};
