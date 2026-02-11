import React, { useCallback, useState } from 'react';
import { Camera, X, Image as ImageIcon, Plus, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageCarousel } from './ImageCarousel.tsx';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ images, onChange, maxImages = 8 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initialPreviewIndex, setInitialPreviewIndex] = useState(0);

  const handleFile = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, maxImages - images.length);
    
    const processFiles = async () => {
      const newImages = [...images];
      for (const file of newFiles) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(base64);
      }
      onChange(newImages);
    };
    
    processFiles();
  }, [images, onChange, maxImages]);

  const removeImage = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updated = [...images];
    updated.splice(index, 1);
    onChange(updated);
  };

  const openPreview = (index: number) => {
    setInitialPreviewIndex(index);
    setPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Photographic Evidence ({images.length} / {maxImages})
        </label>
        {images.length > 0 && (
          <button 
            type="button"
            onClick={() => openPreview(0)}
            className="text-[10px] font-black text-indigo-600 uppercase hover:underline flex items-center gap-1"
          >
            <Maximize2 size={12} /> View Gallery
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
        {images.map((img, idx) => (
          <div 
            key={idx} 
            onClick={() => openPreview(idx)}
            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group shadow-sm cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all"
          >
            <img src={img} alt="preview" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
            
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 size={16} className="text-white drop-shadow-md" />
            </div>

            <button 
              type="button"
              onClick={(e) => removeImage(e, idx)}
              className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20 hover:bg-rose-600 active:scale-90"
            >
              <X size={10} />
            </button>

            <div className="absolute bottom-1 left-1 bg-black/40 backdrop-blur-sm text-white text-[8px] px-1.5 py-0.5 rounded font-black">
              {idx + 1}
            </div>
          </div>
        ))}

        {images.length < maxImages && (
          <label 
            className={`
              aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group
              ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'}
            `}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files); }}
          >
            <Plus size={20} className="text-slate-400 group-hover:text-indigo-500 mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-bold text-slate-400 uppercase group-hover:text-indigo-600">Add Photo</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={(e) => handleFile(e.target.files)} 
            />
          </label>
        )}
      </div>
      
      {images.length === 0 && (
        <div className="flex items-center gap-2 text-slate-400 text-[10px] font-medium bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
          <Camera size={16} className="text-slate-300" />
          <p>Click "Add Photo" or drag images here to document loading for compliance.</p>
        </div>
      )}

      {previewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 md:p-6 shrink-0 border-b border-white/10">
            <h3 className="text-white font-bold flex items-center gap-2">
              <ImageIcon className="text-indigo-400" /> 
              <span>Previewing Assets</span>
              <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-mono ml-2">{images.length} Files</span>
            </h3>
            <button 
              onClick={() => setPreviewOpen(false)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center justify-center"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden p-4 md:p-8">
            <div className="h-full max-w-5xl mx-auto">
              <ImageCarousel images={images} initialIndex={initialPreviewIndex} />
            </div>
          </div>

          <div className="p-4 bg-black/40 text-center">
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
              Review photos carefully before finalizing the log entry
            </p>
          </div>
        </div>
      )}
    </div>
  );
};