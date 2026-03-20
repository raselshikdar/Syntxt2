'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Heart, Repeat2, Bookmark, MoreHorizontal, Globe, Copy, Share2, Flag, Trash2, Image as ImageIcon, Loader2, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Post, Reply } from './types';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImageLightbox } from './ImageLightbox';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';
import { renderTextWithEntities } from '@/lib/linkUtils';

interface PostDetailsPageProps {
  postId: string;
  currentUserId?: string;
  onBack: () => void;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
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

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to organize replies into nested structure
function organizeReplies(replies: Reply[]): (Reply & { nestedReplies?: Reply[] })[] {
  const replyMap = new Map<string, Reply & { nestedReplies?: Reply[] }>();
  const rootReplies: (Reply & { nestedReplies?: Reply[] })[] = [];
  
  // First pass: create map of all replies
  replies.forEach(reply => {
    replyMap.set(reply.id, { ...reply, nestedReplies: [] });
  });
  
  // Second pass: organize into hierarchy
  replies.forEach(reply => {
    const replyWithNested = replyMap.get(reply.id)!;
    const parentReplyId = (reply as Reply & { parentReplyId?: string | null }).parentReplyId;
    
    if (parentReplyId && replyMap.has(parentReplyId)) {
      const parent = replyMap.get(parentReplyId)!;
      parent.nestedReplies = parent.nestedReplies || [];
      parent.nestedReplies.push(replyWithNested);
    } else {
      rootReplies.push(replyWithNested);
    }
  });
  
  return rootReplies;
}

export function PostDetailsPage({
  postId,
  currentUserId,
  onBack,
  onUserClick,
  onLike,
  onBookmark,
  onRepost,
}: PostDetailsPageProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch post and replies
  useEffect(() => {
    const fetchPost = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/posts/${postId}?userId=${currentUserId || ''}`);
        
        if (!res.ok) {
          console.error('Fetch post failed:', res.status);
          setPost(null);
          setReplies([]);
          return;
        }
        
        const data = await res.json();
        
        // Ensure post has required fields
        if (!data || !data.author) {
          console.error('Invalid post data:', data);
          setPost(null);
          setReplies([]);
          return;
        }
        
        setPost(data);
        setReplies(data.replies || []);
      } catch (error) {
        console.error('Fetch post error:', error);
        setPost(null);
        setReplies([]);
      }
      setIsLoading(false);
    }

    fetchPost();
  }, [postId, currentUserId]);

  // Image handling
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
      setReplyImage(result.dataUrl);
      setReplyImagePreview(result.dataUrl);
      toast({
        title: 'Image ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConverting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = () => {
    setReplyImage(null);
    setReplyImagePreview(null);
  };

  // Submit reply
  const handleSubmitReply = async () => {
    if (!post || !currentUserId || (!replyContent.trim() && !replyImage)) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          authorId: currentUserId,
          imageUrl: replyImage,
          parentReplyId: replyingTo?.id || null,
        }),
      });
      const newReply = await res.json();
      setReplies(prev => [...prev, newReply]);
      setReplyContent('');
      setReplyImage(null);
      setReplyImagePreview(null);
      setReplyingTo(null);
      toast({ title: 'Reply posted!' });
    } catch (error) {
      console.error('Reply error:', error);
      toast({ title: 'Failed to post reply', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  // Translation
  const handleTranslate = async () => {
    if (!post) return;
    if (translatedContent) {
      setTranslatedContent(null);
      return;
    }

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, content: post.content }),
      });
      const data = await res.json();
      if (data.translation) setTranslatedContent(data.translation);
    } catch {
      toast({ title: 'Translation failed', variant: 'destructive' });
    }
    setIsTranslating(false);
    setIsMenuOpen(false);
  };

  // Other actions
  const handleCopyText = () => {
    if (post) {
      navigator.clipboard.writeText(post.content);
      toast({ title: 'Copied to clipboard' });
    }
    setIsMenuOpen(false);
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}?view=post&postId=${postId}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (!post) return;
    try {
      await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      toast({ title: 'Post deleted' });
      onBack();
    } catch {
      toast({ title: 'Error deleting post', variant: 'destructive' });
    }
    setIsMenuOpen(false);
  };

  // Handle like with optimistic update
  const handleLocalLike = async () => {
    if (!post || !currentUserId) return;
    
    const wasLiked = post.isLiked;
    const newLikesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
    
    // Optimistic update
    setPost(prev => prev ? { ...prev, isLiked: !wasLiked, likesCount: newLikesCount } : null);
    
    // Call parent handler
    onLike(post.id);
    
    try {
      if (wasLiked) {
        const res = await fetch(`/api/like?postId=${post.id}&userId=${currentUserId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        setPost(prev => prev ? { ...prev, likesCount: data.likesCount } : null);
      } else {
        const res = await fetch('/api/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, userId: currentUserId }),
        });
        const data = await res.json();
        setPost(prev => prev ? { ...prev, likesCount: data.likesCount } : null);
      }
    } catch (error) {
      console.error('Like error:', error);
      setPost(prev => prev ? { ...prev, isLiked: wasLiked, likesCount: post.likesCount } : null);
    }
  };

  // Handle bookmark with optimistic update
  const handleLocalBookmark = async () => {
    if (!post || !currentUserId) return;
    
    const wasBookmarked = post.isBookmarked;
    
    // Optimistic update
    setPost(prev => prev ? { ...prev, isBookmarked: !wasBookmarked } : null);
    toast({ title: wasBookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks' });
    
    // Call parent handler
    onBookmark(post.id);
    
    try {
      if (wasBookmarked) {
        await fetch(`/api/bookmark?postId=${post.id}&userId=${currentUserId}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/bookmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId: post.id, userId: currentUserId }),
        });
      }
    } catch (error) {
      console.error('Bookmark error:', error);
      setPost(prev => prev ? { ...prev, isBookmarked: wasBookmarked } : null);
      toast({ title: 'Error updating bookmark', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Post not found
      </div>
    );
  }

  const author = post.author;
  const displayName = author?.displayName || author?.handle || 'Unknown';
  const isOwnPost = currentUserId === author?.id;
  const charLimit = 300;
  const remaining = charLimit - replyContent.length;

  // Organize replies into nested structure
  const organizedReplies = organizeReplies(replies);

  // Render a single reply with optional nested replies
  const renderReply = (reply: Reply & { nestedReplies?: Reply[] }, depth = 0) => {
    const replyDisplayName = reply.author.displayName || reply.author.handle;
    return (
      <div key={reply.id} className={depth > 0 ? 'ml-8 mt-2' : ''}>
        <div className="flex gap-3 p-3 border border-border rounded-lg">
          <button
            onClick={() => onUserClick(reply.author.handle)}
            className="shrink-0"
          >
            {reply.author.avatar ? (
              <img 
                src={reply.author.avatar} 
                alt={replyDisplayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {replyDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => onUserClick(reply.author.handle)}
                className="font-medium text-sm hover:underline"
              >
                {replyDisplayName}
              </button>
              <span className="text-xs text-muted-foreground">@{reply.author.handle}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(reply.createdAt)}
              </span>
            </div>
            <p className="text-sm">{reply.content}</p>
            {/* Reply button */}
            <button
              onClick={() => {
                setReplyingTo(reply);
                setReplyContent(`@${reply.author.handle} `);
              }}
              className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              <span>Reply</span>
            </button>
          </div>
        </div>
        {/* Nested replies */}
        {reply.nestedReplies && reply.nestedReplies.length > 0 && (
          <div className="space-y-2 mt-2">
            {reply.nestedReplies.map(nestedReply => renderReply(nestedReply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-4">
      {/* Header with same height as global header */}
      <div className="flex items-center gap-2 -mx-4 px-4 h-14 border-b border-border sticky top-0 bg-background z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="btn-bounce h-8 w-8"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-lg font-semibold">Post</h1>
      </div>

      {/* Main Post */}
      <article className="border-b border-border pb-4 mb-4">
        {/* Author info - horizontal alignment */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => author?.handle && onUserClick(author.handle)}
            className="flex items-center gap-3 group"
          >
            {author?.avatar ? (
              <img 
                src={author.avatar} 
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col items-start justify-center">
              <span className="text-base font-medium text-foreground group-hover:underline">
                {displayName}
              </span>
              <span className="text-sm text-muted-foreground">@{author?.handle || 'unknown'}</span>
            </div>
          </button>

          {/* 3-dot menu */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 btn-bounce"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(true);
                }}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleTranslate} disabled={isTranslating}>
                <Globe className="w-4 h-4 mr-2" />
                {translatedContent ? 'Show original' : isTranslating ? 'Translating...' : 'Translate'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyText}>
                <Copy className="w-4 h-4 mr-2" />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShareLink}>
                <Share2 className="w-4 h-4 mr-2" />
                Share link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isOwnPost && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete post
                </DropdownMenuItem>
              )}
              {!isOwnPost && (
                <DropdownMenuItem className="text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="text-lg leading-relaxed whitespace-pre-wrap break-words mb-4">
          {renderTextWithEntities(translatedContent || post.content, onUserClick)}
          {translatedContent && (
            <div className="mt-2 text-sm text-muted-foreground">— Translated</div>
          )}
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div 
            className="rounded-lg overflow-hidden mb-4 cursor-pointer"
            onClick={() => setLightboxImage(post.imageUrl!)}
          >
            <img
              src={post.imageUrl}
              alt={post.imageAlt || 'Post image'}
              className="w-full max-h-[400px] object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        )}

        {/* Link preview */}
        {post.linkUrl && post.linkTitle && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-border rounded-lg overflow-hidden hover:border-foreground transition-colors mb-4"
          >
            {post.linkImage && (
              <img 
                src={post.linkImage} 
                alt={post.linkTitle}
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-1">{post.linkTitle}</p>
              {post.linkDesc && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.linkDesc}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new URL(post.linkUrl).hostname}
              </p>
            </div>
          </a>
        )}

        {/* Timestamp */}
        <div className="text-sm text-muted-foreground mb-4">
          {formatFullDate(post.createdAt)}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 py-3 border-y border-border text-sm">
          <div>
            <span className="font-bold">{post.repostsCount || 0}</span>
            <span className="text-muted-foreground ml-1">Reposts</span>
          </div>
          <div>
            <span className="font-bold">{post.likesCount || 0}</span>
            <span className="text-muted-foreground ml-1">Likes</span>
          </div>
          <div>
            <span className="font-bold">{replies.length}</span>
            <span className="text-muted-foreground ml-1">Replies</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-around py-3 border-b border-border">
          <button
            onClick={handleLocalLike}
            className={cn(
              'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
              post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
            )}
          >
            <Heart className={cn('w-5 h-5', post.isLiked && 'fill-current')} />
          </button>
          <button
            onClick={() => onRepost(post.id)}
            className={cn(
              'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
              post.isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'
            )}
          >
            <Repeat2 className="w-5 h-5" />
          </button>
          <button
            onClick={handleLocalBookmark}
            className={cn(
              'flex items-center gap-1.5 p-2 rounded-full transition-colors btn-bounce',
              post.isBookmarked ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'
            )}
          >
            <Bookmark className={cn('w-5 h-5', post.isBookmarked && 'fill-current')} />
          </button>
        </div>
      </article>

      {/* Reply composer */}
      {currentUserId && (
        <div className="border-b border-border pb-4 mb-4">
          {/* Replying to indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between bg-muted/50 px-3 py-2 rounded-t-lg mb-2">
              <span className="text-xs text-muted-foreground">
                Replying to @{replyingTo.author.handle}
              </span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyContent('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.author.handle}...` : "Post your reply..."}
                className="min-h-[80px] resize-none"
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
                    disabled={isConverting || !!replyImage}
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

              {replyImagePreview && (
                <div className="relative mt-3 rounded-lg overflow-hidden border border-border">
                  <img
                    src={replyImagePreview}
                    alt="Preview"
                    className="w-full max-h-32 object-cover"
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
            onClick={handleSubmitReply}
            disabled={isSubmitting || (!replyContent.trim() && !replyImage) || replyContent.length > charLimit}
            className="w-full mt-3 btn-bounce"
          >
            {isSubmitting ? 'Posting...' : 'Reply'}
          </Button>
        </div>
      )}

      {/* Replies list */}
      {organizedReplies.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground">Replies</h3>
          {organizedReplies.map(reply => renderReply(reply))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No replies yet. Be the first to reply!
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
