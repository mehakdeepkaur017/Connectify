import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Video, Type } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStory } from '@/lib/api/stories.api';
import { toast } from 'sonner';
import { StoryEditor, TextLayer } from './story-editor';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<'image' | 'video' | 'text'>('image');
  const [textLayers, setTextLayers] = React.useState<TextLayer[]>([]);
  const [isEditingLayer, setIsEditingLayer] = React.useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewUrl(null);
      setTextLayers([]);
      setMediaType('image');
      setIsEditingLayer(false);
    }
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      const type = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      setMediaType(type);
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => createStory(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Story created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create story');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && mediaType !== 'text') {
      toast.error('Please add a photo or video');
      return;
    }

    const formData = new FormData();
    if (file) {
      formData.append('media', file);
    }
    formData.append('mediaType', mediaType);
    if (textLayers.length > 0) {
      formData.append('metadata', JSON.stringify({ layers: textLayers }));
    }
    if (mediaType === 'text') {
      if (textLayers.length === 0) {
        toast.error('Please add some text to your story');
        return;
      }
      formData.append('text', textLayers.map(l => l.text).join('\n'));
    }

    createMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-background rounded-xl overflow-hidden shadow-2xl border border-border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Create new story</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-muted transition-colors"
              disabled={createMutation.isPending}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col h-[60vh] max-h-[600px]">
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative bg-muted/30">
              {createMutation.isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="font-medium animate-pulse">Uploading...</p>
                  </div>
                </div>
              )}

              {!previewUrl ? (
                <div className="text-center w-full max-w-sm">
                  <div className="mb-6 flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMediaType('image');
                        fileInputRef.current?.click();
                      }}
                      className="p-4 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMediaType('video');
                        fileInputRef.current?.click();
                      }}
                      className="p-4 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                    >
                      <Video className="w-8 h-8" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaType('text')}
                      className="p-4 rounded-full bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 transition-colors"
                    >
                      <Type className="w-8 h-8" />
                    </button>
                  </div>
                  
                  {mediaType !== 'text' && (
                    <>
                      <h3 className="text-xl font-medium mb-2">Upload Media</h3>
                      <p className="text-muted-foreground mb-6">Select a photo or video to share to your story.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors w-full"
                      >
                        Select from computer
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                      />
                    </>
                  )}
                  
                  {mediaType === 'text' && (
                    <div className="w-full h-full">
                       <button
                        type="button"
                        onClick={() => {
                          setPreviewUrl('text-placeholder'); // Dummy URL to bypass empty state
                        }}
                        className="bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-600 transition-colors w-full"
                      >
                        Start creating
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <StoryEditor 
                    mediaUrl={previewUrl === 'text-placeholder' ? null : previewUrl}
                    mediaType={mediaType}
                    textLayers={textLayers}
                    setTextLayers={setTextLayers}
                    onEditingChange={setIsEditingLayer}
                    onClear={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setTextLayers([]);
                      setIsEditingLayer(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 font-medium hover:bg-muted rounded-lg transition-colors"
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={(!file && mediaType !== 'text') || createMutation.isPending || isEditingLayer}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {createMutation.isPending ? 'Sharing...' : isEditingLayer ? 'Finish typing...' : 'Share to Story'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
