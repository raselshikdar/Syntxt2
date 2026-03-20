'use client';

import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, isOpen, onClose }: ImageLightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleZoom}
          className="bg-white/10 hover:bg-white/20 text-white"
        >
          {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 text-white"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Image */}
      <div 
        className={`transition-transform duration-300 ${isZoomed ? 'cursor-zoom-out scale-150' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom();
        }}
      >
        <img
          src={src}
          alt={alt || 'Image'}
          className={`max-h-[90vh] max-w-[90vw] object-contain ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        />
      </div>

      {/* Alt text */}
      {alt && (
        <div className="absolute bottom-4 left-4 right-4 text-center">
          <p className="text-white/80 text-sm bg-black/50 px-4 py-2 rounded-lg inline-block">
            {alt}
          </p>
        </div>
      )}
    </div>
  );
}
