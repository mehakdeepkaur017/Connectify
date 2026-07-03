'use client';

import * as React from 'react';
import { X, UploadCloud, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  maxFiles?: number;
}

export function ImageUploader({ images, onImagesChange, maxFiles = 10 }: ImageUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...images, ...newFiles];
      
      if (totalFiles.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} images.`);
        return;
      }
      
      onImagesChange(totalFiles);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((file, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${index}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {images.length < maxFiles && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <UploadCloud className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {images.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-40 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Click to select images</p>
          <p className="text-xs text-muted-foreground mt-1">Up to {maxFiles} images (JPG, PNG, WEBP)</p>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg, image/png, image/webp"
        multiple
        className="hidden"
      />
    </div>
  );
}
