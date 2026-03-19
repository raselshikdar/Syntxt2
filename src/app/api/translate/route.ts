import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Translate text (mock translation for demo)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if translation exists
    if (postId) {
      const existing = await db.translation.findFirst({
        where: { postId, language: 'en' },
      });
      if (existing) {
        return NextResponse.json({ translation: existing.content });
      }
    }

    // Mock translation - in real app, use translation API
    // For demo, we'll just add a prefix
    const translation = `[Translated] ${content}`;

    // Save translation
    if (postId) {
      await db.translation.create({
        data: { postId, language: 'en', content: translation },
      });
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
