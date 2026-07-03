import { Router } from 'express';
import { 
  createPost, 
  getFeed,
  getReelsFeed,
  getPostById,
  updatePost,
  likePost, 
  savePost, 
  deletePost,
  getExploreFeed,
  getPostsByHashtag,
  archivePost,
  getSuggestedFeed
} from '../controllers/post.controller';
import { 
  createComment, 
  getComments,
  updateComment,
  deleteComment,
  likeComment
} from '../controllers/comment.controller';
import { authenticate as protect } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validateMiddleware';
import { 
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
  objectIdParamSchema 
} from '../validators/post.validator';

const router = Router();

// Protect all post routes
router.use(protect);

// POST ROUTES
router.get('/feed', getFeed);
router.get('/reels', getReelsFeed);
router.get('/explore', getExploreFeed);
router.get('/explore/tags/:hashtag', getPostsByHashtag);
router.get('/suggested', getSuggestedFeed);

router.route('/')
  .post(
    upload.array('images', 10),
    validate(createPostSchema),
    createPost
  )
  .get(getFeed);

router.route('/:id')
  .get(validate(objectIdParamSchema), getPostById)
  .patch(validate(objectIdParamSchema), validate(updatePostSchema), updatePost)
  .delete(validate(objectIdParamSchema), deletePost);

router.patch('/:id/archive', validate(objectIdParamSchema), archivePost);
router.post('/:id/like', validate(objectIdParamSchema), likePost);
router.post('/:id/save', validate(objectIdParamSchema), savePost);

// COMMENT ROUTES
router.route('/:postId/comments')
  .post(validate(createCommentSchema), createComment)
  .get(getComments);

router.route('/comments/:id')
  .patch(validate(objectIdParamSchema), validate(updateCommentSchema), updateComment)
  .delete(validate(objectIdParamSchema), deleteComment);

router.post('/comments/:id/like', validate(objectIdParamSchema), likeComment);

export default router;
