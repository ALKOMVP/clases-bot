import { NextResponse } from 'next/server';

/**
 * Detecta si estamos en Cloudflare Pages
 * Esta función no puede usar require() en edge runtime
 * Simplificada para evitar problemas de bundling
 */
export function isCloudflareEnvironment(): boolean {
  // En edge runtime, no podemos detectar fácilmente si estamos en Cloudflare
  // sin usar getOptionalRequestContext, que requiere importación dinámica
  // Por ahora, retornamos false y dejamos que las rutas API lo manejen
  return false;
}

/**
 * Obtiene información del entorno para logging
 */
export function getEnvironmentInfo() {
  const isCloudflare = isCloudflareEnvironment();
  const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
  
  return {
    environment: isCloudflare ? 'cloudflare' : 'local',
    isCloudflare,
    isDevelopment,
    nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'unknown'
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

