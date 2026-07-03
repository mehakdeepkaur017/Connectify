import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IStory extends Document {
  author: mongoose.Types.ObjectId | IUser;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'text';
  text?: string;
  viewers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  isArchived: boolean;
  likes: mongoose.Types.ObjectId[];
  metadata?: any;
  createdAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, default: '' },
    mediaType: { type: String, enum: ['image', 'video', 'text'], default: 'image' },
    text: { type: String },
    viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
    isArchived: { type: Boolean, default: false },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Removed TTL index so stories can be archived instead of deleted
storySchema.index({ author: 1, createdAt: -1 });

export const Story = mongoose.model<IStory>('Story', storySchema);
