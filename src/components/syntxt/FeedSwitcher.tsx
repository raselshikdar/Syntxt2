'use client';

import { Globe, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedSwitcherProps {
  activeFeed: 'explore' | 'following';
  onFeedChange: (feed: 'explore' | 'following') => void;
}

export function FeedSwitcher({ activeFeed, onFeedChange }: FeedSwitcherProps) {
  return (
    <div className="w-full mb-3">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-0.5">
          <button
            onClick={() => onFeedChange('explore')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 btn-bounce',
              activeFeed === 'explore'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="w-4 h-4" />
            <span>Explore</span>
          </button>
          <button
            onClick={() => onFeedChange('following')}
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 btn-bounce',
              activeFeed === 'following'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="w-4 h-4" />
            <span>Following</span>
          </button>
        </div>
      </div>
    </div>
  );
}
