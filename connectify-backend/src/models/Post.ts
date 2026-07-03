import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IPost extends Document {
  author: mongoose.Types.ObjectId | IUser;
  caption: string;
  images: string[];
  likes: mongoose.Types.ObjectId[];
  savedBy: mongoose.Types.ObjectId[];
  commentsCount: number;
  isArchived: boolean;
  commentsDisabled: boolean;
  isReel: boolean;
  location?: string;
  hashtags: string[];
  taggedUsers: mongoose.Types.ObjectId[];
  mentions: { originalUsername: string, user: mongoose.Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String, trim: true, default: '' },
    images: { type: [String], validate: [(val: string[]) => val.length <= 10, 'Exceeds limit of 10 images'] },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mentions: [{ 
      originalUsername: { type: String },
      user: { type: Schema.Types.ObjectId, ref: 'User' } 
    }],
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    commentsDisabled: { type: Boolean, default: false },
    isReel: { type: Boolean, default: false },
    location: { type: String, trim: true },
    hashtags: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Indexes for feed performance
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
