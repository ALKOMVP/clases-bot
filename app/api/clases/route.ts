import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

// Clases semanales fijas
const CLASES_FIJAS = [
  // Lunes
  { dia: 'Lun', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Lun', hora: '19:00', nombre: 'Yoga' },
  // Martes
  { dia: 'Mar', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Mar', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Mar', hora: '19:00', nombre: 'Yoga' },
  // Jueves
  { dia: 'Jue', hora: '10:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '16:00', nombre: 'Yoga' },
  { dia: 'Jue', hora: '17:30', nombre: 'Yoga' },
  { dia: 'Jue', hora: '19:00', nombre: 'Yoga' },
  // Sábado
  { dia: 'Sab', hora: '09:30', nombre: 'Yoga' },
  { dia: 'Sab', hora: '11:00', nombre: 'Yoga' },
];

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/clases] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[GET /api/clases] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[GET /api/clases] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/clases] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[GET /api/clases] Using mock DB (development)');
      } else {
        console.warn('[GET /api/clases] DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/clases');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.prepare('SELECT * FROM clase WHERE id = ?')
        .bind(id).first();
      return NextResponse.json(result);
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    const result = await db.prepare('SELECT * FROM clase ORDER BY dia, hora').all();
    const clases = (result.results || []) as any[];
    
    // Ordenar manualmente por día
    clases.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    console.log('[GET /api/clases] Success', { count: clases.length });
    return NextResponse.json(clases);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener clases',
      { route: '/api/clases', method: 'GET', operation: 'fetch_clases' }
    );
  }
}

// Endpoint para crear una clase individual o inicializar las clases fijas
export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/clases] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[POST /api/clases] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[POST /api/clases] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[POST /api/clases] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[POST /api/clases] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/clases');
        if (dbCheck.error) return dbCheck.error;
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/clases');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const body = await request.json();
    
    // Si viene con dia, hora, nombre, es una clase individual
    if (body.dia && body.hora && body.nombre) {
      try {
        const result = await db.prepare(
          'INSERT INTO clase (dia, hora, nombre) VALUES (?, ?, ?)'
        ).bind(body.dia, body.hora, body.nombre).run();
        
        const lastRowId = result && typeof result === 'object' 
          ? (result as any).meta?.last_row_id || (result as any).last_row_id
          : null;
        
        return NextResponse.json({ success: true, id: lastRowId });
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint')) {
          return NextResponse.json({ error: 'Ya existe una clase con este día y hora' }, { status: 400 });
        }
        throw error;
      }
    }
    
    // Si no viene body, inicializar clases fijas
    // Verificar si ya existen clases
    const existing = await db.prepare('SELECT COUNT(*) as count FROM clase').first();
    if ((existing as any)?.count > 0) {
      return NextResponse.json({ error: 'Las clases ya están inicializadas' }, { status: 400 });
    }

    // Insertar todas las clases fijas
    for (const clase of CLASES_FIJAS) {
      try {
        await db.prepare(
          'INSERT INTO clase (dia, hora, nombre) VALUES (?, ?, ?)'
        ).bind(clase.dia, clase.hora, clase.nombre).run();
      } catch (error: any) {
        // Ignorar errores de duplicados
        if (!error.message?.includes('UNIQUE constraint')) {
          throw error;
        }
      }
    }

    console.log('[POST /api/clases] Success - Clases inicializadas');
    return NextResponse.json({ success: true, message: 'Clases inicializadas' });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al crear clases',
      { route: '/api/clases', method: 'POST', operation: 'create_clases' }
    );
  }
}

// Endpoint para eliminar una clase
export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/clases] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[DELETE /api/clases] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[DELETE /api/clases] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/clases] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[DELETE /api/clases] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/clases');
        if (dbCheck.error) return dbCheck.error;
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/clases');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare('DELETE FROM clase WHERE id = ?').bind(id).run();

    console.log('[DELETE /api/clases] Success', { id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar clase',
      { route: '/api/clases', method: 'DELETE', operation: 'delete_clase' }
    );
  }
}
