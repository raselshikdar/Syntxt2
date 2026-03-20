import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Repost a post (direct or quote)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, userId, isQuote, quoteContent } = body;

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    // Check if the post exists
    const originalPost = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
      },
    });

    if (!originalPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Handle quote post
    if (isQuote) {
      if (!quoteContent || quoteContent.trim().length === 0) {
        return NextResponse.json({ error: 'Quote content is required' }, { status: 400 });
      }

      // Create a new post that quotes the original
      const newPost = await db.post.create({
        data: {
          content: quoteContent.trim(),
          authorId: userId,
          parentPostId: postId,
        },
        include: {
          author: {
            select: { id: true, handle: true, displayName: true, avatar: true },
          },
        },
      });

      // Create the quote post reference
      await db.quotePost.create({
        data: {
          postId: newPost.id,
          content: quoteContent.trim(),
          authorId: userId,
        },
      });

      return NextResponse.json({
        success: true,
        isQuote: true,
        post: {
          id: newPost.id,
          content: newPost.content,
          createdAt: newPost.createdAt,
          author: newPost.author,
          likesCount: 0,
          isLiked: false,
          isBookmarked: false,
          isReposted: false,
          repostsCount: 0,
          repliesCount: 0,
          isQuotePost: true,
          quoteContent: quoteContent.trim(),
          quotedPost: {
            id: originalPost.id,
            content: originalPost.content,
            author: originalPost.author,
          },
        },
      });
    }

    // Handle direct repost
    // Check if already reposted
    const existing = await db.repost.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already reposted' }, { status: 400 });
    }

    await db.repost.create({
      data: { postId, userId },
    });

    // Get updated count
    const count = await db.repost.count({ where: { postId } });

    return NextResponse.json({ success: true, isReposted: true, repostsCount: count });
  } catch (error) {
    console.error('Repost error:', error);
    return NextResponse.json({ error: 'Failed to repost' }, { status: 500 });
  }
}

// DELETE - Remove repost
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const userId = searchParams.get('userId');

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Both postId and userId are required' }, { status: 400 });
    }

    await db.repost.delete({
      where: {
        postId_userId: { postId, userId },
      },
    });

    // Get updated count
    const count = await db.repost.count({ where: { postId } });

    return NextResponse.json({ success: true, isReposted: false, repostsCount: count });
  } catch (error) {
    console.error('Remove repost error:', error);
    return NextResponse.json({ error: 'Failed to remove repost' }, { status: 500 });
  }
}
