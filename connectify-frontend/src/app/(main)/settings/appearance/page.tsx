'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop }
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Appearance</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Customize how Connectify looks on your device.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
              theme === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <Icon className={cn("w-8 h-8 mb-4", theme === id ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("font-semibold", theme === id ? "text-primary" : "text-foreground")}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
