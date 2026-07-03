import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken } from '../utils/auth';
import { AppError } from '../utils/AppError';
import { User } from '../models/User';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized: No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token) as { id: string };

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      throw new AppError('Unauthorized: Invalid user', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Unauthorized: Invalid or expired token', 401));
  }
};

export const authenticateOptional = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token) as { id: string };
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore errors for optional authentication
  }
  next();
};

export const authorizeRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: You do not have permission', 403));
    }
    next();
  };
};

export const verifyRefresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Attempt to get token from cookies or body
    const refreshToken = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;
    
    if (!refreshToken) {
      throw new AppError('Unauthorized: No refresh token provided', 401);
    }

    const decoded = verifyRefreshToken(refreshToken) as { id: string };
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Unauthorized: Invalid refresh token', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(new AppError('Unauthorized: Invalid or expired refresh token', 401));
  }
};
