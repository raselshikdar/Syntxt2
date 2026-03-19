/**
 * Neon Auth Client
 * 
 * This module integrates with Neon Auth for authentication.
 * Neon Auth handles email verification automatically.
 */

// Neon Auth configuration
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || 'https://ep-green-fog-a184zz9k.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth';

interface NeonAuthResponse {
  success?: boolean;
  error?: string;
  message?: string;
  data?: {
    id?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    handle?: string;
    created_at?: string;
  };
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  user?: {
    id: string;
    email: string;
    email_verified: boolean;
    handle?: string;
    displayName?: string;
  };
}

interface RegisterParams {
  email: string;
  password: string;
  handle?: string;
  displayName?: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface VerifyEmailParams {
  email: string;
  code: string;
}

interface ResendVerificationParams {
  email: string;
}

/**
 * Register a new user with Neon Auth
 * Neon Auth will automatically send verification email
 */
export async function registerWithNeonAuth(params: RegisterParams): Promise<NeonAuthResponse> {
  try {
    const response = await fetch(`${NEON_AUTH_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        handle: params.handle,
        displayName: params.displayName,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Registration failed',
      };
    }

    return {
      success: true,
      data: data.data || data.user,
      message: data.message || 'Registration successful. Please check your email for verification.',
    };
  } catch (error) {
    console.error('Neon Auth registration error:', error);
    return {
      success: false,
      error: 'Failed to connect to authentication service',
    };
  }
}

/**
 * Login with Neon Auth
 */
export async function loginWithNeonAuth(params: LoginParams): Promise<NeonAuthResponse> {
  try {
    const response = await fetch(`${NEON_AUTH_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Login failed',
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('Neon Auth login error:', error);
    return {
      success: false,
      error: 'Failed to connect to authentication service',
    };
  }
}

/**
 * Verify email with Neon Auth
 */
export async function verifyEmailWithNeonAuth(params: VerifyEmailParams): Promise<NeonAuthResponse> {
  try {
    const response = await fetch(`${NEON_AUTH_URL}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        code: params.code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Verification failed',
      };
    }

    return {
      success: true,
      user: data.user,
      message: 'Email verified successfully',
    };
  } catch (error) {
    console.error('Neon Auth verification error:', error);
    return {
      success: false,
      error: 'Failed to connect to authentication service',
    };
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(params: ResendVerificationParams): Promise<NeonAuthResponse> {
  try {
    const response = await fetch(`${NEON_AUTH_URL}/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to resend verification',
      };
    }

    return {
      success: true,
      message: 'Verification email sent',
    };
  } catch (error) {
    console.error('Neon Auth resend error:', error);
    return {
      success: false,
      error: 'Failed to connect to authentication service',
    };
  }
}

/**
 * Check if Neon Auth is configured
 */
export function isNeonAuthConfigured(): boolean {
  return !!process.env.NEON_AUTH_URL || NEON_AUTH_URL.includes('neonauth');
}
