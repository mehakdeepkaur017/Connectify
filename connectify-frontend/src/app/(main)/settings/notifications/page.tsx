'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth.context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export default function NotificationsPage() {
  const { user, updateUser } = useAuth();
  const [preferences, setPreferences] = React.useState({
    pushNotifications: true,
    emailNotifications: true,
    likeNotifications: true,
    followNotifications: true,
    commentNotifications: true,
    ...(user?.preferences || {})
  });
  
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newPreferences: typeof preferences) => {
      const res = await api.patch('/users/me', { preferences: newPreferences });
      return res.data;
    },
    onSuccess: (data) => {
      updateUser(data.data);
      queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });

  const handleToggle = (key: keyof typeof preferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    mutation.mutate(newPreferences);
  };

  const notificationTypes = [
    { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications on your device.' },
    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive emails about your account.' },
    { key: 'likeNotifications', label: 'Like Notifications', description: 'Get notified when someone likes your post.' },
    { key: 'followNotifications', label: 'Follow Notifications', description: 'Get notified when someone follows you.' },
    { key: 'commentNotifications', label: 'Comment Notifications', description: 'Get notified when someone comments.' }
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="space-y-6">
        {notificationTypes.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{label}</span>
              <span className="text-sm text-muted-foreground">{description}</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={preferences[key as keyof typeof preferences]}
                onChange={() => handleToggle(key as keyof typeof preferences)}
                disabled={mutation.isPending}
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
