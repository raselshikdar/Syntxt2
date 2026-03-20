import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET saved posts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const bookmarks = await db.bookmark.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, handle: true, displayName: true, avatar: true },
            },
            likes: { select: { userId: true } },
            reposts: { select: { userId: true } },
            replies: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const posts = bookmarks
      .filter(b => b.post && !b.post.isDeleted)
      .map(b => ({
        id: b.post.id,
        content: b.post.content,
        createdAt: b.post.createdAt,
        author: b.post.author,
        likesCount: b.post.likes.length,
        isLiked: b.post.likes.some(l => l.userId === userId),
        isBookmarked: true,
        isReposted: b.post.reposts.some(r => r.userId === userId),
        repostsCount: b.post.reposts.length,
        repliesCount: b.post.replies.length,
      }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    return NextResponse.json({ error: 'Failed to fetch bookmarks' }, { status: 500 });
  }
}

// POST - Bookmark a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId } = body;

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    // Check if already bookmarked
    const existing = await db.bookmark.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already bookmarked' }, { status: 400 });
    }

    await db.bookmark.create({
      data: { postId, userId },
    });

    return NextResponse.json({ success: true, isBookmarked: true });
  } catch (error) {
    console.error('Bookmark error:', error);
    return NextResponse.json({ error: 'Failed to bookmark post' }, { status: 500 });
  }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const userId = searchParams.get('userId');

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    await db.bookmark.delete({
      where: {
        postId_userId: { postId, userId },
      },
    });

    return NextResponse.json({ success: true, isBookmarked: false });
  } catch (error) {
    console.error('Unbookmark error:', error);
    return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
  }
}
