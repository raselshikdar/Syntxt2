import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        handle: true,
        displayName: true,
        bio: true,
        avatar: true,
        banner: true,
        role: true,
        isBanned: true,
        createdAt: true,
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users: users.map(u => ({
        ...u,
        followersCount: u.followers.length,
        followingCount: u.following.length,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// PATCH - Update user (ban/unban, change role)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, isBanned, role, restrictions } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (isBanned !== undefined) updateData.isBanned = isBanned;
    if (role) updateData.role = role;
    if (restrictions !== undefined) updateData.restrictions = restrictions;

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
