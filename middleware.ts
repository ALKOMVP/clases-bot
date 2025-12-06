import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// MIDDLEWARE COMPLETAMENTE DESHABILITADO PARA TESTING MÍNIMO
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

