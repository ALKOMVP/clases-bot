import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('yoga_session');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  
  // Permitir acceso a rutas API sin autenticación (se manejan internamente)
  if (isApiRoute) {
    return NextResponse.next();
  }
  
  // Si no está autenticado y no está en login, redirigir a login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Si está autenticado y está en login, redirigir a home
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

