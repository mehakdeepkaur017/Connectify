import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  images: string[];
  videoUrl?: string;
  voiceUrl?: string;
  gifUrl?: string;
  messageType: 'text' | 'image' | 'video' | 'voice' | 'gif' | 'system' | 'story_reply' | 'post_share' | 'profile_share' | 'reel_share';
  storyId?: mongoose.Types.ObjectId | any;
  postId?: mongoose.Types.ObjectId | any;
  sharedProfileId?: mongoose.Types.ObjectId | any;
  reelId?: mongoose.Types.ObjectId | any;
  forwardedFrom?: mongoose.Types.ObjectId;
  isEdited: boolean;
  status: 'sent' | 'delivered' | 'seen';
  seenBy: mongoose.Types.ObjectId[];
  deliveredTo: mongoose.Types.ObjectId[];
  deletedFor: mongoose.Types.ObjectId[];
  isDeletedForEveryone: boolean;
  repliedTo?: mongoose.Types.ObjectId | IMessage;
  reactions: { emoji: string; user: mongoose.Types.ObjectId }[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    images: [
      {
        type: String,
      },
    ],
    videoUrl: String,
    voiceUrl: String,
    gifUrl: String,
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'voice', 'gif', 'system', 'story_reply', 'story_share', 'post_share', 'profile_share', 'reel_share'],
      default: 'text',
    },
    storyId: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
    sharedProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reelId: {
      type: Schema.Types.ObjectId,
      ref: 'Post', // Reels are just posts with type 'reel'
    },
    forwardedFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    seenBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isDeletedForEveryone: {
      type: Boolean,
      default: false,
    },
    repliedTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    reactions: [
      {
        emoji: String,
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexing for fetching messages in a conversation efficiently
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
