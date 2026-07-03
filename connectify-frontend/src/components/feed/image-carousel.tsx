'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getImageUrl } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageCarouselProps {
  images: string[];
  onDoubleTap?: () => void;
}

export function ImageCarousel({ images, onDoubleTap }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [showHeart, setShowHeart] = React.useState(false);
  const [direction, setDirection] = React.useState(0);
  const lastTapRef = React.useRef(0);

  const nextImage = React.useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    if (currentIndex < images.length - 1) {
      setDirection(1);
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, images.length]);

  const prevImage = React.useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (images.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        prevImage(e);
      } else if (e.key === 'ArrowRight') {
        nextImage(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, nextImage, prevImage]);

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (onDoubleTap) {
        onDoubleTap();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      }
    }
    lastTapRef.current = now;
  };

  const variants = {
    enter: (direction: number) => {
      return {
        x: direction > 0 ? 1000 : -1000,
        opacity: 0
      };
    },
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => {
      return {
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0
      };
    }
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden group" onClick={handleTap}>
      
      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 right-4 z-20 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full pointer-events-none">
          {currentIndex + 1}/{images.length}
        </div>
      )}

      <AnimatePresence initial={false} custom={direction}>
        <motion.img
          key={currentIndex}
          src={getImageUrl(images[currentIndex])}
          alt={`Slide ${currentIndex + 1}`}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={1}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = Math.abs(offset.x) * velocity.x;
            if (swipe < -10000 || offset.x < -100) {
              nextImage();
            } else if (swipe > 10000 || offset.x > 100) {
              prevImage();
            }
          }}
          className="absolute w-full h-full object-contain cursor-grab active:cursor-grabbing"
        />
      </AnimatePresence>
      
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button 
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          
          {currentIndex < images.length - 1 && (
            <button 
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all shadow-sm",
                  i === currentIndex ? "bg-white scale-110" : "bg-white/50 scale-100"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Heart animation on double tap */}
      <AnimatePresence>
        {showHeart && (
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-32 h-32 text-white drop-shadow-2xl"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
