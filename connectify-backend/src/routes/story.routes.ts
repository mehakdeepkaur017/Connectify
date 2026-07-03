import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/upload.middleware';
import { 
  createStory,
  getStoryFeed,
  markStoryViewed,
  deleteStory,
  archiveStory,
  likeStory,
  getStoryViewers,
  replyToStory
} from '../controllers/story.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .post(upload.single('media'), createStory)
  .get(getStoryFeed);

router.patch('/:id/view', markStoryViewed);
router.delete('/:id', deleteStory);
router.patch('/:id/archive', archiveStory);
router.post('/:id/like', likeStory);
router.get('/:id/viewers', getStoryViewers);
router.post('/:id/reply', replyToStory);

export default router;
