import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCollections, saveToCollection, createCollection, Collection } from '@/lib/api/collections.api';
import { Post } from '@/lib/api/posts.api';
import { Plus, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface CollectionsPopupProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export function CollectionsPopup({ post, isOpen, onClose }: CollectionsPopupProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [newCollectionName, setNewCollectionName] = React.useState('');
  const queryClient = useQueryClient();

  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: getCollections,
    enabled: isOpen,
  });

  const saveMutation = useMutation({
    mutationFn: (collectionId: string) => saveToCollection(collectionId, post._id),
    onSuccess: () => {
      toast.success('Saved to collection');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      onClose();
    }
  });

  const createMutation = useMutation({
    mutationFn: () => createCollection(newCollectionName, post._id),
    onSuccess: () => {
      toast.success('Collection created & post saved');
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setNewCollectionName('');
      setIsCreating(false);
      onClose();
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    createMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute bottom-full right-0 mb-2 w-64 bg-card border border-border shadow-xl rounded-xl overflow-hidden z-50 flex flex-col"
        onMouseEnter={(e) => e.stopPropagation()} // keep it open
      >
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Save to...</h3>
          <button onClick={() => setIsCreating(!isCreating)} className="text-primary hover:text-primary/80">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateSubmit} className="p-3 border-b border-border bg-muted/30">
            <input 
              autoFocus
              type="text" 
              placeholder="Collection name" 
              className="w-full bg-background border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-primary mb-2"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              disabled={createMutation.isPending}
            />
            <button 
              type="submit" 
              disabled={!newCollectionName.trim() || createMutation.isPending}
              className="w-full bg-primary text-primary-foreground rounded py-1.5 text-sm font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </form>
        )}

        <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <LoadingSpinner size="sm" />
            </div>
          ) : collections?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No collections yet.
            </div>
          ) : (
            collections?.map((collection: Collection) => (
              <button 
                key={collection._id}
                onClick={() => saveMutation.mutate(collection._id)}
                disabled={saveMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border border-border overflow-hidden">
                  {collection.coverImage ? (
                    <img src={collection.coverImage} alt={collection.name} className="w-full h-full object-cover" />
                  ) : (
                    <Folder className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-sm font-medium truncate flex-1">{collection.name}</span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
