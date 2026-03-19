'use client';

import { useState } from 'react';
import { ArrowLeft, Terminal, UserPlus, Mail, CheckCircle, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface SignUpPageProps {
  onBack: () => void;
  onSignUpSuccess: (user: SignUpResult) => void;
}

interface SignUpResult {
  id: string;
  handle: string;
  email?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  banner?: string | null;
  role: string;
  isVerified?: boolean;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export function SignUpPage({ onBack, onSignUpSuccess }: SignUpPageProps) {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<SignUpResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for resend
  useState(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  });

  const handleSignUp = async () => {
    if (!handle.trim()) {
      toast({ title: 'Please enter a username', variant: 'destructive' });
      return;
    }

    if (handle.trim().length < 3) {
      toast({ title: 'Username must be at least 3 characters', variant: 'destructive' });
      return;
    }

    if (!/^[a-z0-9_]+$/.test(handle.trim())) {
      toast({ title: 'Username can only contain lowercase letters, numbers, and underscores', variant: 'destructive' });
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

    if (!password) {
      toast({ title: 'Please enter a password', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'register',
          handle: handle.trim().replace('@', ''),
          displayName: displayName.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        // Show verification screen
        setUserId(data.id);
        setCreatedUser(data);
        setShowVerification(true);
        setResendCooldown(60); // 60 second cooldown
        toast({ title: data.message || 'Account created! Please check your email for the verification code.' });
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

    if (!email) {
      toast({ title: 'Error: Email not found', variant: 'destructive' });
      return;
    }

    setIsVerifying(true);
    try {
      // Use the auth API verify action
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'verify',
          email: email.trim(),
          verificationCode: inputCode.trim(),
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Email verified! Welcome to syntxt_' });
        if (createdUser) {
          onSignUpSuccess({ ...createdUser, isVerified: true });
        } else {
          onSignUpSuccess(data);
        }
      }
    } catch {
      toast({ title: 'Error verifying email', variant: 'destructive' });
    }
    setIsVerifying(false);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    if (!email) {
      toast({ title: 'Error: Email not found', variant: 'destructive' });
      return;
    }

    setIsResending(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'resend-verification',
          email: email.trim(),
        }),
      });
      const data = await res.json();

      if (data.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Verification code sent!', description: 'Check your email inbox' });
        setResendCooldown(60);
      }
    } catch {
      toast({ title: 'Error resending code', variant: 'destructive' });
    }
    setIsResending(false);
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputCode.length === 6) {
                      handleVerify();
                    }
                  }}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={isVerifying || inputCode.length !== 6}
                className="w-full btn-bounce flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Verify Email
                  </>
                )}
              </Button>
            </div>

            {/* Resend */}
            <div className="text-center mt-6">
              <p className="text-xs text-muted-foreground mb-2">
                Did&apos;t receive the code?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendCode}
                disabled={isResending || resendCooldown > 0}
                className="flex items-center gap-2"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Sending...
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Resend in {resendCooldown}s
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
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

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  maxLength={100}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  maxLength={100}
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSignUp();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>

            <Button
              onClick={handleSignUp}
              disabled={isLoading || !handle.trim() || !email.trim() || !password || !confirmPassword}
              className="w-full btn-bounce flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </Button>
          </div>

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            By creating an account, you agree to our{' '}
            <button className="text-primary hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button className="text-primary hover:underline">Privacy Policy</button>
          </p>
        </div>
      </main>
    </div>
  );
}
