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
// En producción en Cloudflare Pages, la DB estará disponible en process.env.DB cuando el binding está configurado
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
  // El binding D1 está disponible en process.env.DB cuando está configurado en Cloudflare Pages
  // Intentar múltiples formas de acceso para compatibilidad
  if (typeof process !== 'undefined') {
    // Primero intentar process.env.DB (forma estándar)
    const db = (process.env as any).DB;
    if (db) {
      return db;
    }
    
    // Intentar a través de globalThis (algunas versiones de next-on-pages)
    if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
      return (globalThis as any).DB;
    }
    
    // Intentar a través de global (Node.js compatibility)
    if (typeof global !== 'undefined' && (global as any).DB) {
      return (global as any).DB;
    }
  }
  
  // Si estamos en Edge runtime y no hay process, intentar obtener del contexto global
  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  
  return null;
}

