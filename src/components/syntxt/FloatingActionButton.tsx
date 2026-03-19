'use client';

import { PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-20 right-6 h-14 w-14 rounded-full shadow-lg btn-bounce bg-foreground text-background hover:bg-foreground/90 z-40"
    >
      <PenLine className="w-5 h-5" />
      <span className="sr-only">Compose new post</span>
    </Button>
  );
}
