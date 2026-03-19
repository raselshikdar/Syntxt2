import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Verify user email with code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({ error: 'User ID and verification code are required' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
    }

    if (user.verificationCode !== code.toUpperCase()) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Update user as verified
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationCode: null,
      },
      include: {
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    });

    const postsCount = await db.post.count({
      where: { authorId: updatedUser.id },
    });

    return NextResponse.json({
      id: updatedUser.id,
      handle: updatedUser.handle,
      email: updatedUser.email,
      displayName: updatedUser.displayName,
      bio: updatedUser.bio,
      avatar: updatedUser.avatar,
      banner: updatedUser.banner,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
      followersCount: updatedUser.followers.length,
      followingCount: updatedUser.following.length,
      postsCount,
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
