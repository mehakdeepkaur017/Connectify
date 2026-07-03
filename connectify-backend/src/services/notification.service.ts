import { Notification } from '../models/Notification';
import { getSocketService } from './socket.service';

interface CreateNotificationParams {
  recipient: string;
  sender: string;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'follow_request' | 'follow_accept' | 'mention' | 'save' | 'story_like' | 'story_reply' | 'message_request';
  post?: string;
  comment?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    // Don't notify yourself
    if (params.recipient.toString() === params.sender.toString()) return null;

    // Deduplicate identical notifications (prevents duplicate follow requests from race conditions)
    const existing = await Notification.findOne({
      recipient: params.recipient,
      sender: params.sender,
      type: params.type,
      ...(params.post && { post: params.post }),
      ...(params.comment && { comment: params.comment })
    });

    if (existing) return existing;

    const notification = new Notification(params);
    await notification.save();
    
    const populated = await notification.populate([
      { path: 'sender', select: 'username avatar fullName' },
      { path: 'post', select: 'images' },
      { path: 'comment', select: 'text' }
    ]);

    // Send realtime update
    const socketService = getSocketService();
    if (socketService) {
      socketService.emitToUser(params.recipient.toString(), 'newNotification', populated);
    }

    return populated;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};
