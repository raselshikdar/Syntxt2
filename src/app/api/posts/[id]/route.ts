import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Type for flattened reply (max 2 levels)
interface FlattenedReply {
  id: string;
  content: string;
  imageUrl: string | null;
  postId: string;
  authorId: string;
  parentReplyId: string | null;
  createdAt: string;
  author: {
    id: string;
    handle: string;
    displayName: string | null;
    avatar: string | null;
  };
  likesCount: number;
  isLiked: boolean;
  replies: FlattenedReply[];
  // For replies to other replies, show who it's replying to
  replyToAuthor?: {
    id: string;
    handle: string;
    displayName: string | null;
  };
}

// GET - Get a single post with replies (including nested)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // First, fetch the post without replies
    const post = await db.post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
        likes: { select: { userId: true } },
        reposts: { select: { userId: true } },
        quotePost: {
          select: { content: true },
        },
        parentPost: {
          include: {
            author: {
              select: { id: true, handle: true, displayName: true, avatar: true },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get user's bookmark if userId provided
    let isBookmarked = false;
    if (userId) {
      const bookmark = await db.bookmark.findFirst({
        where: {
          userId,
          postId: id,
        },
      });
      isBookmarked = !!bookmark;
    }

    // Fetch all replies for this post (without likes relation due to Prisma caching issue)
    const allReplies = await db.reply.findMany({
      where: { postId: id },
      include: {
        author: {
          select: { id: true, handle: true, displayName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Fetch reply likes using raw query to avoid Prisma client caching issues
    const replyIds = allReplies.map(r => r.id);
    
    // Use $queryRaw for likes count
    let likeCounts: { replyId: string; count: bigint }[] = [];
    let userLikes: string[] = [];
    
    if (replyIds.length > 0) {
      // Get like counts
      const placeholders = replyIds.map(() => '?').join(',');
      likeCounts = await db.$queryRawUnsafe<{ replyId: string; count: bigint }[]>(
        `SELECT replyId, COUNT(*) as count FROM ReplyLike WHERE replyId IN (${placeholders}) GROUP BY replyId`,
        ...replyIds
      );
      
      // Get user's likes if userId provided
      if (userId) {
        userLikes = await db.$queryRawUnsafe<{ replyId: string }[]>(
          `SELECT replyId FROM ReplyLike WHERE userId = ? AND replyId IN (${placeholders})`,
          userId,
          ...replyIds
        ).then(rows => rows.map(r => r.replyId));
      }
    }

    // Build like count map
    const likeCountMap = new Map<string, number>();
    for (const lc of likeCounts) {
      likeCountMap.set(lc.replyId, Number(lc.count));
    }

    // Build flattened structure (max 2 levels)
    // Level 1: Comments (direct replies to post, parentReplyId is null)
    // Level 2: All replies to comments (flattened, with replyToAuthor for context)
    const replyMap = new Map<string, FlattenedReply>();
    const topLevelReplies: FlattenedReply[] = [];

    // Helper function to find the root comment (first parent with null parentReplyId)
    const findRootCommentId = (replyId: string, visited = new Set<string>()): string | null => {
      const reply = replyMap.get(replyId);
      if (!reply || visited.has(replyId)) return null;
      visited.add(replyId);

      if (!reply.parentReplyId) {
        return replyId; // This is a root comment
      }

      // Keep going up to find root
      return findRootCommentId(reply.parentReplyId, visited);
    };

    // First pass: create all reply objects
    for (const reply of allReplies) {
      replyMap.set(reply.id, {
        id: reply.id,
        content: reply.content,
        imageUrl: reply.imageUrl,
        postId: reply.postId,
        authorId: reply.authorId,
        parentReplyId: reply.parentReplyId,
        createdAt: reply.createdAt.toISOString(),
        author: reply.author,
        likesCount: likeCountMap.get(reply.id) || 0,
        isLiked: userLikes.includes(reply.id),
        replies: [],
        replyToAuthor: undefined,
      });
    }

    // Second pass: build flattened structure
    for (const reply of allReplies) {
      const replyObj = replyMap.get(reply.id);
      if (replyObj) {
        if (!reply.parentReplyId) {
          // This is a top-level comment (Level 1)
          topLevelReplies.push(replyObj);
        } else {
          // This is a reply to another reply
          // Find the root comment and attach there (Level 2)
          const rootId = findRootCommentId(reply.id);
          if (rootId) {
            const rootComment = replyMap.get(rootId);
            if (rootComment && rootComment !== replyObj) {
              // Add replyToAuthor to show who this is replying to
              const parentReply = replyMap.get(reply.parentReplyId);
              if (parentReply && parentReply !== rootComment) {
                // Only add replyToAuthor if replying to someone other than the root comment author
                replyObj.replyToAuthor = {
                  id: parentReply.author.id,
                  handle: parentReply.author.handle,
                  displayName: parentReply.author.displayName,
                };
              }
              rootComment.replies.push(replyObj);
            }
          }
        }
      }
    }

    // Determine if this is a quote post
    const isQuotePost = !!post.quotePost;

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
      repliesCount: allReplies.length,
      replies: topLevelReplies,
      // Quote post info
      isQuotePost,
      quoteContent: post.quotePost?.content,
      quotedPost: post.parentPost ? {
        id: post.parentPost.id,
        content: post.parentPost.content,
        imageUrl: post.parentPost.imageUrl,
        author: post.parentPost.author,
        createdAt: post.parentPost.createdAt.toISOString(),
      } : null,
    };

    return NextResponse.json(transformedPost);
  } catch (error) {
    console.error('Get post error:', error);
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
