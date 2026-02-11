import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, ZoomIn, Image as ImageIcon } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  initialIndex?: number;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showLightbox, setShowLightbox] = useState(false);

  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < images.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, images.length]);

  if (!images || images.length === 0) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

 return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-2xl group flex items-center justify-center">
        <img
          src={images[currentIndex]}
          alt={`Proof ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain cursor-pointer transition-all"
          onClick={() => setShowLightbox(true)}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full shadow-lg text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full shadow-lg text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-full">
          {currentIndex + 1}/{images.length}
        </div>

        <button
          onClick={() => setShowLightbox(true)}
          className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? 'border-blue-500 shadow-lg shadow-blue-500/30'
                  : 'border-slate-700 hover:border-slate-500 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {showLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowLightbox(false)}>
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-10"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all z-10"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}

          <img
            src={images[currentIndex]}
            alt={`Proof ${currentIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;