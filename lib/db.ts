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
// En producción en Cloudflare Pages, la DB está disponible a través de getRequestContext().env.DB
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
  
  // Para producción en Cloudflare Pages (Edge runtime)
  // El binding D1 se obtiene a través de getRequestContext().env.DB en las rutas API
  // Este helper solo se usa como fallback
  
  // Fallback: intentar process.env.DB (puede funcionar en algunos casos)
  if (typeof process !== 'undefined') {
    const db = (process.env as any).DB;
    if (db) {
      return db;
    }
  }
  
  return null;
}

