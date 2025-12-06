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

// Helper para obtener la base de datos
// En desarrollo local con wrangler pages dev, la DB está disponible en process.env.DB
// En producción en Cloudflare Pages, la DB estará disponible en env.DB
export function getDB(env?: { DB?: D1Database }): D1Database | null {
  // En desarrollo local con npm run dev, siempre usar mock
  // (a menos que se esté usando wrangler pages dev explícitamente)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Solo usar DB real si está explícitamente en env (wrangler pages dev)
    if (env?.DB) {
      return env.DB;
    }
    // Para desarrollo local con npm run dev, usar mock
    return getMockDBInstance() as any;
  }
  
  // Para producción en Cloudflare Pages (Edge runtime)
  if (env?.DB) {
    return env.DB;
  }
  
  // Fallback: intentar process.env.DB
  if (typeof process !== 'undefined') {
    const db = (process.env as any).DB;
    if (db) {
      return db;
    }
  }
  
  return null;
}

