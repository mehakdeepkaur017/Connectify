import crypto from 'crypto';
import { User, IUser } from '../models/User';
import { AppError } from '../utils/AppError';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/auth';
import { sendEmail } from '../utils/email';

export const registerUser = async (data: any) => {
  const { fullName, username, email, password } = data;

  const searchEmail = email.toLowerCase().trim();
  const searchUsername = username.toLowerCase().trim();

  const existingUser = await User.findOne({ $or: [{ email: searchEmail }, { username: searchUsername }] });
  if (existingUser) {
    throw new AppError('Username or email already exists', 400);
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await User.create({
    fullName,
    username,
    email,
    password: hashedPassword,
  });

  const userObj = newUser.toObject();
  delete userObj.password;
  delete userObj.emailVerificationToken;
  
  return userObj;
};

export const loginUser = async (data: any) => {
  const { email, password } = data; // Note: controller allows email or username mapped to 'email' var here
  
  const searchIdentifier = email.toLowerCase().trim();

  const user = await User.findOne({ $or: [{ email: searchIdentifier }, { username: searchIdentifier }] }).select('+password');
  if (!user || !user.password) {
    throw new AppError('Invalid credentials', 401);
  }

  // Mandatory email verification disabled per Phase 7 requirements
  // if (!user.isVerified) {
  //   throw new AppError('Please verify your email before logging in.', 403);
  // }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  
  const hashedRefreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

  user.refreshToken = hashedRefreshToken;
  await user.save();

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken;

  return { user: userObj, accessToken, refreshToken };
};

export const verifyEmailService = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({ emailVerificationToken: hashedToken });
  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  user.isVerified = true;
  user.emailVerificationToken = undefined;
  await user.save();

  return true;
};

export const resendVerificationEmail = async (email: string) => {
  const searchEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: searchEmail });
  
  if (!user) {
    // Return true to prevent email enumeration
    return true;
  }

  if (user.isVerified) {
    throw new AppError('Email is already verified', 400);
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  user.emailVerificationToken = hashedVerificationToken;
  await user.save();

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Connectify - Verify your email',
    text: `Please verify your email by clicking the following link: ${verifyUrl}`,
    html: `<p>Please verify your email by clicking the following link:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
  });

  return true;
};

export const processForgotPassword = async (email: string) => {
  const searchEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: searchEmail });
  if (!user) {
    // Return true even if user doesn't exist to prevent email enumeration attacks
    return true;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedResetToken;
  user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: user.email,
    subject: 'Connectify - Password Reset',
    text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
    html: `<p>You requested a password reset. Please click the link to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`,
  });

  return true;
};

export const processResetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  user.password = await hashPassword(newPassword);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // Invalidate existing refresh tokens by clearing it
  user.refreshToken = undefined;
  await user.save();

  return true;
};

export const processRefreshToken = async (token: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  
  const user = await User.findOne({ refreshToken: hashedToken });
  if (!user) {
    throw new AppError('Invalid refresh token', 401);
  }

  const accessToken = generateAccessToken(user.id);
  const newRefreshToken = generateRefreshToken(user.id);
  
  const newHashedRefreshToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  user.refreshToken = newHashedRefreshToken;
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
};

export const processLogout = async (userId: string) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    await user.save();
  }
  return true;
};

export const processChangePassword = async (userId: string, oldPassword: string, newPassword: string) => {
  const user = await User.findById(userId).select('+password');
  if (!user || !user.password) throw new AppError('User not found', 404);

  const isPasswordValid = await comparePassword(oldPassword, user.password);
  if (!isPasswordValid) throw new AppError('Invalid current password', 400);

  user.password = await hashPassword(newPassword);
  await user.save();
  return true;
};

export const processLogoutAll = async (userId: string) => {
  const user = await User.findById(userId);
  if (user) {
    user.refreshToken = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  }
  return true;
};
