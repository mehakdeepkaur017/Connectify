'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth.context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateMe } from '@/lib/api/users.api';
import { api } from '@/lib/axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [username, setUsername] = React.useState(user?.username || '');
  const [email, setEmail] = React.useState(user?.email || '');
  
  const [isUsernameAvailable, setIsUsernameAvailable] = React.useState<boolean | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = React.useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = React.useState('');
  
  const { logout } = useAuth();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/users/me');
      return res.data;
    },
    onSuccess: () => {
      toast.success('Account deleted successfully');
      setTimeout(() => logout(), 1500);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }, message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to delete account');
      setIsDeleteModalOpen(false);
    }
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateMe(data),
    onSuccess: (data) => {
      updateUser(data as unknown as Parameters<typeof updateUser>[0]);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Account updated successfully');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }, message?: string };
      toast.error(err.response?.data?.message || err.message || 'Failed to update account');
    }
  });

  React.useEffect(() => {
    let active = true;
    if (username === user?.username) {
      setTimeout(() => { if (active) setIsUsernameAvailable(null); }, 0);
      return () => { active = false; };
    }
    
    if (username.length < 3) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsUsernameAvailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const { data } = await api.get(`/users/check-username?username=${username}`);
        setIsUsernameAvailable(data.data.available);
      } catch (err) {
        setIsUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, user?.username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUsernameAvailable === false) {
      toast.error('Username is not available');
      return;
    }
    const data = new FormData();
    if (username !== user?.username) data.append('username', username);
    if (email !== user?.email) data.append('email', email);
    
    if (data.entries().next().done) {
      toast.info('No changes to save');
      return;
    }
    mutation.mutate(data);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="username" className="font-semibold text-base">Username</Label>
          <div className="relative">
            <Input 
              id="username" 
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="Username" 
            />
            {isCheckingUsername && (
              <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">Checking...</span>
            )}
            {!isCheckingUsername && isUsernameAvailable === true && (
              <span className="absolute right-3 top-2.5 text-sm text-green-500">Available</span>
            )}
            {!isCheckingUsername && isUsernameAvailable === false && username.length >= 3 && (
              <span className="absolute right-3 top-2.5 text-sm text-red-500">Taken</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            In most cases, you&apos;ll be able to change your username back to {user?.username} for another 14 days.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="font-semibold text-base">Email Address</Label>
          <Input 
            id="email" 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" 
            disabled // Often changing email requires a verification flow, but we leave disabled for now
          />
          <p className="text-xs text-muted-foreground mt-1">
            Email changes are currently disabled.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            disabled={mutation.isPending || isUsernameAvailable === false} 
            className="px-8 font-semibold"
          >
            {mutation.isPending ? 'Saving...' : 'Submit'}
          </Button>
        </div>
      </form>

      <div className="mt-12 pt-8 border-t border-border">
        <h2 className="text-xl font-bold text-red-500 mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)}>
          Delete Account
        </Button>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md rounded-2xl p-6">
            <h2 className="text-xl font-bold text-red-500 mb-2">Delete Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete your account and remove your data from our servers, including posts, comments, stories, and messages.
            </p>
            <p className="text-sm font-semibold mb-4 text-foreground">
              Please type <span className="text-red-500 bg-red-500/10 px-1 rounded">DELETE</span> to confirm.
            </p>
            <Input 
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="mb-6"
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmationText('');
              }}>Cancel</Button>
              <Button 
                variant="destructive" 
                disabled={deleteConfirmationText !== 'DELETE' || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
