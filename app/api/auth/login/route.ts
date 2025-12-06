import { NextRequest, NextResponse } from 'next/server';
import { login, setSessionCookie } from '@/lib/auth';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    
    const isValid = await login(username, password);
    
    if (isValid) {
      const response = NextResponse.json({ success: true });
      return setSessionCookie(response);
    } else {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}

