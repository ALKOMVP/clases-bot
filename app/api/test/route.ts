import { NextResponse } from 'next/server';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// Versión ultra-simple: devolver texto plano
export async function GET() {
  return new NextResponse('API works!', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

