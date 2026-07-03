import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    caption: z.string().max(2200, 'Caption cannot exceed 2200 characters').optional().default(''),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    caption: z.string().max(2200, 'Caption cannot exceed 2200 characters').optional(),
    location: z.string().optional(),
    commentsDisabled: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const createCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment cannot exceed 1000 characters'),
    parentCommentId: z.string().optional(),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Comment cannot be empty').max(1000, 'Comment cannot exceed 1000 characters'),
  }),
});

// Used to validate MongoDB Object IDs in params
export const objectIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
  }),
});
