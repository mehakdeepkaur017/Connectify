'use client';

import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const [oldPassword, setOldPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [message, setMessage] = React.useState({ text: '', type: '' });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/change-password', { oldPassword, newPassword });
      return res.data;
    },
    onSuccess: () => {
      setMessage({ text: 'Password changed successfully', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }, message?: string };
      setMessage({ text: err.response?.data?.message || err.message || 'Failed to change password', type: 'error' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters', type: 'error' });
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Security</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {message.text && (
            <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message.text}
            </div>
          )}
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-semibold">Current Password</label>
            <input 
              type="password" 
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              required 
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-semibold">New Password</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              required 
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-semibold">Confirm New Password</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm"
              required 
            />
          </div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Change Password
          </Button>
        </form>
      </div>

      <div className="border-t border-border pt-8 space-y-4">
        <h2 className="text-xl font-semibold">Login Activity</h2>
        <p className="text-sm text-muted-foreground">Review where you&apos;re logged in and manage your active sessions.</p>
        <Link href="/settings/active-sessions">
          <Button variant="secondary" className="mt-2">View Active Sessions</Button>
        </Link>
      </div>
    </div>
  );
}
