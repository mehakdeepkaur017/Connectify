'use client';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { LoginForm } from '@/components/auth/login-form';
import { PublicRoute } from '@/components/shared/route-guards';

export default function LoginPage() {
  return (
    <PublicRoute>
      <AuthLayout 
        title="Welcome Back" 
        description="Enter your credentials to access your account."
      >
        <LoginForm />
      </AuthLayout>
    </PublicRoute>
  );
}
