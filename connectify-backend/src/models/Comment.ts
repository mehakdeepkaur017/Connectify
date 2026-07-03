import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IPost } from './Post';

export interface IComment extends Document {
  post: mongoose.Types.ObjectId | IPost;
  author: mongoose.Types.ObjectId | IUser;
  text: string;
  parentComment?: mongoose.Types.ObjectId | IComment;
  likes: mongoose.Types.ObjectId[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' }, // For nested replies
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for fast retrieval
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
