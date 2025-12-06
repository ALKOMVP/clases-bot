import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  try {
    console.log('[MIDDLEWARE] Starting for path:', pathname);
    console.log('[MIDDLEWARE] Request URL:', request.url);
    console.log('[MIDDLEWARE] Request method:', request.method);
    
    // Permitir acceso a rutas estáticas y de Next.js sin procesamiento
    if (
      pathname.startsWith('/_next/static') ||
      pathname.startsWith('/_next/image') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.startsWith('/api/auth/login') ||
      pathname.startsWith('/api/auth/logout')
    ) {
      console.log('[MIDDLEWARE] Allowing static/auth route:', pathname);
      return NextResponse.next();
    }
    
    let authenticated = false;
    try {
      authenticated = isAuthenticated(request);
      console.log('[MIDDLEWARE] Authentication check result:', authenticated);
    } catch (authError: any) {
      console.error('[MIDDLEWARE] Error checking authentication:', {
        message: authError?.message,
        stack: authError?.stack,
        error: String(authError)
      });
      // Si hay error en auth, tratar como no autenticado
      authenticated = false;
    }
    
    const isLoginPage = pathname === '/login';
    const isApiRoute = pathname.startsWith('/api');
    const isNextData = pathname.startsWith('/_next/data');
    
    // Permitir acceso a rutas API y _next/data sin autenticación
    if (isApiRoute || isNextData) {
      console.log('[MIDDLEWARE] Allowing API/Next data route:', pathname);
      return NextResponse.next();
    }
    
    // Si no está autenticado y no está en login, redirigir a login
    if (!authenticated && !isLoginPage) {
      console.log('[MIDDLEWARE] Not authenticated, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
    
    // Si está autenticado y está en login, redirigir a home
    if (authenticated && isLoginPage) {
      console.log('[MIDDLEWARE] Authenticated on login page, redirecting to home');
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
    
    console.log('[MIDDLEWARE] Allowing request to continue:', pathname);
    return NextResponse.next();
  } catch (error: any) {
    console.error('[MIDDLEWARE] CRITICAL ERROR:', {
      path: pathname,
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: String(error),
      url: request.url,
      method: request.method
    });
    
    // En caso de error crítico, intentar permitir que la request continúe
    // pero loguear el error para debugging
    try {
      return NextResponse.next();
    } catch (fallbackError: any) {
      console.error('[MIDDLEWARE] Fallback also failed:', fallbackError);
      // Último recurso: devolver respuesta de error
      return new NextResponse(
        JSON.stringify({ 
          error: 'Middleware error',
          path: pathname,
          message: error?.message 
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

