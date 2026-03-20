'use client';

import { Suspense } from 'react';
import HomeContent from './HomeContent';

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse text-lg font-medium">Loading syntxt_</div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
