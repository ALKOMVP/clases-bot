import { NextRequest, NextResponse } from 'next/server';

const USERNAME = 'yoga';
const PASSWORD = 'yoga';
const SESSION_COOKIE = 'yoga_session';

export async function login(username: string, password: string): Promise<boolean> {
  return username === USERNAME && password === PASSWORD;
}

export function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get(SESSION_COOKIE);
  return session?.value === 'authenticated';
}

export function setSessionCookie(response: NextResponse): NextResponse {
  // En Cloudflare Pages, siempre usar secure en producción
  // Determinar si estamos en producción basado en la URL o headers
  const isProduction = typeof process === 'undefined' || 
                       (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
  
  response.cookies.set(SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

