import { getMockDBInstance } from './db-mock';

type D1Database = any; // Cloudflare D1 type

/**
 * Obtiene la instancia de D1 Database para OpenNext
 * Primero intenta obtenerla del contexto de Cloudflare
 * Si no está disponible, usa mock DB en desarrollo
 */
export function getOpenNextDB(): D1Database | null {
  // En OpenNext, los bindings de D1 se exponen a través del contexto de Cloudflare
  const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
  if (cloudflareContext?.env?.DB) {
    return cloudflareContext.env.DB;
  }

  // En desarrollo local, usar mock DB
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return getMockDBInstance() as any;
  }

  console.warn('D1 Database binding (DB) not found in OpenNext environment.');
  return null;
}
