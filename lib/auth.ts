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
  response.cookies.set(SESSION_COOKIE, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

