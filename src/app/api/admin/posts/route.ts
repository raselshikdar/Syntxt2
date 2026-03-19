import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all posts
export async function GET() {
  try {
    const posts = await db.post.findMany({
      include: {
        author: { select: { id: true, handle: true, displayName: true, avatar: true } },
        likes: { select: { userId: true } },
        reposts: { select: { userId: true } },
        replies: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      posts: posts.map(p => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        author: p.author,
        likesCount: p.likes.length,
        repostsCount: p.reposts.length,
        repliesCount: p.replies.length,
      })),
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// DELETE - Delete a post
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await db.post.delete({
      where: { id: postId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
