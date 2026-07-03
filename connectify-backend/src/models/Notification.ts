import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';
import { IComment } from './Comment';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId | IUser;
  sender: mongoose.Types.ObjectId | IUser;
  type: 'like' | 'comment' | 'reply' | 'follow' | 'follow_request' | 'follow_accept' | 'mention' | 'save' | 'story_like' | 'story_reply' | 'message_request';
  post?: mongoose.Types.ObjectId | IPost;
  comment?: mongoose.Types.ObjectId | IComment;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
      type: String, 
      enum: ['like', 'comment', 'reply', 'follow', 'follow_request', 'follow_accept', 'mention', 'save', 'story_like', 'story_reply', 'message_request'], 
      required: true 
    },
    post: { type: Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
