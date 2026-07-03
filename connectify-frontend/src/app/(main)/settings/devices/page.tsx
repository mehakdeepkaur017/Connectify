'use client';

import * as React from 'react';
import { MonitorSmartphone, Laptop, Smartphone } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth.context';

export default function DevicesPage() {
  const { logout } = useAuth();
  const [message, setMessage] = React.useState({ text: '', type: '' });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/logout-all');
      return res.data;
    },
    onSuccess: () => {
      setMessage({ text: 'Successfully logged out of all other devices', type: 'success' });
      // Redirect to login after a short delay
      setTimeout(() => logout(), 2000);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } }, message?: string };
      setMessage({ text: err.response?.data?.message || err.message || 'Failed to logout devices', type: 'error' });
    }
  });

  const dummyDevices = [
    { id: 1, name: 'Windows PC • Chrome', location: 'Local Area', isCurrent: true, icon: Laptop, time: 'Active now' },
    { id: 2, name: 'iPhone 13 • Safari', location: 'Unknown Location', isCurrent: false, icon: Smartphone, time: '2 hours ago' },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Devices & Sessions</h1>
      <p className="text-sm text-muted-foreground mb-8">
        These are the devices that have logged into your account.
      </p>

      {message.text && (
        <div className={`p-3 mb-6 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {dummyDevices.map((device) => {
          const Icon = device.icon;
          return (
            <div key={device.id} className="flex items-center justify-between p-4 rounded-xl border border-border">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {device.name}
                    {device.isCurrent && <span className="ml-2 text-xs text-green-500 font-normal border border-green-500 rounded-full px-2 py-0.5">Current</span>}
                  </h3>
                  <p className="text-xs text-muted-foreground">{device.location} • {device.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-border">
        <h2 className="text-lg font-semibold mb-2 text-destructive">Log out of all devices</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This will log you out of all other browsers and devices. You will also be logged out of your current session.
        </p>
        <Button 
          variant="destructive" 
          onClick={() => logoutAllMutation.mutate()}
          disabled={logoutAllMutation.isPending}
        >
          {logoutAllMutation.isPending ? 'Logging out...' : 'Log out of all devices'}
        </Button>
      </div>
    </div>
  );
}
