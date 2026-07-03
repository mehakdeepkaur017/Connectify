'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Link from 'next/link';
import { AxiosError } from 'axios';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: (e: React.MouseEvent) => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps = {}) {
  const { login } = useAuth();
  
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Successfully logged in!');
      login(data.data.accessToken, data.data.refreshToken, data.data.user);
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || 'Failed to login';
      toast.error(message);
    },
  });

  const onSubmit = (data: LoginValues) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email or Username</Label>
        <Input
          id="email"
          placeholder="Enter your email or username"
          {...form.register('email')}
          className={form.formState.errors.email ? 'border-destructive' : ''}
          disabled={loginMutation.isPending}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
            tabIndex={-1}
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          {...form.register('password')}
          className={form.formState.errors.password ? 'border-destructive' : ''}
          disabled={loginMutation.isPending}
        />
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="rememberMe"
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          {...form.register('rememberMe')}
          disabled={loginMutation.isPending}
        />
        <Label htmlFor="rememberMe" className="text-sm font-normal">
          Remember me for 30 days
        </Label>
      </div>

      <Button
        type="submit"
        className="w-full relative overflow-hidden transition-all h-11 shadow-lg shadow-primary/25"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? (
          <LoadingSpinner size="sm" className="text-white dark:text-black" />
        ) : (
          <span>Sign In</span>
        )}
      </Button>

      <div className="text-center text-sm">
        Don&apos;t have an account?{' '}
        {onSwitchToSignup ? (
          <button type="button" onClick={onSwitchToSignup} className="font-semibold text-primary hover:underline">
            Sign up
          </button>
        ) : (
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up
          </Link>
        )}
      </div>
    </form>
  );
}
