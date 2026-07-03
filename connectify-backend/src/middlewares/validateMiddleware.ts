import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const zodError = error as any;
        const errorMessages = zodError.errors.map((issue: any) => `${issue.path.join('.')} is ${issue.message}`);
        return next(new AppError(`Validation Error: ${errorMessages.join(', ')}`, 400));
      }
      return next(new AppError('Internal Server Error', 500));
    }
  };
};
