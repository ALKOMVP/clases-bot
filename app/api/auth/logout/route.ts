import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}

