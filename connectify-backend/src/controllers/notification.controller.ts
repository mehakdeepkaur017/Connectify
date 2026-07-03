import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const notifications = await (Notification.find({ recipient: userId }) as any)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'sender', select: 'username avatar fullName' })
      .populate({ path: 'post', select: 'images' })
      .populate({ path: 'comment', select: 'text' })
      .lean();

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.status(200).json(new ApiResponse(true, 'Notifications retrieved', {
      notifications,
      unreadCount,
      page,
      hasMore: notifications.length === limit
    }));
  } catch (error) {
    next(error);
  }
};

export const markNotificationsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json(new ApiResponse(true, 'Notifications marked as read'));
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }
    
    // Ensure the current user is the recipient of the notification
    if (notification.recipient.toString() !== req.user?._id?.toString()) {
      return next(new AppError('You are not authorized to delete this notification', 403));
    }
    
    await notification.deleteOne();
    
    res.status(200).json(new ApiResponse(true, 'Notification deleted successfully'));
  } catch (error) {
    next(error);
  }
};
