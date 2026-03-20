import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET followers or following list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'followers' or 'following'

    if (!userId || !type) {
      return NextResponse.json({ error: 'User ID and type are required' }, { status: 400 });
    }

    let users;

    if (type === 'followers') {
      const follows = await db.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              bio: true,
              avatar: true,
              banner: true,
              createdAt: true,
              followers: { select: { followerId: true } },
              following: { select: { followingId: true } },
            },
          },
        },
      });
      users = follows.map(f => ({
        ...f.follower,
        followersCount: f.follower.followers.length,
        followingCount: f.follower.following.length,
      }));
    } else {
      const follows = await db.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              bio: true,
              avatar: true,
              banner: true,
              createdAt: true,
              followers: { select: { followerId: true } },
              following: { select: { followingId: true } },
            },
          },
        },
      });
      users = follows.map(f => ({
        ...f.following,
        followersCount: f.following.followers.length,
        followingCount: f.following.following.length,
      }));
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get follows error:', error);
    return NextResponse.json({ error: 'Failed to fetch follows' }, { status: 500 });
  }
}

// POST - Follow a user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { followerId, followingId } = body;

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'Both followerId and followingId are required' }, { status: 400 });
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const existing = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already following' }, { status: 400 });
    }

    await db.follow.create({
      data: { followerId, followingId },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: followingId,
        type: 'follow',
        title: 'New follower',
        content: `Someone started following you`,
        relatedId: followerId,
      },
    });

    return NextResponse.json({ success: true, isFollowing: true });
  } catch (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ error: 'Failed to follow user' }, { status: 500 });
  }
}

// DELETE - Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const followerId = searchParams.get('followerId');
    const followingId = searchParams.get('followingId');

    if (!followerId || !followingId) {
      return NextResponse.json({ error: 'Both followerId and followingId are required' }, { status: 400 });
    }

    await db.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    return NextResponse.json({ success: true, isFollowing: false });
  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json({ error: 'Failed to unfollow user' }, { status: 500 });
  }
}
