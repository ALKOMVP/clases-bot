/**
 * Helper para manejar errores en el frontend
 * Muestra errores detallados en la consola y al usuario
 */

export interface ApiErrorResponse {
  error: string;
  details?: string;
  environment?: 'cloudflare' | 'local';
  timestamp?: string;
  debug?: {
    errorName?: string;
    route?: string;
    method?: string;
    operation?: string;
  };
}

/**
 * Maneja errores de respuesta de API y muestra información detallada
 */
export async function handleApiError(
  response: Response,
  context: {
    route: string;
    operation: string;
  }
): Promise<string> {
  let errorMessage = 'Error desconocido';
  let errorDetails: ApiErrorResponse | null = null;

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorDetails = await response.json();
      errorMessage = errorDetails?.error || errorMessage;
    } else {
      const text = await response.text();
      errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
    }
  } catch (e) {
    errorMessage = `Error al procesar respuesta: ${response.status} ${response.statusText}`;
  }

  // Log detallado en consola
  console.error('=== API ERROR ===', {
    route: context.route,
    operation: context.operation,
    status: response.status,
    statusText: response.statusText,
    errorDetails,
    timestamp: new Date().toISOString()
  });

  // Construir mensaje para el usuario
  let userMessage = errorMessage;

  // Agregar información adicional si está disponible
  if (errorDetails) {
    // Si es un error de base de datos
    if (errorDetails.details?.includes('Database') || 
        errorDetails.details?.includes('D1') ||
        errorDetails.details?.includes('binding')) {
      userMessage = 'Error de base de datos: ' + errorMessage;
      if (errorDetails.environment === 'cloudflare') {
        userMessage += '\n\nVerifica la configuración de D1 en Cloudflare Pages.';
      }
    }
    
    // Si hay detalles técnicos y estamos en desarrollo, mostrarlos
    if (errorDetails.details && errorDetails.details !== errorMessage) {
      console.error('Error details:', errorDetails.details);
      // En desarrollo, mostrar detalles técnicos
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        userMessage += `\n\nDetalles: ${errorDetails.details}`;
      }
    }
    
    // Información de debug
    if (errorDetails.debug) {
      console.error('Debug info:', errorDetails.debug);
    }
  }

  return userMessage;
}

/**
 * Wrapper para fetch que maneja errores automáticamente
 */
export async function fetchWithErrorHandling(
  url: string,
  options: RequestInit = {},
  context: {
    route: string;
    operation: string;
  }
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorMessage = await handleApiError(response, context);
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error: any) {
    // Si es un error de red (no respuesta del servidor)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('=== NETWORK ERROR ===', {
        route: context.route,
        operation: context.operation,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw new Error('Error de conexión. Verifica tu conexión a internet o si el servidor está disponible.');
    }
    
    // Re-lanzar otros errores
    throw error;
  }
}

