'use client';

import { useState, useRef } from 'react';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Globe, Copy, Share2, Flag, Trash2 } from 'lucide-react';
import { Post } from './types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { ImageLightbox } from './ImageLightbox';
import { renderTextWithEntities } from '@/lib/linkUtils';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onUserClick: (handle: string) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onRepost: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onReport?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onPostClick?: (postId: string) => void;
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

export function PostCard({ 
  post, 
  currentUserId, 
  onUserClick, 
  onLike, 
  onBookmark, 
  onRepost,
  onDelete,
  onReport,
  onComment,
  onPostClick,
}: PostCardProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isOwnPost = currentUserId === post.author.id;
  const displayName = post.author.displayName || post.author.handle;
  
  // Menu click handler - only opens on explicit click
  const handleMenuButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Toggle menu state
    setIsMenuOpen(prev => !prev);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(post.content);
    toast({ title: 'Copied to clipboard' });
    setIsMenuOpen(false);
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}?post=${post.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copied to clipboard' });
    setIsMenuOpen(false);
  };

  const handleTranslate = async () => {
    if (translatedContent) {
      setTranslatedContent(null);
      setIsMenuOpen(false);
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
      if (data.translation) {
        setTranslatedContent(data.translation);
      }
    } catch {
      toast({ title: 'Translation failed', variant: 'destructive' });
    }
    setIsTranslating(false);
    setIsMenuOpen(false);
  };

  const handleReport = () => {
    if (onReport) {
      onReport(post.id);
    }
    setIsMenuOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(post.id);
    }
    setIsMenuOpen(false);
  };

  const handlePostClick = () => {
    if (onPostClick) {
      onPostClick(post.id);
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onComment) {
      onComment(post.id);
    }
  };

  const handleRepostClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRepost(post.id);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike(post.id);
  };

  const handleBookmarkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBookmark(post.id);
  };

  return (
    <>
      <article 
        className="post-card border border-border rounded-md p-4 bg-card animate-fade-in cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={handlePostClick}
      >
        {/* Repost indicator */}
        {post.isReposted && (
          <div className="flex items-center gap-1.5 text-green-500 text-xs mb-2 -mt-1 ml-6">
            <Repeat2 className="w-3.5 h-3.5" />
            <span>You reposted</span>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUserClick(post.author.handle);
              }}
              className="flex items-center gap-2 group"
            >
              {post.author.avatar ? (
                <img 
                  src={post.author.avatar} 
                  alt={displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-foreground group-hover:underline">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">@{post.author.handle}</span>
              </div>
            </button>
            <span className="text-muted-foreground">·</span>
            <span className="text-sm text-muted-foreground">
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>

          {/* 3-dot menu - strict click area */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                ref={menuButtonRef}
                onClick={handleMenuButtonClick}
                className="p-1 rounded-sm hover:bg-muted transition-colors"
              >
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onCloseAutoFocus={(e) => e.preventDefault()}>
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
              {!isOwnPost && (
                <DropdownMenuItem onClick={handleReport} className="text-destructive">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </DropdownMenuItem>
              )}
              {isOwnPost && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content with hashtags and mentions */}
        <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
          {renderTextWithEntities(translatedContent || post.content, onUserClick)}
          {translatedContent && (
            <div className="mt-2 text-xs text-muted-foreground">— Translated</div>
          )}
        </div>

        {/* Image */}
        {post.imageUrl && (
          <div 
            className="rounded-lg overflow-hidden mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={post.imageUrl}
              alt={post.imageAlt || 'Post image'}
              className="w-full max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setLightboxImage(post.imageUrl!)}
            />
          </div>
        )}

        {/* Link preview */}
        {post.linkUrl && post.linkTitle && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-border rounded-lg overflow-hidden hover:border-foreground transition-colors mb-3"
            onClick={(e) => e.stopPropagation()}
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {/* Like */}
          <button
            onClick={handleLikeClick}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition-all duration-200 btn-bounce px-2 py-1 rounded-md hover:bg-muted',
              post.isLiked 
                ? 'text-red-500' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Heart 
              className={cn('w-4 h-4', post.isLiked && 'fill-current')} 
            />
            <span className={cn(post.likesCount > 0 ? 'opacity-100' : 'opacity-50')}>
              {post.likesCount > 0 ? post.likesCount : ''}
            </span>
          </button>

          {/* Reply */}
          <button
            onClick={handleCommentClick}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 btn-bounce px-2 py-1 rounded-md hover:bg-muted"
          >
            <MessageCircle className="w-4 h-4" />
            <span className={cn(post.repliesCount && post.repliesCount > 0 ? 'opacity-100' : 'opacity-50')}>
              {post.repliesCount && post.repliesCount > 0 ? post.repliesCount : ''}
            </span>
          </button>

          {/* Repost */}
          <button
            onClick={handleRepostClick}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition-all duration-200 btn-bounce px-2 py-1 rounded-md hover:bg-muted',
              post.isReposted 
                ? 'text-green-500' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Repeat2 className="w-4 h-4" />
            <span className={cn(post.repostsCount > 0 ? 'opacity-100' : 'opacity-50')}>
              {post.repostsCount > 0 ? post.repostsCount : ''}
            </span>
          </button>

          {/* Bookmark */}
          <button
            onClick={handleBookmarkClick}
            className={cn(
              'inline-flex items-center gap-1.5 text-sm transition-all duration-200 btn-bounce px-2 py-1 rounded-md hover:bg-muted',
              post.isBookmarked 
                ? 'text-amber-500' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Bookmark 
              className={cn('w-4 h-4', post.isBookmarked && 'fill-current')} 
            />
          </button>
        </div>
      </article>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxImage || ''}
        alt={post.imageAlt || 'Post image'}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
