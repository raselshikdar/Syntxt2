import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
  registerWithNeonAuth, 
  loginWithNeonAuth, 
  isNeonAuthConfigured 
} from '@/lib/neon-auth';
import { sendVerificationEmail } from '@/lib/email';

// Generate a random 6-digit verification code (for fallback)
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST - Register or Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, handle, email, password, displayName, verificationCode } = body;

    // VERIFY EMAIL ACTION
    if (action === 'verify') {
      if (!email || !verificationCode) {
        return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.isVerified) {
        return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
      }

      if (user.verificationCode !== verificationCode.toUpperCase()) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
      }

      // Update user as verified
      const updatedUser = await db.user.update({
        where: { id: user.id },
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
    }

    // RESEND VERIFICATION ACTION
    if (action === 'resend-verification') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (user.isVerified) {
        return NextResponse.json({ error: 'Email is already verified' }, { status: 400 });
      }

      // Generate new verification code
      const newCode = generateVerificationCode();
      
      await db.user.update({
        where: { id: user.id },
        data: { verificationCode: newCode },
      });

      // Send verification email
      const emailResult = await sendVerificationEmail(
        email.trim().toLowerCase(),
        newCode,
        user.handle
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }

      return NextResponse.json({
        success: true,
        message: 'Verification code sent to your email',
      });
    }

    if (!handle) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const cleanHandle = handle.trim().toLowerCase().replace('@', '');

    // Validate handle format
    if (cleanHandle.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (!/^[a-z0-9_]+$/.test(cleanHandle)) {
      return NextResponse.json({ error: 'Username can only contain lowercase letters, numbers, and underscores' }, { status: 400 });
    }

    // LOGIN
    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      // Try Neon Auth first if configured
      if (isNeonAuthConfigured()) {
        const neonResult = await loginWithNeonAuth({
          email: email || '',
          password,
        });

        if (neonResult.success && neonResult.user) {
          // Find or create local user
          let localUser = await db.user.findUnique({
            where: { email: neonResult.user.email },
          });

          if (!localUser) {
            localUser = await db.user.findUnique({
              where: { handle: cleanHandle },
            });
          }

          if (localUser) {
            const postsCount = await db.post.count({
              where: { authorId: localUser.id },
            });

            const userWithCounts = await db.user.findUnique({
              where: { id: localUser.id },
              include: {
                followers: { select: { followerId: true } },
                following: { select: { followingId: true } },
              },
            });

            return NextResponse.json({
              id: localUser.id,
              handle: localUser.handle,
              email: localUser.email,
              displayName: localUser.displayName,
              bio: localUser.bio,
              avatar: localUser.avatar,
              banner: localUser.banner,
              role: localUser.role,
              isVerified: localUser.isVerified,
              createdAt: localUser.createdAt,
              followersCount: userWithCounts?.followers.length || 0,
              followingCount: userWithCounts?.following.length || 0,
              postsCount,
            });
          }
        }
      }

      // Fallback to local auth
      const user = await db.user.findUnique({
        where: { handle: cleanHandle },
        include: {
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (!user.password) {
        return NextResponse.json({ error: 'Account has no password set. Please reset your password.' }, { status: 400 });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }

      if (user.isBanned) {
        return NextResponse.json({ error: 'This account has been banned' }, { status: 403 });
      }

      const postsCount = await db.post.count({
        where: { authorId: user.id },
      });

      return NextResponse.json({
        id: user.id,
        handle: user.handle,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount,
      });
    }

    // REGISTER
    if (action === 'register') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }

      // Check if handle already exists
      const existingHandle = await db.user.findUnique({
        where: { handle: cleanHandle },
      });

      if (existingHandle) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }

      // Check if email already exists
      const existingEmail = await db.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existingEmail) {
        return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
      }

      // Try Neon Auth first if configured
      if (isNeonAuthConfigured()) {
        const neonResult = await registerWithNeonAuth({
          email: email.trim().toLowerCase(),
          password,
          handle: cleanHandle,
          displayName: displayName?.trim(),
        });

        if (neonResult.success) {
          // Create local user (without password since Neon Auth handles auth)
          const hashedPassword = await bcrypt.hash(password, 12);
          
          const user = await db.user.create({
            data: {
              handle: cleanHandle,
              email: email.trim().toLowerCase(),
              password: hashedPassword,
              displayName: displayName?.trim() || null,
              isVerified: false,
            },
            include: {
              followers: { select: { followerId: true } },
              following: { select: { followingId: true } },
            },
          });

          return NextResponse.json({
            id: user.id,
            handle: user.handle,
            email: user.email,
            displayName: user.displayName,
            bio: user.bio,
            avatar: user.avatar,
            banner: user.banner,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            postsCount: 0,
            needsVerification: true,
            message: 'Verification email sent! Please check your inbox.',
          });
        }

        // If Neon Auth failed with a specific error, return it
        if (neonResult.error) {
          console.log('Neon Auth registration failed, falling back to local auth:', neonResult.error);
        }
      }

      // Fallback: Local registration with email sending
      const hashedPassword = await bcrypt.hash(password, 12);
      const verificationCode = generateVerificationCode();

      // Create user
      const user = await db.user.create({
        data: {
          handle: cleanHandle,
          email: email.trim().toLowerCase(),
          password: hashedPassword,
          displayName: displayName?.trim() || null,
          verificationCode,
          isVerified: false,
        },
        include: {
          followers: { select: { followerId: true } },
          following: { select: { followingId: true } },
        },
      });

      // Send verification email
      const emailResult = await sendVerificationEmail(
        email.trim().toLowerCase(),
        verificationCode,
        cleanHandle
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        // Still return success but log the error
      }

      return NextResponse.json({
        id: user.id,
        handle: user.handle,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        banner: user.banner,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: 0,
        needsVerification: true,
        message: 'Verification code sent to your email',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
