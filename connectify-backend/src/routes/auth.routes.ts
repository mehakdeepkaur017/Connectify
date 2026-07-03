import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  signupController,
  loginController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  verifyEmailController,
  resendVerificationController,
  refreshTokenController,
  getCurrentUserController,
  changePasswordController,
  logoutAllController,
} from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Rate limiting for auth routes to prevent brute force
const isDevelopment = process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 20, // limit each IP to 20 requests per windowMs in production
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
    });
  },
});

// router.use(authLimiter);

router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/logout', authenticate, logoutController);
router.post('/logout-all', authenticate, logoutAllController);
router.post('/change-password', authenticate, changePasswordController);

router.post('/forgot-password', forgotPasswordController);
router.post('/reset-password', resetPasswordController);
router.get('/verify-email', verifyEmailController);
router.post('/resend-verification', resendVerificationController);

router.post('/refresh', refreshTokenController);
router.get('/me', authenticate, getCurrentUserController);

export default router;

