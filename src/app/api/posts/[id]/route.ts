import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get a single post with replies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('[Get Post] Fetching post:', id, 'for user:', userId);

    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
        likes: { select: { userId: true } },
        reposts: { select: { userId: true } },
        replies: {
          include: {
            author: {
              select: { id: true, handle: true, displayName: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!post) {
      console.log('[Get Post] Post not found:', id);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get user's bookmark if userId provided - use findFirst instead of findUnique
    let isBookmarked = false;
    if (userId) {
      try {
        const bookmark = await db.bookmark.findFirst({
          where: {
            userId,
            postId: id,
          },
        });
        isBookmarked = !!bookmark;
      } catch (bookmarkError) {
        console.error('[Get Post] Bookmark error:', bookmarkError);
        // Continue without bookmark status
      }
    }

    // Transform the response
    const transformedPost = {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      imageAlt: post.imageAlt,
      linkUrl: post.linkUrl,
      linkTitle: post.linkTitle,
      linkDesc: post.linkDesc,
      linkImage: post.linkImage,
      createdAt: post.createdAt.toISOString(),
      author: post.author,
      likesCount: post.likes.length,
      isLiked: userId ? post.likes.some(l => l.userId === userId) : false,
      isBookmarked,
      isReposted: userId ? post.reposts.some(r => r.userId === userId) : false,
      repostsCount: post.reposts.length,
      repliesCount: post.replies.length,
      replies: post.replies.map(r => ({
        id: r.id,
        content: r.content,
        postId: r.postId,
        authorId: r.authorId,
        parentReplyId: r.parentReplyId,
        createdAt: r.createdAt.toISOString(),
        author: r.author,
      })),
    };

    console.log('[Get Post] Successfully fetched post:', id);
    return NextResponse.json(transformedPost);
  } catch (error) {
    console.error('[Get Post] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// DELETE - Delete a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
