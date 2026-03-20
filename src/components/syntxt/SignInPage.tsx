'use client';

import { useState } from 'react';
import { ArrowLeft, Terminal, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface SignInPageProps {
  onBack: () => void;
  onSignInSuccess: () => void;
}

export function SignInPage({ onBack, onSignInSuccess }: SignInPageProps) {
  const [handle, setHandle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!handle.trim()) {
      toast({ title: 'Please enter your handle', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, this would authenticate the user
      // For demo, we just get or create the user
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: handle.trim().replace('@', '') }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Welcome back!' });
        onSignInSuccess();
      }
    } catch (error) {
      toast({ title: 'Error signing in', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="btn-bounce h-8 w-8 mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-lg font-semibold">Sign In</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Terminal className="w-10 h-10 mx-auto text-primary mb-3" />
            <h2 className="text-xl font-semibold">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your syntxt_ account
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="handle">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="your_handle"
                  className="pl-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSignIn();
                    }
                  }}
                />
              </div>
            </div>

            <Button
              onClick={handleSignIn}
              disabled={isLoading || !handle.trim()}
              className="w-full btn-bounce flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo mode: Enter any handle to continue
          </p>
        </div>
      </main>
    </div>
  );
}
