import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export function middleware(request: NextRequest) {
  try {
    const authenticated = isAuthenticated(request);
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    
    // Permitir acceso a rutas API sin autenticación (se manejan internamente)
    if (isApiRoute) {
      return NextResponse.next();
    }
    
    // Si no está autenticado y no está en login, redirigir a login
    if (!authenticated && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Si está autenticado y está en login, redirigir a home
    if (authenticated && isLoginPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    return NextResponse.next();
  } catch (error: any) {
    console.error('Middleware error:', {
      path: request.nextUrl.pathname,
      message: error?.message,
      stack: error?.stack,
      error: String(error)
    });
    // En caso de error, permitir que la request continúe
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

