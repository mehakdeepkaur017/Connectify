'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AuthLayout } from '@/components/layouts/auth-layout';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PublicRoute } from '@/components/shared/route-guards';
import { useWatch } from 'react-hook-form';
import { AxiosError } from 'axios';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, text: 'Weak', color: 'bg-muted' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score < 2) return { score: 1, text: 'Weak', color: 'bg-destructive' };
  if (score < 4) return { score: 3, text: 'Medium', color: 'bg-yellow-500' };
  return { score: 5, text: 'Strong', color: 'bg-green-500' };
};

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = useWatch({ control: form.control, name: 'password' });
  const strength = getPasswordStrength(passwordValue || '');

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordValues) => {
      const response = await api.post(`/auth/reset-password?token=${token}`, {
        password: data.password,
      });
      return response.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || 'Failed to reset password. The link might be expired.';
      toast.error(message);
    },
  });

  const onSubmit = (data: ResetPasswordValues) => {
    mutation.mutate(data);
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid Request" description="No reset token found.">
        <div className="flex flex-col items-center space-y-4 text-center">
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-sm text-muted-foreground">
            The password reset link is invalid or missing.
          </p>
          <Button onClick={() => router.push('/forgot-password')} className="mt-4">
            Request New Link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <PublicRoute>
      <AuthLayout 
        title="Set New Password" 
        description="Choose a strong password for your account."
      >
        {isSuccess ? (
          <div className="flex flex-col items-center space-y-4 text-center animate-in zoom-in duration-500">
            <div className="rounded-full bg-green-500/20 p-3">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-medium">Password Updated</h3>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full mt-4">
              Continue to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                {...form.register('password')}
                className={form.formState.errors.password ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {passwordValue.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1 h-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-colors ${
                          level <= strength.score ? strength.color : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {strength.text}
                  </span>
                </div>
              )}
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="••••••••"
                {...form.register('confirmPassword')}
                className={form.formState.errors.confirmPassword ? 'border-destructive' : ''}
                disabled={mutation.isPending}
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
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
                <span>Reset Password</span>
              )}
            </Button>
          </form>
        )}
      </AuthLayout>
    </PublicRoute>
  );
}
