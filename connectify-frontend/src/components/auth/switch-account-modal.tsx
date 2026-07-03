import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth.context';
import { getImageUrl } from '@/lib/utils';
import { X, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { ArrowLeft } from 'lucide-react';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ViewState = 'list' | 'login' | 'signup';

export function SwitchAccountModal({ isOpen, onClose }: SwitchAccountModalProps) {
  const { user, switchAccount } = useAuth();
  
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [view, setView] = React.useState<ViewState>('list');

  React.useEffect(() => {
    if (isOpen) {
      setView('list');
      try {
        const stored = localStorage.getItem('connectify_sessions');
        if (stored) {
          setSessions(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-border flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-border relative">
            {view !== 'list' && (
              <button onClick={() => setView('list')} className="absolute left-4 p-1 hover:bg-muted rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold mx-auto">
              {view === 'list' ? 'Switch accounts' : view === 'login' ? 'Log in' : 'Create account'}
            </h2>
            <button onClick={onClose} className="absolute right-4 p-1 hover:bg-muted rounded-full transition-colors">
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[80vh] no-scrollbar">
            {view === 'list' && (
              <>
                <div className="flex flex-col -mx-4 pb-2">
                  {sessions.map((session) => {
                    const isActive = session.user.username === user?.username;
                    return (
                      <button
                        key={session.user.username}
                        onClick={() => {
                          if (!isActive) {
                            switchAccount(session.accessToken, session.refreshToken, session.user);
                          } else {
                            onClose();
                          }
                        }}
                        className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={getImageUrl(session.user.avatar) || undefined} 
                            alt={session.user.username}
                            className="w-12 h-12 rounded-full object-cover border border-border"
                          />
                          <span className="font-semibold text-sm">{session.user.username}</span>
                        </div>
                        {isActive && <CheckCircle2 className="w-6 h-6 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                
                <div className="pt-2 border-t border-border -mx-4">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10 rounded-none px-6 py-6"
                    onClick={() => setView('login')}
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Log into an existing account
                  </Button>
                </div>
              </>
            )}

            {view === 'login' && (
              <div className="py-2">
                <LoginForm 
                  onSuccess={onClose} 
                  onSwitchToSignup={() => setView('signup')} 
                />
              </div>
            )}

            {view === 'signup' && (
              <div className="py-2">
                <SignupForm 
                  onSuccess={onClose} 
                  onSwitchToLogin={() => setView('login')} 
                />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
