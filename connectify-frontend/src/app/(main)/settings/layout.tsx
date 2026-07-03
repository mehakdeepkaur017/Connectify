'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/shared/route-guards';
import { AppLayout } from '@/components/layouts/app-layout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Lock, Shield, Bell, Smartphone, Monitor, UserX, Ban, VolumeX, HelpCircle, Info, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';

const navItems = [
  { href: '/settings/edit-profile', label: 'Edit Profile', icon: User },
  { href: '/settings/account', label: 'Account', icon: Lock },
  { href: '/settings/privacy', label: 'Privacy', icon: Shield },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/security', label: 'Security', icon: Lock },
  { href: '/settings/appearance', label: 'Appearance', icon: Monitor },
  { href: '/settings/blocked', label: 'Blocked Users', icon: UserX },
  { href: '/settings/restricted', label: 'Restricted Users', icon: Ban },
  { href: '/settings/muted', label: 'Muted Users', icon: VolumeX },
  { href: '/settings/help', label: 'Help', icon: HelpCircle },
  { href: '/settings/about', label: 'About', icon: Info },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="w-full h-[calc(100vh-64px)] md:h-screen flex bg-background max-w-5xl mx-auto md:py-8">
          <div className="w-full h-full flex rounded-none md:rounded-xl border-x-0 md:border md:border-border overflow-hidden bg-background">
            
            {/* Sidebar */}
            <div className="hidden md:flex w-[280px] shrink-0 border-r border-border h-full overflow-y-auto no-scrollbar flex-col">
              <div className="p-6">
                <h2 className="text-2xl font-bold">Settings</h2>
              </div>
              <nav className="flex flex-col pb-6">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-6 py-3 transition-colors",
                        isActive ? "bg-muted font-bold" : "hover:bg-muted/50 font-medium"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
                <button 
                  onClick={() => logout()}
                  className="flex items-center gap-3 px-6 py-3 hover:bg-muted/50 transition-colors border-l-2 border-transparent font-medium text-red-500 mt-2"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full overflow-y-auto bg-background">
              {children}
            </div>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
