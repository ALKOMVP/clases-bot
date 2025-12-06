import { NextRequest, NextResponse } from 'next/server';
import { login, setSessionCookie } from '@/lib/auth';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  console.log('[LOGIN] POST /api/auth/login - Starting');
  
  try {
    const body = await request.json();
    const { username, password } = body;
    
    console.log('[LOGIN] Received credentials:', { username: username ? '***' : 'missing' });
    
    const isValid = await login(username, password);
    console.log('[LOGIN] Validation result:', isValid);
    
    if (isValid) {
      console.log('[LOGIN] Credentials valid, setting session cookie');
      const response = NextResponse.json({ success: true });
      const responseWithCookie = setSessionCookie(response);
      console.log('[LOGIN] Session cookie set, returning success');
      return responseWithCookie;
    } else {
      console.log('[LOGIN] Invalid credentials');
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('[LOGIN] ERROR:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: String(error)
    });
    return NextResponse.json(
      { 
        error: 'Error en el servidor',
        details: error?.message 
      },
      { status: 500 }
    );
  }
}

