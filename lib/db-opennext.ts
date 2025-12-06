/**
 * Helper para acceder a D1 database en OpenNext/Cloudflare
 * En OpenNext, los bindings están disponibles a través del objeto env
 * que se pasa en el contexto de la request
 */

export function getDBFromEnv(env?: { DB?: any }): any | null {
  // En OpenNext, los bindings están en env.DB
  if (env?.DB) {
    return env.DB;
  }
  
  // Fallback para desarrollo local
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    if ((process.env as any).DB) {
      return (process.env as any).DB;
    }
  }
  
  return null;
}

