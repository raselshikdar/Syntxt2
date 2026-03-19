'use client';

import { Terminal, UserPlus, LogIn, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WelcomePageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onExploreAsGuest: () => void;
}

export function WelcomePage({ onSignIn, onSignUp, onExploreAsGuest }: WelcomePageProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Terminal className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">syntxt_</h1>
        <p className="text-muted-foreground mt-2">Text-only microblogging</p>
      </div>

      {/* Welcome message */}
      <div className="max-w-md text-center mb-8">
        <h2 className="text-xl font-medium mb-3">Welcome to the terminal</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          A minimalist space for thoughts, code, and conversations. 
          No images, no videos — just pure text.
        </p>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-xs space-y-3">
        <Button
          onClick={onSignUp}
          className="w-full btn-bounce flex items-center justify-center gap-2"
          size="lg"
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </Button>
        
        <Button
          onClick={onSignIn}
          variant="outline"
          className="w-full btn-bounce flex items-center justify-center gap-2"
          size="lg"
        >
          <LogIn className="w-4 h-4" />
          Sign In
        </Button>
        
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">or</span>
          </div>
        </div>
        
        <Button
          onClick={onExploreAsGuest}
          variant="ghost"
          className="w-full btn-bounce flex items-center justify-center gap-2"
          size="lg"
        >
          <Compass className="w-4 h-4" />
          Explore as Guest
        </Button>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-8">
        By continuing, you agree to our{' '}
        <button className="text-primary hover:underline">Terms of Service</button>
      </p>
    </div>
  );
}
