import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export function middleware(request: NextRequest) {
  try {
    console.log('Middleware executing for:', request.nextUrl.pathname);
    
    const authenticated = isAuthenticated(request);
    console.log('Middleware - authenticated:', authenticated);
    
    const isLoginPage = request.nextUrl.pathname === '/login';
    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isNextData = request.nextUrl.pathname.startsWith('/_next/data');
    
    // Permitir acceso a rutas API y _next/data sin autenticación
    if (isApiRoute || isNextData) {
      console.log('Middleware - allowing API/Next data route');
      return NextResponse.next();
    }
    
    // Si no está autenticado y no está en login, redirigir a login
    if (!authenticated && !isLoginPage) {
      console.log('Middleware - redirecting to login');
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    // Si está autenticado y está en login, redirigir a home
    if (authenticated && isLoginPage) {
      console.log('Middleware - redirecting to home');
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    console.log('Middleware - allowing request to continue');
    return NextResponse.next();
  } catch (error: any) {
    console.error('Middleware error:', {
      path: request.nextUrl.pathname,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: String(error)
    });
    // En caso de error, permitir que la request continúe
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

