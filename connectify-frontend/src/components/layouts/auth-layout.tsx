import * as React from 'react';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { FloatingShapes } from '@/components/ui/floating-shapes';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Logo } from '@/components/shared/logo';
import { GlassCard } from '@/components/ui/glass-card';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export const AuthLayout = ({ children, title, description }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden selection:bg-indigo-500/30">
      <AnimatedBackground />
      <FloatingShapes />
      
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
        <Logo />
        <ThemeToggle />
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
          <GlassCard className="border-t-white/40 dark:border-t-white/20 p-8 sm:p-10">
            <div className="flex flex-col space-y-2 text-center mb-8">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            
            {children}
            
          </GlassCard>
        </div>
      </main>
      
      <footer className="absolute bottom-0 w-full p-6 text-center z-10">
        <p className="text-sm text-muted-foreground/60">
          &copy; {new Date().getFullYear()} Connectify. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
