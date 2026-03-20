'use client';

import { useState } from 'react';
import { ArrowLeft, Terminal, UserPlus, Mail, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface SignUpPageProps {
  onBack: () => void;
  onSignUpSuccess: () => void;
}

export function SignUpPage({ onBack, onSignUpSuccess }: SignUpPageProps) {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSignUp = async () => {
    if (!handle.trim()) {
      toast({ title: 'Please enter a username', variant: 'destructive' });
      return;
    }

    if (handle.trim().length < 3) {
      toast({ title: 'Username must be at least 3 characters', variant: 'destructive' });
      return;
    }

    if (!email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          handle: handle.trim().replace('@', ''),
          displayName: displayName.trim() || undefined,
          email: email.trim(),
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        // Show verification screen
        setUserId(data.id);
        setVerificationCode(data.verificationCode || 'DEMO');
        setShowVerification(true);
        toast({ title: 'Account created! Please verify your email.' });
      }
    } catch {
      toast({ title: 'Error creating account', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleVerify = async () => {
    if (!inputCode.trim()) {
      toast({ title: 'Please enter the verification code', variant: 'destructive' });
      return;
    }

    if (!userId) {
      toast({ title: 'Error: User ID not found', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/users/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId,
          code: inputCode.trim(),
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Email verified! Welcome to syntxt_' });
        onSignUpSuccess();
      }
    } catch {
      toast({ title: 'Error verifying email', variant: 'destructive' });
    }
    setIsVerifying(false);
  };

  // Verification screen
  if (showVerification) {
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
            <h1 className="text-lg font-semibold">Verify Email</h1>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            {/* Icon */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Check your email</h2>
              <p className="text-muted-foreground text-sm mt-2">
                We sent a verification code to<br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            {/* Demo notice */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-medium text-foreground">Demo Mode:</span><br />
                Your verification code is: <br />
                <code className="bg-muted px-2 py-1 rounded text-lg font-mono font-bold text-primary">
                  {verificationCode}
                </code>
              </p>
            </div>

            {/* Verification form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={isVerifying || inputCode.length !== 6}
                className="w-full btn-bounce flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isVerifying ? 'Verifying...' : 'Verify Email'}
              </Button>
            </div>

            {/* Resend */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              Did&apos;t receive the code?{' '}
              <button className="text-primary hover:underline">
                Resend email
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Sign up form
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
          <h1 className="text-lg font-semibold">Create Account</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <Terminal className="w-10 h-10 mx-auto text-primary mb-3" />
            <h2 className="text-xl font-semibold">Join syntxt_</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Create your account to start sharing
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="handle">Username *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_handle"
                  className="pl-8"
                  maxLength={20}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {handle.length}/20 characters, lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={50}
              />
            </div>

            <Button
              onClick={handleSignUp}
              disabled={isLoading || !handle.trim() || !email.trim()}
              className="w-full btn-bounce flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Demo mode: Pick a username and email to create a demo account
          </p>
        </div>
      </main>
    </div>
  );
}
