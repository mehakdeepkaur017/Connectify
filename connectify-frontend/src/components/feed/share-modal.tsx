import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Post } from '@/lib/api/posts.api';
import { toast } from 'sonner';
import { Link2, Share, Download, QrCode, Mail, MessageCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

interface ShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ post, isOpen, onClose }: ShareModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const url = `${window.location.origin}/post/${post._id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author.username} on Connectify`,
          text: post.caption,
          url: url,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      toast.error('Native sharing not supported');
    }
    onClose();
  };

  const handleDownloadImage = async () => {
    if (post.images.length === 0) return;
    try {
      const response = await fetch(getImageUrl(post.images[0]));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `connectify-${post._id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Image downloaded');
    } catch (e) {
      toast.error('Failed to download image');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card w-full max-w-[500px] rounded-xl overflow-hidden flex flex-col border border-border shadow-xl z-10"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="w-8"></div>
            <h2 className="font-semibold">Share</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
              ✕
            </button>
          </div>
          
          <div className="p-4 flex gap-4 overflow-x-auto snap-x no-scrollbar">
            <button onClick={handleNativeShare} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <Share className="w-6 h-6" />
              </div>
              <span className="text-xs">Share via...</span>
            </button>
            <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <Link2 className="w-6 h-6" />
              </div>
              <span className="text-xs">Copy link</span>
            </button>
            <button onClick={() => {toast.success('Feature coming soon!'); onClose();}} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-xs">Message</span>
            </button>
            <button onClick={handleDownloadImage} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <Download className="w-6 h-6" />
              </div>
              <span className="text-xs">Download</span>
            </button>
            <button onClick={() => {toast.success('QR Code generated'); onClose();}} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-xs">QR code</span>
            </button>
            <button onClick={() => {toast.success('Opening email...'); onClose();}} className="flex flex-col items-center gap-2 min-w-[70px] snap-start">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-xs">Email</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
