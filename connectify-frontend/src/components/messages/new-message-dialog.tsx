import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { DMSearch } from './dm-search';

interface NewMessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  isPending?: boolean;
}

export function NewMessageDialog({ isOpen, onClose, onSelectUser, isPending }: NewMessageDialogProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-background border border-border w-full max-w-md rounded-xl overflow-hidden shadow-2xl flex flex-col h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-3 px-4">
            <div className="w-6" /> {/* Placeholder for balance */}
            <h2 className="font-semibold text-lg">New Message</h2>
            <button onClick={onClose} className="hover:opacity-70 transition-opacity">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 border-b border-border flex items-center gap-3">
            <span className="font-medium">To:</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {isPending ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DMSearch onSelectUser={(id) => {
                if (id) {
                  onSelectUser(id);
                }
              }} />
            )}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
