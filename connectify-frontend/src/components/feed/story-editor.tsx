import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Palette, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TextLayer {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  scale: number;
}

interface StoryEditorProps {
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | 'text';
  textLayers: TextLayer[];
  setTextLayers: React.Dispatch<React.SetStateAction<TextLayer[]>>;
  onClear: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

const COLORS = ['#FFFFFF', '#000000', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55'];

export function StoryEditor({ mediaUrl, mediaType, textLayers, setTextLayers, onClear, onEditingChange }: StoryEditorProps) {
  const [editingLayerId, setEditingLayerId] = React.useState<string | null>(null);
  const [inputText, setInputText] = React.useState('');
  const [inputColor, setInputColor] = React.useState(COLORS[0]);
  const [inputScale, setInputScale] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    onEditingChange?.(!!editingLayerId);
  }, [editingLayerId, onEditingChange]);

  const handleAddText = () => {
    const newId = Date.now().toString();
    setEditingLayerId(newId);
    setInputText('');
    setInputColor(COLORS[0]);
    setInputScale(1);
  };

  const handleSaveText = () => {
    if (!inputText.trim()) {
      setEditingLayerId(null);
      return;
    }
    
    setTextLayers(prev => {
      const exists = prev.find(l => l.id === editingLayerId);
      if (exists) {
        return prev.map(l => l.id === editingLayerId ? { ...l, text: inputText, color: inputColor, scale: inputScale } : l);
      } else {
        return [...prev, {
          id: editingLayerId!,
          text: inputText,
          color: inputColor,
          x: 0,
          y: 0,
          scale: inputScale
        }];
      }
    });
    setEditingLayerId(null);
  };

  const handleDeleteLayer = (id: string) => {
    setTextLayers(prev => prev.filter(l => l.id !== id));
  };

  const handleDragEnd = (id: string, info: any) => {
    setTextLayers(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          x: l.x + info.offset.x,
          y: l.y + info.offset.y
        };
      }
      return l;
    }));
  };

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden flex items-center justify-center bg-black group" ref={containerRef}>
      {mediaType === 'image' && mediaUrl ? (
        <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain pointer-events-none" />
      ) : mediaType === 'video' && mediaUrl ? (
        <video src={mediaUrl} className="w-full h-full object-contain pointer-events-none" autoPlay muted loop playsInline />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500" />
      )}
      
      {/* Draggable Layers */}
      {!editingLayerId && textLayers.map(layer => (
        <motion.div
          key={layer.id}
          drag
          dragConstraints={containerRef}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={(e, info) => handleDragEnd(layer.id, info)}
          initial={{ x: layer.x, y: layer.y, scale: layer.scale }}
          animate={{ x: layer.x, y: layer.y, scale: layer.scale }}
          onClick={() => {
            setEditingLayerId(layer.id);
            setInputText(layer.text);
            setInputColor(layer.color);
            setInputScale(layer.scale);
          }}
          className="absolute cursor-move px-4 py-2 text-center whitespace-pre-wrap break-words"
          style={{ color: layer.color, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
        >
          <span className="text-3xl font-bold font-sans select-none">{layer.text}</span>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteLayer(layer.id);
            }}
            className="absolute -top-3 -right-3 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </motion.div>
      ))}

      {/* Editing Overlay */}
      <AnimatePresence>
        {editingLayerId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm"
            onClick={handleSaveText}
          >
            <div className="absolute top-4 flex w-full justify-between px-4" onClick={e => e.stopPropagation()}>
              <div className="flex gap-2">
                {COLORS.map(color => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setInputColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      inputColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveText}
                className="font-bold text-white px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                Done
              </button>
            </div>
            
            <textarea
              autoFocus
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-[90%] bg-transparent text-center font-bold resize-none focus:outline-none placeholder:text-white/50"
              style={{ color: inputColor, fontSize: `${inputScale * 2.25}rem`, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
              placeholder="Type something..."
              rows={4}
              onClick={e => e.stopPropagation()}
            />

            <div 
              className="absolute left-4 top-1/2 -translate-y-1/2 h-[50%] flex flex-col items-center justify-center gap-2"
              onClick={e => e.stopPropagation()}
            >
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={inputScale}
                onChange={(e) => setInputScale(parseFloat(e.target.value))}
                className="w-2 h-full appearance-none bg-white/30 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white cursor-pointer"
                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Tools */}
      {!editingLayerId && (
        <div className="absolute top-4 right-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAddText}
            className="p-2.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm shadow-xl"
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onClear}
            className="p-2.5 bg-black/40 text-white rounded-full hover:bg-black/60 transition-colors backdrop-blur-sm shadow-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
