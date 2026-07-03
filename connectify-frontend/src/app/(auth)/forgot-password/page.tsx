'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AuthLayout } from '@/components/layouts/auth-layout';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { PublicRoute } from '@/components/shared/route-guards';
import { AxiosError } from 'axios';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordValues) => {
      const response = await api.post('/auth/forgot-password', data);
      return response.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || 'Failed to send reset link';
      toast.error(message);
    },
  });

  const onSubmit = (data: ForgotPasswordValues) => {
    mutation.mutate(data);
  };

  return (
    <PublicRoute>
      <AuthLayout 
        title="Reset Password" 
        description="Enter your email to receive a password reset link."
      >
        {isSuccess ? (
          <div className="flex flex-col items-center space-y-4 text-center animate-in zoom-in duration-500">
            <div className="rounded-full bg-green-500/20 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-medium">Check your email</h3>
            <p className="text-sm text-muted-foreground">
              We have sent a password reset link to <br/>
              <span className="font-semibold text-foreground">{form.getValues('email')}</span>
            </p>
            <Button onClick={() => setIsSuccess(false)} variant="outline" className="mt-6">
              Try another email
            </Button>
            <Link href="/login" className="text-sm text-primary hover:underline mt-4">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                {...form.register('email')}
                className={form.formState.errors.email ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full relative overflow-hidden transition-all h-11 shadow-lg shadow-primary/25"
              disabled={mutation.isPending || !form.formState.isValid}
            >
              {mutation.isPending ? (
                <LoadingSpinner size="sm" className="text-white dark:text-black" />
              ) : (
                <span>Send Reset Link</span>
              )}
            </Button>

            <div className="text-center text-sm pt-2">
              Remember your password?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        )}
      </AuthLayout>
    </PublicRoute>
  );
}
