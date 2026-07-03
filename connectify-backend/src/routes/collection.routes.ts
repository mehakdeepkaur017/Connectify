import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { 
  createCollection, 
  getCollections, 
  getCollectionById, 
  saveToCollection 
} from '../controllers/collection.controller';

const router = Router();

router.use(authenticate);

router.route('/')
  .post(createCollection)
  .get(getCollections);

router.route('/:id')
  .get(getCollectionById);

router.post('/:id/save', saveToCollection);

export default router;
