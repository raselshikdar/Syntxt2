import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Like a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId } = body;

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    // Check if already liked
    const existing = await db.like.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already liked' }, { status: 400 });
    }

    await db.like.create({
      data: { postId, userId },
    });

    // Get updated count
    const count = await db.like.count({ where: { postId } });

    return NextResponse.json({ success: true, isLiked: true, likesCount: count });
  } catch (error) {
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
  }
}

// DELETE - Unlike a post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const userId = searchParams.get('userId');

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    await db.like.delete({
      where: {
        postId_userId: { postId, userId },
      },
    });

    // Get updated count
    const count = await db.like.count({ where: { postId } });

    return NextResponse.json({ success: true, isLiked: false, likesCount: count });
  } catch (error) {
    console.error('Unlike error:', error);
    return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
  }
}
