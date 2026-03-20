'use client';

import { useState, useRef, useCallback } from 'react';
import { X, PenLine, Image as ImageIcon, Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { validateImageFile, convertAndUploadToCloudinary } from '@/lib/imageUtils';
import { extractUrls, fetchLinkPreview } from '@/lib/linkUtils';
import { LinkPreview } from './types';
import { toast } from '@/hooks/use-toast';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (content: string, imageUrl?: string, linkPreview?: LinkPreview) => void;
  isPublishing: boolean;
}

const MAX_CHARS = 300;

export function ComposeModal({ isOpen, onClose, onPublish, isPublishing }: ComposeModalProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const charCount = content.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isTooShort = charCount === 0;

  // Reset all state
  const resetState = useCallback(() => {
    setContent('');
    setImageUrl(null);
    setImagePreview(null);
    setLinkPreview(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Extract and fetch link preview when content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Extract URLs and fetch preview
    const urls = extractUrls(newContent);
    if (urls.length > 0) {
      debounceRef.current = setTimeout(async () => {
        setIsLoadingPreview(true);
        const preview = await fetchLinkPreview(urls[0]);
        if (preview) {
          setLinkPreview(preview);
        }
        setIsLoadingPreview(false);
      }, 500);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      // Upload to Cloudinary
      const result = await convertAndUploadToCloudinary(file, { maxSizeKB: 50 });
      setImageUrl(result.url);
      setImagePreview(result.dataUrl);
      toast({ title: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({ title: 'Failed to upload image', variant: 'destructive' });
    }
    setIsUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
  };

  const removeLinkPreview = () => {
    setLinkPreview(null);
  };

  const handlePublish = () => {
    if (!isOverLimit && !isTooShort) {
      onPublish(content, imageUrl || undefined, linkPreview || undefined);
      resetState();
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <PenLine className="w-4 h-4" />
              Compose
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 btn-bounce"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-4">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="What's on your mind? Use #hashtags and @mentions..."
            className="min-h-[150px] resize-none border-0 focus-visible:ring-0 bg-transparent text-sm p-0 placeholder:text-muted-foreground"
            autoFocus
          />
          
          {/* Image preview */}
          {imagePreview && (
            <div className="relative mt-3 rounded-lg overflow-hidden border border-border">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-64 object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={removeImage}
                className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white btn-bounce"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Link preview */}
          {linkPreview && (
            <div className="relative mt-3 rounded-lg overflow-hidden border border-border bg-muted/30">
              <div className="flex gap-3 p-3">
                {linkPreview.image && (
                  <img
                    src={linkPreview.image}
                    alt={linkPreview.title}
                    className="w-16 h-16 object-cover rounded shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{linkPreview.title}</p>
                  {linkPreview.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{linkPreview.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new URL(linkPreview.url).hostname}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeLinkPreview}
                  className="h-6 w-6 shrink-0 btn-bounce"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Image upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !!imageUrl}
              className="h-8 w-8 btn-bounce"
              title="Upload image"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </Button>
            
            {/* Loading link preview indicator */}
            {isLoadingPreview && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            
            {/* Upload status */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {linkPreview && <Link2 className="w-3 h-3" />}
              <span>{isUploading ? 'Uploading...' : imageUrl ? 'Image attached' : 'Cloudinary'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-sm",
              isOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'
            )}>
              {charCount}/{MAX_CHARS}
            </span>
            
            <Button
              onClick={handlePublish}
              disabled={isOverLimit || isTooShort || isPublishing || isUploading}
              className="btn-bounce px-6"
            >
              {isPublishing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Publishing...
                </span>
              ) : (
                'Publish'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
