import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// POST - Verify user email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return NextResponse.json({ error: 'User ID and verification code are required' }, { status: 400 });
    }

    // Find the user
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already verified
    if (user.isVerified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // Check the verification code
    if (user.verificationCode !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    // Mark as verified
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        verificationCode: null,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        handle: updatedUser.handle,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        isVerified: updatedUser.isVerified,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
  }
}
