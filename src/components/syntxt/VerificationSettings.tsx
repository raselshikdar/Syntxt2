'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, Loader2, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { User } from './types';
import { cn } from '@/lib/utils';
import { convertImage, validateImageFile, formatFileSize, supportsAvif } from '@/lib/imageUtils';

interface VerificationSettingsProps {
  currentUser: User | null;
  onBack: () => void;
}

type VerificationStatus = 'none' | 'pending' | 'in_review' | 'approved' | 'rejected';

interface VerificationRequest {
  id: string;
  documentType: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  description?: string;
  status: VerificationStatus;
  reviewerNotes?: string;
  submittedAt: string;
}

export function VerificationSettings({ currentUser, onBack }: VerificationSettingsProps) {
  const [documentType, setDocumentType] = useState<string>('national_id');
  const [documentFront, setDocumentFront] = useState<string>('');
  const [documentBack, setDocumentBack] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<VerificationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  // Check if user already has a verification request
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const fetchRequest = async () => {
      try {
        const res = await fetch(`/api/verification?userId=${currentUser.id}`);
        if (res.ok) {
          const data = await res.json();
          setExistingRequest(data.request);
        }
      } catch (error) {
        console.error('Fetch verification error:', error);
      }
      setIsLoading(false);
    };
    
    fetchRequest();
  }, [currentUser?.id]);

  // Admin and moderator are auto-verified
  const isAdminOrMod = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';

  const handleImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'front' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({ title: validation.error, variant: 'destructive' });
      return;
    }

    setIsConverting(true);
    try {
      const result = await convertImage(file, { maxSizeKB: 100, maxWidth: 800, maxHeight: 800 });
      if (target === 'front') {
        setDocumentFront(result.dataUrl);
      } else {
        setDocumentBack(result.dataUrl);
      }
      toast({
        title: 'Image ready',
        description: `Converted to ${result.format.toUpperCase()} (${formatFileSize(result.convertedSize)})`,
      });
    } catch (error) {
      console.error('Image conversion error:', error);
      toast({ title: 'Failed to process image', variant: 'destructive' });
    }
    setIsConverting(false);
  };

  const handleSubmit = async () => {
    if (!currentUser?.id || !documentFront) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          documentType,
          documentFrontUrl: documentFront,
          documentBackUrl: documentBack || undefined,
          description: description.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: 'Verification request submitted!' });
        setExistingRequest(data.request);
      } else {
        toast({ title: data.error || 'Failed to submit request', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Submit verification error:', error);
      toast({ title: 'Failed to submit request', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  // Admin/Moderator - auto verified
  if (isAdminOrMod) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <Shield className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">
              Verified Account
            </p>
            <p className="text-sm text-green-600/70 dark:text-green-400/70">
              Your account is automatically verified as a {currentUser?.role.toLowerCase()}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Already approved
  if (currentUser?.isVerified) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <p className="font-medium text-green-600 dark:text-green-400">
              Verification Approved
            </p>
            <p className="text-sm text-green-600/70 dark:text-green-400/70">
              Your account has been verified. You now have a verification badge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Existing request
  if (existingRequest) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        title: 'Request Pending',
        desc: 'Your verification request is being reviewed.',
      },
      in_review: {
        icon: Clock,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20',
        title: 'Under Review',
        desc: 'An admin is currently reviewing your request.',
      },
      approved: {
        icon: CheckCircle,
        color: 'text-green-500',
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        title: 'Approved',
        desc: 'Your account has been verified!',
      },
      rejected: {
        icon: AlertCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        title: 'Request Rejected',
        desc: existingRequest.reviewerNotes || 'Your request was not approved.',
      },
      none: {
        icon: Clock,
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        border: 'border-border',
        title: '',
        desc: '',
      },
    };

    const config = statusConfig[existingRequest.status];
    const StatusIcon = config.icon;

    return (
      <div className="space-y-4">
        <div className={cn(
          'flex items-start gap-3 p-4 rounded-lg border',
          config.bg,
          config.border
        )}>
          <StatusIcon className={cn('w-6 h-6 mt-0.5', config.color)} />
          <div className="flex-1">
            <p className={cn('font-medium', config.color)}>
              {config.title}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {config.desc}
            </p>
            {existingRequest.status === 'rejected' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExistingRequest(null);
                  setDocumentFront('');
                  setDocumentBack('');
                  setDescription('');
                }}
                className="mt-3"
              >
                Submit New Request
              </Button>
            )}
          </div>
        </div>

        <div className="border border-border rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Request Details</h4>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Document Type:</span>
              <span className="capitalize">{existingRequest.documentType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted:</span>
              <span>{new Date(existingRequest.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New request form
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Submit your identification documents to apply for a verification badge.
        Your documents will be reviewed by our team.
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <Label>Document Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: 'national_id', label: 'National ID Card' },
            { value: 'passport', label: 'Passport' },
            { value: 'drivers_license', label: 'Driver\'s License' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setDocumentType(option.value)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                documentType === option.value
                  ? 'border-foreground bg-muted'
                  : 'border-border hover:border-foreground/50'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-full border-2 transition-colors',
                documentType === option.value
                  ? 'border-foreground bg-foreground'
                  : 'border-muted-foreground'
              )} />
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Document Front */}
      <div className="space-y-2">
        <Label>Document Front</Label>
        {documentFront ? (
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img src={documentFront} alt="Document front" className="w-full max-h-48 object-cover" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDocumentFront('')}
              className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => frontInputRef.current?.click()}
            disabled={isConverting}
            className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-foreground transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
          >
            {isConverting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6" />
                <span className="text-sm">Upload front side</span>
              </>
            )}
          </button>
        )}
        <input
          ref={frontInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleImageSelect(e, 'front')}
          className="hidden"
        />
      </div>

      {/* Document Back (optional for some documents) */}
      {documentType !== 'passport' && (
        <div className="space-y-2">
          <Label>Document Back (Optional)</Label>
          {documentBack ? (
            <div className="relative rounded-lg overflow-hidden border border-border">
              <img src={documentBack} alt="Document back" className="w-full max-h-48 object-cover" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDocumentBack('')}
                className="absolute top-2 right-2 h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => backInputRef.current?.click()}
              disabled={isConverting}
              className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-foreground transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
            >
              {isConverting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Upload back side</span>
                </>
              )}
            </button>
          )}
          <input
            ref={backInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, 'back')}
            className="hidden"
          />
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Additional Notes (Optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Any additional information you'd like to share..."
          rows={3}
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground text-right">
          {description.length}/500
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {supportsAvif() ? 'AVIF' : 'WebP'} • max 100KB per image
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !documentFront}
        className="w-full"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Verification Request'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your documents will be kept confidential and used only for verification purposes.
      </p>
    </div>
  );
}
