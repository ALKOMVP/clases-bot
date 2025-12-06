import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

// Edge runtime required for Cloudflare Pages

export async function POST() {
  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}

