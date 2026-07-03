'use client';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { SignupForm } from '@/components/auth/signup-form';
import { PublicRoute } from '@/components/shared/route-guards';

export default function SignupPage() {
  return (
    <PublicRoute>
      <AuthLayout 
        title="Join Connectify" 
        description="Create your account to start connecting and sharing."
      >
        <SignupForm />
      </AuthLayout>
    </PublicRoute>
  );
}
