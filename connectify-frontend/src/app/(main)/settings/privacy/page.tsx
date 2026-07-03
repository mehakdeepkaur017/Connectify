'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth.context';
import { updateMe } from '@/lib/api/users.api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Lock, Unlock } from 'lucide-react';

export default function PrivacySettingsPage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  
  // Since user type doesn't have isPrivate yet, we treat undefined as false
  const [isPrivate, setIsPrivate] = React.useState(!!(user as { isPrivate?: boolean })?.isPrivate);

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateMe(data),
    onSuccess: (data) => {
      updateUser(data as unknown as Parameters<typeof updateUser>[0]);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Privacy settings updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update privacy');
      setIsPrivate(!(user as { isPrivate?: boolean })?.isPrivate); // Revert
    }
  });

  const handleToggle = (checked: boolean) => {
    setIsPrivate(checked);
    const data = new FormData();
    data.append('isPrivate', checked.toString());
    mutation.mutate(data);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8">Account Privacy</h1>

      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background rounded-full border border-border">
            {isPrivate ? <Lock className="w-6 h-6 text-foreground" /> : <Unlock className="w-6 h-6 text-foreground" />}
          </div>
          <div>
            <h3 className="font-semibold text-lg">Private Account</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              When your account is public, your profile and posts can be seen by anyone, on or off Instagram, even if they don&apos;t have an Instagram account.
            </p>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              When your account is private, only the followers you approve can see what you share, including your photos or videos on hashtag and location pages, and your followers and following lists.
            </p>
          </div>
        </div>
        
        {/* Simple Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isPrivate}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={mutation.isPending}
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>
    </div>
  );
}
