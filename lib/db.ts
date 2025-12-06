// Tipos para TypeScript
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  fecha_alta: string;
}

export interface Clase {
  id: number;
  dia: string; // 'Lun', 'Mar', 'Jue', 'Sab'
  hora: string;
  nombre: string;
}

export interface Reserva {
  usuario_id: number;
  clase_id: number;
  created_at: string;
}

// Tipo para D1Database (Cloudflare)
type D1Database = any;

import { getMockDBInstance } from './db-mock';

// Importar getOptionalRequestContext estáticamente
// En edge runtime, esto funcionará si está disponible
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';

// Helper para obtener la base de datos
// Intenta múltiples formas de acceder a la BD para máxima compatibilidad
export function getDB(env?: { DB?: D1Database }): D1Database | null {
  // Primero intentar obtener de env.DB (pasado como parámetro)
  if (env?.DB) {
    return env.DB;
  }
  
  // En desarrollo local con npm run dev, usar mock
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Si hay DB en process.env (wrangler pages dev), usarla
    if ((process.env as any).DB) {
      return (process.env as any).DB;
    }
    // Si no, usar mock
    return getMockDBInstance() as any;
  }
  
  // Fallback: intentar process.env.DB (puede funcionar en algunos casos)
  if (typeof process !== 'undefined') {
    const db = (process.env as any).DB;
    if (db) {
      return db;
    }
  }
  
  return null;
}

// Helper para obtener la BD desde el contexto de Cloudflare
// Esta función debe ser llamada dentro de las rutas API
export function getDBFromContext(): D1Database | null {
  try {
    // Intentar obtener del contexto de Cloudflare
    const context = getOptionalRequestContext();
    if (context?.env && (context.env as any).DB) {
      return (context.env as any).DB;
    }
  } catch (e) {
    // getOptionalRequestContext no está disponible o falló
    // Esto es normal en desarrollo local
  }
  
  // Fallback a process.env.DB
  if (typeof process !== 'undefined' && (process.env as any).DB) {
    return (process.env as any).DB;
  }
  
  return null;
}

