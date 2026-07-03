'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import Link from 'next/link';
import { useWatch } from 'react-hook-form';
import { AxiosError } from 'axios';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms & Conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupValues = z.infer<typeof signupSchema>;

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

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: (e: React.MouseEvent) => void;
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps = {}) {
  const router = useRouter();
  const { login } = useAuth() || {};
  
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
    mode: 'onChange',
  });

  const passwordValue = useWatch({ control: form.control, name: 'password' });
  const strength = getPasswordStrength(passwordValue || '');

  const signupMutation = useMutation({
    mutationFn: async (data: Omit<SignupValues, 'confirmPassword' | 'terms'>) => {
      const response = await api.post('/auth/signup', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Account created successfully!');
      if (login && data.data?.accessToken && data.data?.refreshToken && data.data?.user) {
        login(data.data.accessToken, data.data.refreshToken, data.data.user);
      }
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/');
      }
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || 'Failed to sign up';
      toast.error(message);
    },
  });

  const onSubmit = (data: SignupValues) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, terms, ...submitData } = data;
    signupMutation.mutate(submitData);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          placeholder="John Doe"
          {...form.register('fullName')}
          className={form.formState.errors.fullName ? 'border-destructive' : ''}
          disabled={signupMutation.isPending}
        />
        {form.formState.errors.fullName && (
          <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            placeholder="johndoe"
            {...form.register('username')}
            className={form.formState.errors.username ? 'border-destructive' : ''}
            disabled={signupMutation.isPending}
          />
          {form.formState.errors.username && (
            <p className="text-sm text-destructive">{form.formState.errors.username.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...form.register('email')}
            className={form.formState.errors.email ? 'border-destructive' : ''}
            disabled={signupMutation.isPending}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          {...form.register('password')}
          className={form.formState.errors.password ? 'border-destructive' : ''}
          disabled={signupMutation.isPending}
        />
        {passwordValue && passwordValue.length > 0 && (
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
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          {...form.register('confirmPassword')}
          className={form.formState.errors.confirmPassword ? 'border-destructive' : ''}
          disabled={signupMutation.isPending}
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      <div className="flex items-start space-x-2 pt-2">
        <input
          type="checkbox"
          id="terms"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          {...form.register('terms')}
          disabled={signupMutation.isPending}
        />
        <div className="space-y-1">
          <Label htmlFor="terms" className="text-sm font-normal">
            I agree to the <Link href="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </Label>
          {form.formState.errors.terms && (
            <p className="text-xs text-destructive">{form.formState.errors.terms.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full relative overflow-hidden transition-all h-11 mt-4 shadow-lg shadow-primary/25"
        disabled={signupMutation.isPending || !form.formState.isValid}
      >
        {signupMutation.isPending ? (
          <LoadingSpinner size="sm" className="text-white dark:text-black" />
        ) : (
          <span>Create Account</span>
        )}
      </Button>

      <div className="text-center text-sm pt-2">
        Already have an account?{' '}
        {onSwitchToLogin ? (
          <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">
            Sign in
          </button>
        ) : (
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        )}
      </div>
    </form>
  );
}
