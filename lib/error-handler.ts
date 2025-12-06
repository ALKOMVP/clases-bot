import { NextResponse } from 'next/server';

/**
 * Detecta si estamos en Cloudflare Pages
 * Verifica múltiples indicadores para detectar correctamente el entorno
 */
export function isCloudflareEnvironment(): boolean {
  // 1. Verificar si el contexto de Cloudflare está disponible (método más confiable)
  try {
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env) {
      return true;
    }
  } catch (e) {
    // Si hay error accediendo al contexto, continuar con otros métodos
  }
  
  // 2. Verificar variables de entorno específicas de Cloudflare (más confiable)
  if (typeof process !== 'undefined') {
    // Estas variables solo existen en Cloudflare Pages/Workers
    if (process.env.DEPLOYMENT_ID || 
        process.env.CF_PAGES_URL || 
        process.env.CF_PAGES || 
        process.env.CF_PAGES_BRANCH ||
        process.env.CF_PAGES_COMMIT_SHA) {
      return true;
    }
    
    // 3. Verificar si estamos explícitamente en desarrollo local
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NEXTJS_ENV === 'development';
    
    // 4. Si estamos en producción (NODE_ENV === 'production') y NO es desarrollo,
    // asumir que es Cloudflare (más seguro que asumir 'local' cuando no podemos determinarlo)
    // Esto es importante porque en producción de Cloudflare, puede que no tengamos
    // acceso al contexto de Cloudflare en el momento de la detección
    if (process.env.NODE_ENV === 'production' && !isDevelopment) {
      return true;
    }
    
    // 5. Si tenemos process.env.DB y estamos en producción, probablemente es Cloudflare
    // (en desarrollo local con 'npm run dev', normalmente no hay DB en process.env)
    if ((process.env as any).DB && process.env.NODE_ENV === 'production') {
      return true;
    }
  }
  
  // 6. Fallback: verificar propiedades globales de Cloudflare
  // Cloudflare Workers/Pages tienen caches API disponible en el servidor
  if (typeof globalThis !== 'undefined' && typeof window === 'undefined') {
    if ((globalThis as any).caches && typeof (globalThis as any).caches.open === 'function') {
      // Si estamos en el servidor (no hay window) y tenemos caches, probablemente es Cloudflare
      return true;
    }
  }
  
  return false;
}

/**
 * Obtiene información del entorno para logging
 */
export function getEnvironmentInfo() {
  const isCloudflare = isCloudflareEnvironment();
  // En Cloudflare, NODE_ENV puede no estar definido o ser 'production'
  // Si estamos en Cloudflare, asumimos producción a menos que haya una variable específica
  const isDevelopment = isCloudflare 
    ? false // En Cloudflare, siempre es producción
    : (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');
  
  return {
    environment: isCloudflare ? 'cloudflare' : 'local',
    isCloudflare,
    isDevelopment,
    nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : (isCloudflare ? 'production' : 'unknown')
  };
}

/**
 * Crea una respuesta de error personalizada con información detallada
 */
export function createErrorResponse(
  error: any,
  defaultMessage: string,
  context?: {
    route?: string;
    method?: string;
    operation?: string;
  }
): NextResponse {
  const envInfo = getEnvironmentInfo();
  const errorMessage = error?.message || String(error);
  const errorName = error?.name || 'UnknownError';
  
  // Log detallado del error
  console.error('=== ERROR DETAILS ===', {
    environment: envInfo.environment,
    route: context?.route || 'unknown',
    method: context?.method || 'unknown',
    operation: context?.operation || 'unknown',
    errorName,
    errorMessage,
    errorMessageLength: errorMessage?.length,
    errorMessageExact: JSON.stringify(errorMessage),
    stack: error?.stack,
    fullError: String(error),
    timestamp: new Date().toISOString()
  });

  // Determinar el tipo de error
  let statusCode = 500;
  let userMessage = defaultMessage;
  let technicalDetails: string | undefined = undefined;

  // Errores de base de datos - solo si el mensaje es explícitamente sobre DB no disponible
  // No detectar errores genéricos que contengan "DB" o "Database" en el mensaje
  // Solo detectar si el error es explícitamente sobre la DB no disponible
  const isExplicitDBError = errorMessage === 'Database not available' || 
      errorMessage === 'DB not available' ||
      errorMessage === 'Base de datos no disponible' ||
      (errorMessage.includes('D1') && errorMessage.includes('not available')) ||
      (errorMessage.includes('binding') && errorMessage.includes('not found')) ||
      (errorMessage.includes('D1 Database binding') && errorMessage.includes('not found'));
  
  if (isExplicitDBError) {
    statusCode = 503; // Service Unavailable
    userMessage = 'Base de datos no disponible';
    technicalDetails = envInfo.isCloudflare 
      ? 'Error de configuración: La base de datos D1 no está configurada correctamente en Cloudflare Pages. Verifica el binding en el dashboard.'
      : 'Error de configuración: La base de datos no está disponible en el entorno local.';
  }
  // Errores de constraint (UNIQUE, FOREIGN KEY, etc.)
  else if (errorMessage.includes('UNIQUE constraint') || 
           errorMessage.includes('constraint')) {
    statusCode = 400; // Bad Request
    if (errorMessage.includes('email')) {
      userMessage = 'El email ya existe';
    } else if (errorMessage.includes('reserva') || errorMessage.includes('clase')) {
      userMessage = 'Ya existe un registro con estos datos';
    } else {
      userMessage = 'Datos duplicados';
    }
  }
  // Errores de validación
  else if (errorMessage.includes('Faltan') || 
           errorMessage.includes('required') ||
           errorMessage.includes('invalid')) {
    statusCode = 400;
    userMessage = errorMessage.includes('Faltan') 
      ? errorMessage 
      : 'Datos inválidos';
  }
  // Errores de Cloudflare específicos
  else if (errorMessage.includes('Cloudflare') || 
           errorMessage.includes('edge runtime') ||
           errorMessage.includes('getOptionalRequestContext')) {
    statusCode = 500;
    userMessage = 'Error del servidor (Cloudflare)';
    technicalDetails = envInfo.isCloudflare 
      ? 'Error en el runtime de Cloudflare. Verifica la configuración del proyecto.'
      : 'Error de compatibilidad con Cloudflare Pages.';
  }
  // Otros errores
  else {
    statusCode = 500;
    userMessage = defaultMessage;
    if (envInfo.isDevelopment) {
      technicalDetails = errorMessage;
    }
  }

  // Respuesta con información detallada
  const response: any = {
    error: userMessage,
    environment: envInfo.environment,
    timestamp: new Date().toISOString()
  };

  // Agregar detalles técnicos solo en desarrollo o si es un error de configuración
  if (technicalDetails || envInfo.isDevelopment) {
    response.details = technicalDetails || errorMessage;
  }

  // Agregar información adicional para debugging
  if (envInfo.isDevelopment) {
    response.debug = {
      errorName,
      route: context?.route,
      method: context?.method,
      operation: context?.operation
    };
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Helper para verificar si la base de datos está disponible
 */
export function checkDatabaseAvailability(db: any, route: string): { available: boolean; error?: NextResponse } {
  if (!db) {
    const envInfo = getEnvironmentInfo();
    console.warn(`[${route}] Database not available`, {
      environment: envInfo.environment,
      isCloudflare: envInfo.isCloudflare
    });

    if (envInfo.isDevelopment) {
      // En desarrollo, devolver array vacío para no romper la UI
      return { available: false };
    } else {
      // En producción, devolver error
      return {
        available: false,
        error: createErrorResponse(
          new Error('Database not available'),
          'Base de datos no disponible',
          { route, operation: 'database_check' }
        )
      };
    }
  }
  return { available: true };
}

