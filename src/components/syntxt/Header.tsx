'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  currentUserHandle?: string;
  onUserClick: () => void;
}

export function Header({ currentUserHandle, onUserClick }: HeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <header className="w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="text-lg font-bold tracking-tight">syntxt_</span>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* User handle */}
          {currentUserHandle && (
            <button
              onClick={onUserClick}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors btn-bounce px-2 py-1 rounded-md hover:bg-muted"
            >
              @{currentUserHandle}
            </button>
          )}

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="btn-bounce h-8 w-8"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
