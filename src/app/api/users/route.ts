import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// GET user by handle or id, or search users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get('handle');
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const currentUserId = searchParams.get('currentUserId');

    // Search users
    if (search) {
      const users = await db.user.findMany({
        where: {
          OR: [
            { handle: { contains: search } },
            { displayName: { contains: search } },
          ],
        },
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
        take: 10,
      });

      return NextResponse.json(users.map(u => ({
        ...u,
        followersCount: u.followers.length,
        followingCount: u.following.length,
        isFollowing: currentUserId ? u.followers.some(f => f.followerId === currentUserId) : false,
      })));
    }

    let user;

    if (id) {
      user = await db.user.findUnique({
        where: { id },
        include: {
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
        },
      });
    } else if (handle) {
      user = await db.user.findUnique({
        where: { handle },
        include: {
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
        },
      });
    } else {
      // Get all users (for suggestions)
      const users = await db.user.findMany({
        select: {
          id: true,
          handle: true,
          displayName: true,
          bio: true,
          avatar: true,
          banner: true,
          role: true,
          createdAt: true,
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
        },
        take: 20,
      });

      return NextResponse.json(users.map(u => ({
        ...u,
        followersCount: u.followers.length,
        followingCount: u.following.length,
        isFollowing: currentUserId ? u.followers.some(f => f.followerId === currentUserId) : false,
      })));
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get posts count
    const postsCount = await db.post.count({
      where: { authorId: user.id },
    });

    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatar: user.avatar,
      banner: user.banner,
      role: user.role,
      createdAt: user.createdAt,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postsCount,
      isFollowing: currentUserId ? user.followers.some(f => f.followerId === currentUserId) : false,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// Generate a random 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST - Create a new user (or get existing by handle)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handle, displayName, bio, avatar, banner, email } = body;

    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Check if user exists
    let user = await db.user.findUnique({
      where: { handle },
      include: {
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    });

    // If user exists, return it (no verification needed for existing users)
    if (user) {
      const postsCount = await db.post.count({
        where: { authorId: user.id },
      });

      return NextResponse.json({
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        createdAt: user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount,
      });
    }

    // Generate verification code for new users
    const verificationCode = generateVerificationCode();

    // Create new user
    user = await db.user.create({
      data: { 
        handle, 
        displayName, 
        bio, 
        avatar, 
        banner,
        email: email || null,
        verificationCode,
        isVerified: false,
      },
      include: {
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    });

    const postsCount = await db.post.count({
      where: { authorId: user.id },
    });

    // Return user with verification code (for demo purposes)
    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatar: user.avatar,
      banner: user.banner,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postsCount,
      verificationCode, // For demo: show the code on screen
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, displayName, bio, avatar, banner } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data: { displayName, bio, avatar, banner },
      include: {
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
      },
    });

    const postsCount = await db.post.count({
      where: { authorId: user.id },
    });

    return NextResponse.json({
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatar: user.avatar,
      banner: user.banner,
      role: user.role,
      createdAt: user.createdAt,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      postsCount,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
