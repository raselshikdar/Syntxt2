import { NextRequest, NextResponse } from 'next/server';

// Neon Auth API URL - Better Auth compatible
const NEON_AUTH_URL = process.env.NEON_AUTH_URL || 
  'https://ep-green-fog-a184zz9k.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth';

// Base URL for our app
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    console.log('[Auth API] POST request:', action);

    // Map our actions to Better Auth endpoints
    let endpoint = '';
    let requestBody: Record<string, unknown> = {};

    switch (action) {
      case 'sign-up':
      case 'sign-up/email':
        endpoint = 'sign-up/email';
        requestBody = {
          email: params.email,
          password: params.password,
          name: params.name || params.email?.split('@')[0],
          callbackURL: `${BASE_URL}/auth/callback`,
        };
        break;
      
      case 'sign-in':
      case 'sign-in/email':
        endpoint = 'sign-in/email';
        requestBody = {
          email: params.email,
          password: params.password,
          callbackURL: `${BASE_URL}/auth/callback`,
        };
        break;
      
      case 'verify-email':
        endpoint = 'verify-email';
        requestBody = {
          token: params.token || params.code,
          callbackURL: `${BASE_URL}/auth/callback`,
        };
        break;
      
      case 'send-verification-email':
        endpoint = 'send-verification-email';
        requestBody = {
          email: params.email,
          callbackURL: `${BASE_URL}/auth/verify`,
        };
        break;
      
      case 'sign-out':
        endpoint = 'sign-out';
        requestBody = {};
        break;
      
      default:
        // Pass through any other action
        endpoint = action;
        requestBody = params;
    }

    // Forward request to Neon Auth with proper headers
    const response = await fetch(`${NEON_AUTH_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        'Cookie': request.headers.get('cookie') || '',
      },
      body: JSON.stringify(requestBody),
      redirect: 'manual',
    });

    // Get response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: response.status, message: text };
      }
    }

    console.log('[Auth API] Response status:', response.status);

    // Extract set-cookie headers from Neon Auth response
    const setCookieHeaders = response.headers.getSetCookie();
    
    // Create our response
    const nextResponse = NextResponse.json(
      response.ok ? data : { error: data.error || data.message || 'Authentication failed' },
      { status: response.ok ? 200 : response.status }
    );

    // Forward cookies from Neon Auth to client
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('[Auth API] Error:', error);
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'session';

    console.log('[Auth API] GET request:', action);

    // Forward request to Neon Auth with cookies
    const response = await fetch(`${NEON_AUTH_URL}/${action}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': BASE_URL,
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    const data = await response.json();
    console.log('[Auth API] GET response:', response.status);

    // Extract set-cookie headers
    const setCookieHeaders = response.headers.getSetCookie();
    
    const nextResponse = NextResponse.json(
      response.ok ? data : { error: data.error || data.message || 'Request failed' },
      { status: response.ok ? 200 : response.status }
    );

    // Forward cookies
    setCookieHeaders.forEach(cookie => {
      nextResponse.headers.append('Set-Cookie', cookie);
    });

    return nextResponse;
  } catch (error) {
    console.error('[Auth API] GET Error:', error);
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }
}
