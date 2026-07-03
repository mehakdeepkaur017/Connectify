import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import mongoose from 'mongoose';
import { getSocketService } from '../services/socket.service';
import { uploadToCloudinary } from '../config/cloudinary';

export const getConversations = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const type = req.query.type as string; // 'active' or 'request'
  const skip = (page - 1) * limit;

  const query: any = {
    participants: userId,
    deletedBy: { $ne: userId }
  };

  if (type === 'request') {
    query.isRequestFor = userId;
  } else {
    query.isRequestFor = { $ne: userId };
  }

  const conversations = await Conversation.find(query)
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('participants', 'username fullName avatar')
    .populate('lastMessage')
    .lean();

  const total = await Conversation.countDocuments(query);

  res.status(200).json(
    new ApiResponse(true, 'Conversations fetched successfully', {
      conversations,
      page,
      hasMore: total > skip + conversations.length,
    })
  );
};

export const createConversation = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { receiverId } = req.body;

  if (!receiverId) {
    throw new AppError('Receiver ID is required', 400);
  }

  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new AppError('Receiver not found', 404);
  }

  // Check if conversation already exists
  let conversation = await Conversation.findOne({
    participants: { $all: [userId, receiverId], $size: 2 }
  }).populate('participants', 'username fullName avatar');

  if (!conversation) {
    const unreadCount = new Map();
    unreadCount.set(userId.toString(), 0);
    unreadCount.set(receiverId.toString(), 0);

    conversation = await Conversation.create({
      participants: [userId, receiverId],
      unreadCount,
      lastMessageAt: new Date()
    });
    await conversation.populate('participants', 'username fullName avatar');
  } else {
    // If conversation was deleted by user, restore it
    if (conversation.deletedBy.includes(userId as any)) {
      conversation.deletedBy = conversation.deletedBy.filter((id) => id.toString() !== userId.toString());
      await conversation.save();
    }
  }

  res.status(200).json(new ApiResponse(true, 'Conversation created/fetched', conversation));
};

export const getConversationMessages = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized to view these messages', 403);
  }

  const messages = await Message.find({ 
    conversationId,
    deletedFor: { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'username fullName avatar')
    .populate('repliedTo')
    .populate({
      path: 'postId',
      select: 'images caption author',
      populate: { path: 'author', select: 'username avatar' }
    })
    .populate({
      path: 'storyId',
      select: 'mediaUrl mediaType author',
      populate: { path: 'author', select: 'username avatar' }
    })
    .populate({
      path: 'reelId',
      select: 'videoUrl caption author',
      populate: { path: 'author', select: 'username avatar' }
    })
    .populate({
      path: 'forwardedFrom',
      select: 'text images videoUrl voiceUrl gifUrl messageType'
    })
    .populate({
      path: 'sharedProfileId',
      select: 'username fullName avatar bio'
    })
    .lean();

  const total = await Message.countDocuments({ 
    conversationId,
    deletedFor: { $ne: userId }
  });

  res.status(200).json(
    new ApiResponse(true, 'Messages fetched successfully', {
      messages,
      page,
      hasMore: total > skip + messages.length,
    })
  );
};

export const sendMessage = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;
  const { text, repliedTo, postId, sharedProfileId, reelId, storyId, gifUrl, videoUrl, voiceUrl } = req.body;
  
  let images: string[] = [];
  if (req.files && Array.isArray(req.files) && req.files.length > 0) {
    const uploadPromises = (req.files as Express.Multer.File[]).map(file => uploadToCloudinary(file.buffer, 'connectify/messages'));
    const uploadResults = await Promise.all(uploadPromises);
    images = uploadResults.map(result => result.secure_url);
  }

  if (!text && images.length === 0 && !postId && !sharedProfileId && !reelId && !storyId && !gifUrl && !videoUrl && !voiceUrl) {
    throw new AppError('Message cannot be empty', 400);
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized to send message to this conversation', 403);
  }

  const receiverId = conversation.participants.find(p => p.toString() !== userId.toString());
  if (receiverId) {
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(userId);
    if (receiver?.blockedUsers?.includes(userId as any)) {
      throw new AppError('You cannot send a message to this user', 403);
    }
    if (sender?.blockedUsers?.includes(receiverId as any)) {
      throw new AppError('You blocked this user. Unblock to send a message.', 403);
    }

    // Message Request logic
    if (receiver?.restrictedUsers?.some(id => id.toString() === userId.toString())) {
      if (!conversation.isRequestFor.some(id => id.toString() === receiverId.toString())) {
        conversation.isRequestFor.push(receiverId as any);
      }
    } else if (!conversation.lastMessage) {
      if (receiver && !receiver.following.some(id => id.toString() === userId.toString())) {
        if (!conversation.isRequestFor.some(id => id.toString() === receiverId.toString())) {
          conversation.isRequestFor.push(receiverId as any);
        }
      }
    }
  }

  let messageType = 'text';
  if (images.length > 0) messageType = 'image';
  else if (videoUrl) messageType = 'video';
  else if (voiceUrl) messageType = 'voice';
  else if (gifUrl) messageType = 'gif';
  else if (postId) messageType = 'post_share';
  else if (storyId && !text) messageType = 'story_share';
  else if (storyId) messageType = 'story_reply';
  else if (sharedProfileId) messageType = 'profile_share';
  else if (reelId) messageType = 'reel_share';

  const newMessage = await Message.create({
    conversationId,
    sender: userId,
    text,
    images,
    videoUrl,
    voiceUrl,
    gifUrl,
    messageType,
    postId,
    storyId,
    sharedProfileId,
    reelId,
    seenBy: [userId],
    repliedTo: repliedTo || undefined,
  } as any);

  // Update conversation
  const unreadCount = conversation.unreadCount || new Map();
  conversation.participants.forEach((pId) => {
    const idStr = pId.toString();
    if (idStr !== userId.toString()) {
      unreadCount.set(idStr, (unreadCount.get(idStr) || 0) + 1);
    }
  });

  conversation.lastMessage = newMessage._id as mongoose.Types.ObjectId;
  conversation.lastMessageAt = newMessage.createdAt;
  conversation.lastMessageSender = userId;
  conversation.unreadCount = unreadCount;
  await conversation.save();

  await newMessage.populate('sender', 'username fullName avatar');
  if (repliedTo) {
    await newMessage.populate('repliedTo');
  }
  if (postId || reelId) {
    await newMessage.populate({
      path: postId ? 'postId' : 'reelId',
      select: 'images caption author',
      populate: { path: 'author', select: 'username avatar' }
    });
  }
  if (storyId) {
    await newMessage.populate({
      path: 'storyId',
      select: 'mediaUrl mediaType author',
      populate: { path: 'author', select: 'username avatar' }
    });
  }
  if (sharedProfileId) {
    await newMessage.populate({
      path: 'sharedProfileId',
      select: 'username fullName avatar bio'
    });
  }

  // Emit socket event
  const socketService = getSocketService();
  if (socketService) {
    conversation.participants.forEach((pId) => {
      socketService.emitToUser(pId.toString(), 'newMessage', newMessage);
    });
  }

  res.status(201).json(new ApiResponse(true, 'Message sent successfully', newMessage));
};

export const editMessage = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { text } = req.body;

  if (!text) {
    throw new AppError('Text is required', 400);
  }

  const message = await Message.findById(id);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new AppError('You can only edit your own messages', 403);
  }

  if (message.messageType !== 'text') {
    throw new AppError('Only text messages can be edited', 400);
  }

  message.text = text;
  message.isEdited = true;
  await message.save();

  // Populate before sending event
  await message.populate('sender', 'username fullName avatar');

  // Emit socket event
  const conversation = await Conversation.findById(message.conversationId);
  const socketService = getSocketService();
  if (socketService && conversation) {
    conversation.participants.forEach((pId) => {
      socketService.emitToUser(pId.toString(), 'messageEdited', message);
    });
  }

  res.status(200).json(new ApiResponse(true, 'Message edited', message));
};

export const deleteMessage = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { type } = req.query; // 'me' or 'everyone'

  const message = await Message.findById(id);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  const conversationId = message.conversationId;

  if (type === 'everyone') {
    if (message.sender.toString() !== userId.toString()) {
      throw new AppError('You can only unsend your own messages', 403);
    }
    
    // Completely remove the message
    await message.deleteOne();

    // If this was the last message, update conversation lastMessage
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage?.toString() === id) {
      const lastMsg = await Message.findOne({ conversationId }).sort({ createdAt: -1 });
      if (lastMsg) {
        conversation.lastMessage = lastMsg._id as mongoose.Types.ObjectId;
        conversation.lastMessageAt = lastMsg.createdAt;
        conversation.lastMessageSender = lastMsg.sender;
      } else {
        conversation.lastMessage = undefined;
      }
      await conversation.save();
    }

    // Emit socket event
    const socketService = getSocketService();
    if (socketService && conversation) {
      conversation.participants.forEach((pId) => {
        socketService.emitToUser(pId.toString(), 'messageDeleted', { messageId: id, conversationId, type: 'everyone' });
      });
    }

    return res.status(200).json(new ApiResponse(true, 'Message unsent for everyone'));
  } else {
    // Delete for me
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }
    
    // Client removes it locally, no socket event needed for other users
    return res.status(200).json(new ApiResponse(true, 'Message deleted for you'));
  }
};

export const reactToMessage = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { emoji } = req.body;

  if (!emoji) {
    throw new AppError('Emoji is required', 400);
  }

  const message = await Message.findById(id);
  if (!message) {
    throw new AppError('Message not found', 404);
  }

  // Remove existing reaction from this user if any, or toggle
  const existingIndex = message.reactions.findIndex((r) => r.user.toString() === userId.toString());
  if (existingIndex > -1) {
    if (message.reactions[existingIndex].emoji === emoji) {
      // Toggle off
      message.reactions.splice(existingIndex, 1);
    } else {
      // Update
      message.reactions[existingIndex].emoji = emoji;
    }
  } else {
    // Add
    message.reactions.push({ emoji, user: userId });
  }

  await message.save();
  await message.populate('sender', 'username fullName avatar');
  if (message.repliedTo) await message.populate('repliedTo');

  const conversation = await Conversation.findById(message.conversationId);
  const socketService = getSocketService();
  if (socketService && conversation) {
    conversation.participants.forEach((pId) => {
      socketService.emitToUser(pId.toString(), 'messageReacted', message);
    });
  }

  res.status(200).json(new ApiResponse(true, 'Reaction updated', message));
};

export const markSeen = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  // Mark all unseen messages as seen
  await Message.updateMany(
    { 
      conversationId, 
      sender: { $ne: userId },
      seenBy: { $ne: userId }
    },
    { $addToSet: { seenBy: userId } }
  );

  // Reset unread count
  if (conversation.unreadCount) {
    conversation.unreadCount.set(userId.toString(), 0);
    // Needed because it's a Map
    conversation.markModified('unreadCount');
    await conversation.save();
  }

  // Emit socket event
  const socketService = getSocketService();
  if (socketService) {
    conversation.participants.forEach((pId) => {
      socketService.emitToUser(pId.toString(), 'messagesSeen', { conversationId, userId });
    });
  }

  res.status(200).json(new ApiResponse(true, 'Messages marked as seen'));
};

export const deleteConversation = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  if (!conversation.deletedBy.includes(userId as any)) {
    conversation.deletedBy.push(userId as any);
    await conversation.save();
  }

  // Also clear the chat for this user when deleting the conversation
  await Message.updateMany(
    { conversationId, deletedFor: { $ne: userId } },
    { $addToSet: { deletedFor: userId } }
  );

  res.status(200).json(new ApiResponse(true, 'Conversation deleted successfully'));
};

export const clearChat = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  await Message.updateMany(
    { conversationId, deletedFor: { $ne: userId } },
    { $addToSet: { deletedFor: userId } }
  );

  // Re-enable conversation if it was deleted
  if (conversation.deletedBy.includes(userId as any)) {
    conversation.deletedBy = conversation.deletedBy.filter((id) => id.toString() !== userId.toString());
  }
  
  // Clear last message preview if it's the last one for me
  // A simple approach is just clear it for everyone, or leave it. 
  // Let's clear the preview if we cleared the chat (but wait, what about the other user?)
  // We'll leave it in the DB, the frontend will filter it out if deletedFor me anyway.

  await conversation.save();

  res.status(200).json(new ApiResponse(true, 'Chat cleared successfully'));
};

export const muteConversation = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  const isMuted = conversation.mutedBy.includes(userId as any);
  if (isMuted) {
    conversation.mutedBy = conversation.mutedBy.filter((id) => id.toString() !== userId.toString());
  } else {
    conversation.mutedBy.push(userId as any);
  }
  
  await conversation.save();

  res.status(200).json(new ApiResponse(true, isMuted ? 'Conversation unmuted' : 'Conversation muted'));
};

export const searchMessages = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;
  const { q } = req.query;

  if (!q) {
    return res.status(200).json(new ApiResponse(true, 'No query provided', []));
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  const regex = new RegExp(q as string, 'i');
  
  const messages = await Message.find({
    conversationId,
    deletedFor: { $ne: userId },
    messageType: 'text',
    text: regex
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('sender', 'username fullName avatar')
    .lean();

  res.status(200).json(new ApiResponse(true, 'Messages searched successfully', messages));
};

export const getConversationMedia = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 30;
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError('Not authorized', 403);
  }

  const mediaMessages = await Message.find({
    conversationId,
    deletedFor: { $ne: userId },
    messageType: { $in: ['image', 'video'] }
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('images videoUrl createdAt sender messageType')
    .lean();

  const total = await Message.countDocuments({
    conversationId,
    deletedFor: { $ne: userId },
    messageType: { $in: ['image', 'video'] }
  });

  // Flatten media items
  const media = mediaMessages.flatMap(msg => {
    if (msg.messageType === 'image' && msg.images) {
      return msg.images.map(url => ({
        url,
        type: 'image',
        messageId: msg._id,
        createdAt: msg.createdAt,
        sender: msg.sender
      }));
    } else if (msg.messageType === 'video' && msg.videoUrl) {
      return [{
        url: msg.videoUrl,
        type: 'video',
        messageId: msg._id,
        createdAt: msg.createdAt,
        sender: msg.sender
      }];
    }
    return [];
  });

  res.status(200).json(new ApiResponse(true, 'Media fetched successfully', {
    media,
    page,
    hasMore: total > skip + mediaMessages.length
  }));
};

export const forwardMessage = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { id } = req.params;
  const { targetConversationIds } = req.body; // Array of conversation IDs to forward to

  if (!targetConversationIds || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
    throw new AppError('Target conversations are required', 400);
  }

  const originalMessage = await Message.findById(id);
  if (!originalMessage) {
    throw new AppError('Original message not found', 404);
  }

  // Ensure user has access to the original message
  const sourceConversation = await Conversation.findById(originalMessage.conversationId);
  if (!sourceConversation || !sourceConversation.participants.includes(userId)) {
    throw new AppError('Not authorized to access original message', 403);
  }

  const forwardedMessages = [];
  const socketService = getSocketService();

  for (const targetConvId of targetConversationIds) {
    const targetConversation = await Conversation.findById(targetConvId);
    
    // Verify user is in target conversation
    if (!targetConversation || !targetConversation.participants.includes(userId)) {
      continue; // Skip unauthorized conversations
    }

    const newMessage = await Message.create({
      conversationId: targetConversation._id,
      sender: userId,
      text: originalMessage.text,
      images: originalMessage.images,
      videoUrl: originalMessage.videoUrl,
      voiceUrl: originalMessage.voiceUrl,
      gifUrl: originalMessage.gifUrl,
      messageType: originalMessage.messageType,
      postId: originalMessage.postId,
      storyId: originalMessage.storyId,
      sharedProfileId: originalMessage.sharedProfileId,
      reelId: originalMessage.reelId,
      forwardedFrom: originalMessage._id,
      seenBy: [userId],
    } as any);

    await newMessage.populate('sender', 'username fullName avatar');
    if (newMessage.postId) {
      await newMessage.populate({
        path: 'postId',
        select: 'images caption author',
        populate: { path: 'author', select: 'username avatar' }
      });
    }

    // Update target conversation
    const unreadCount = targetConversation.unreadCount || new Map();
    targetConversation.participants.forEach((pId) => {
      const idStr = pId.toString();
      if (idStr !== userId.toString()) {
        unreadCount.set(idStr, (unreadCount.get(idStr) || 0) + 1);
      }
    });

    targetConversation.lastMessage = newMessage._id as mongoose.Types.ObjectId;
    targetConversation.lastMessageAt = newMessage.createdAt;
    targetConversation.lastMessageSender = userId;
    targetConversation.unreadCount = unreadCount;
    await targetConversation.save();

    forwardedMessages.push(newMessage);

    // Emit socket event for each target conversation
    if (socketService) {
      targetConversation.participants.forEach((pId) => {
        socketService.emitToUser(pId.toString(), 'newMessage', newMessage);
      });
    }
  }

  res.status(200).json(new ApiResponse(true, 'Message forwarded successfully', forwardedMessages));
};

export const acceptMessageRequest = async (req: Request, res: Response) => {
  const userId = req.user!._id;
  const { conversationId } = req.params;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  if (conversation.isRequestFor && conversation.isRequestFor.includes(userId as any)) {
    conversation.isRequestFor = conversation.isRequestFor.filter((id) => id.toString() !== userId.toString());
    await conversation.save();
    
    // Also unrestrict the other user automatically
    const otherParticipantId = conversation.participants.find(id => id.toString() !== userId.toString());
    if (otherParticipantId) {
      await User.findByIdAndUpdate(userId, {
        $pull: { restrictedUsers: otherParticipantId }
      });
    }
  }

  res.status(200).json(new ApiResponse(true, 'Message request accepted', conversation));
};

