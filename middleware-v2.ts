import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware simplificado y robusto
 * Solo maneja autenticación básica sin causar errores
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Permitir TODAS las rutas de Next.js, estáticas y API sin procesamiento
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }
  
  // Permitir acceso a login siempre
  if (pathname === '/login') {
    return NextResponse.next();
  }
  
  // Para todas las demás rutas, verificar cookie de sesión
  // Si no hay cookie, redirigir a login
  // Si hay cookie, permitir acceso
  const sessionCookie = request.cookies.get('yoga_session');
  const isAuthenticated = sessionCookie?.value === 'authenticated';
  
  if (!isAuthenticated) {
    // Redirigir a login solo si no estamos ya en login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Usuario autenticado, permitir acceso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};






