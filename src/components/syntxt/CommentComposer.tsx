'use client';

import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Post } from './types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';

interface CommentComposerProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  currentUserId?: string;
  onComment: (postId: string, content: string, imageUrl?: string) => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CommentComposer({
  isOpen,
  onClose,
  post,
  currentUserId,
  onComment,
}: CommentComposerProps) {
  const [content, setContent] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertImage(file, { maxSizeKB: 50 });
      setImageData(result.dataUrl);
      setImagePreview(result.dataUrl);
      
      toast({
        title: 'Image ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConverting(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImageData(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!post || !currentUserId || (!content.trim() && !imageData)) return;
    
    setIsSubmitting(true);
    try {
      await onComment(post.id, content.trim(), imageData || undefined);
      toast({ title: 'Reply posted!' });
      setContent('');
      setImageData(null);
      setImagePreview(null);
      onClose();
    } catch (error) {
      console.error('Comment error:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setContent('');
    setImageData(null);
    setImagePreview(null);
    onClose();
  };

  if (!post) return null;

  const displayName = post.author.displayName || post.author.handle;
  const charLimit = 300;
  const remaining = charLimit - content.length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border p-0 gap-0" showCloseButton={false}>
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Reply</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 btn-bounce">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4">
          {/* Original post preview */}
          <div className="border border-border rounded-lg p-3 bg-muted/30 mb-4">
            <div className="flex items-center gap-2 mb-2">
              {post.author.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={displayName}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">@{post.author.handle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(post.createdAt)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
          </div>

          {/* Reply composer */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Post your reply..."
                className="min-h-[100px] resize-none"
                maxLength={charLimit}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
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
                    disabled={isConverting || !!imageData}
                    className="h-8 w-8 btn-bounce"
                  >
                    {isConverting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {supportsAvif() ? 'AVIF' : 'WebP'} • max 50KB
                  </span>
                </div>
                <span className={cn(
                  "text-xs",
                  remaining < 20 && remaining >= 0 && "text-amber-500",
                  remaining < 0 && "text-destructive"
                )}>
                  {remaining}
                </span>
              </div>

              {/* Image preview */}
              {imagePreview && (
                <div className="relative mt-3 rounded-lg overflow-hidden border border-border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full max-h-48 object-cover"
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
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || (!content.trim() && !imageData) || content.length > charLimit}
            className="w-full mt-4 btn-bounce"
          >
            {isSubmitting ? 'Posting...' : 'Reply'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
