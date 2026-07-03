import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ApiResponse } from '../utils/ApiResponse';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from '../validations/auth.validation';
import * as authService from '../services/auth.service';
import { env } from '../config/env';

const isProduction = process.env.NODE_ENV === 'production';

const setTokenCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain cookies in production
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = signupSchema.parse(req.body);
    const user = await authService.registerUser(validatedData);
    const { user: loggedInUser, accessToken, refreshToken } = await authService.loginUser({ email: validatedData.email, password: validatedData.password });
    
    setTokenCookie(res, refreshToken);

    res.status(201).json(
      new ApiResponse(true, 'User registered and logged in successfully.', { user: loggedInUser, accessToken, refreshToken })
    );
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(new AppError('Validation Error', 400, error.errors));
    }
    next(error);
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Controller accepts email or username mapped to email field for validation convenience or manual checks.
    // If loginSchema requires strictly email format but we allow username, we might bypass Zod or modify schema.
    // Given the prompt "Allow login using either email or username", we will just ensure it has email and password.
    const { email, username, password } = req.body;
    
    if ((!email && !username) || !password) {
      throw new AppError('Please provide email/username and password', 400);
    }
    
    const loginIdentifier = email || username;

    const { user, accessToken, refreshToken } = await authService.loginUser({ email: loginIdentifier, password });
    
    setTokenCookie(res, refreshToken);

    res.status(200).json(
      new ApiResponse(true, 'Login successful', { user, accessToken, refreshToken })
    );
  } catch (error: any) {
    next(error);
  }
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user) {
      await authService.processLogout(req.user._id.toString());
    }
    
    res.cookie('refreshToken', 'logout', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    });

    res.status(200).json(new ApiResponse(true, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);
    await authService.processForgotPassword(validatedData.email);
    
    res.status(200).json(new ApiResponse(true, 'If an account with that email exists, a password reset link has been sent.'));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(new AppError('Validation Error', 400, error.errors));
    }
    next(error);
  }
};

export const resetPasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      throw new AppError('Invalid or missing token', 400);
    }

    const validatedData = resetPasswordSchema.parse(req.body);
    await authService.processResetPassword(token, validatedData.password);
    
    res.status(200).json(new ApiResponse(true, 'Password has been successfully reset.'));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(new AppError('Validation Error', 400, error.errors));
    }
    next(error);
  }
};

export const verifyEmailController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      throw new AppError('Invalid or missing token', 400);
    }

    await authService.verifyEmailService(token);
    
    res.status(200).json(new ApiResponse(true, 'Email has been successfully verified.'));
  } catch (error) {
    next(error);
  }
};

export const resendVerificationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = resendVerificationSchema.parse(req.body);
    await authService.resendVerificationEmail(validatedData.email);
    
    res.status(200).json(new ApiResponse(true, 'If your email is registered and unverified, a new verification link has been sent.'));
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return next(new AppError('Validation Error', 400, error.errors));
    }
    next(error);
  }
};

export const refreshTokenController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.body.refreshToken || req.cookies.refreshToken;
    if (!token) {
      throw new AppError('No refresh token provided', 401);
    }

    const { accessToken, refreshToken } = await authService.processRefreshToken(token);
    
    setTokenCookie(res, refreshToken);

    res.status(200).json(new ApiResponse(true, 'Token refreshed successfully', { accessToken, refreshToken }));
  } catch (error) {
    next(error);
  }
};

export const getCurrentUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    // Re-fetch with populated followRequests for the follow requests UI
    const { User } = await import('../models/User');
    const user = await User.findById(req.user._id)
      .select('-password -refreshToken')
      .populate('followRequests', 'username fullName avatar');

    res.status(200).json(new ApiResponse(true, 'User fetched successfully', { user }));
  } catch (error) {
    next(error);
  }
};

export const changePasswordController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new AppError('Please provide old and new password', 400);
    }
    await authService.processChangePassword(req.user!._id.toString(), oldPassword, newPassword);
    res.status(200).json(new ApiResponse(true, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};

export const logoutAllController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await authService.processLogoutAll(req.user!._id.toString());
    res.cookie('refreshToken', 'logout', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      expires: new Date(Date.now() + 10 * 1000), // expire in 10 seconds
    });
    res.status(200).json(new ApiResponse(true, 'Logged out of all devices successfully'));
  } catch (error) {
    next(error);
  }
};
