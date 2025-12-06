import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      // Importación dinámica para evitar errores en build time
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[GET /api/reservas] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[GET /api/reservas] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[GET /api/reservas] Using mock DB (development)');
      } else {
        console.warn('[GET /api/reservas] DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/reservas');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    let query = `
      SELECT r.*, u.nombre, u.apellido, u.email, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (usuario_id) {
      conditions.push('r.usuario_id = ?');
      params.push(usuario_id);
    }
    if (clase_id) {
      conditions.push('r.clase_id = ?');
      params.push(clase_id);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    query += ' ORDER BY c.dia, c.hora, u.apellido, u.nombre';

    const stmt = db.prepare(query);
    const result = params.length > 0 
      ? await stmt.bind(...params).all()
      : await stmt.all();
    
    const reservas = (result.results || []) as any[];
    
    // Ordenar manualmente por día
    reservas.sort((a, b) => {
      const diaA = ordenDias[a.dia] || 99;
      const diaB = ordenDias[b.dia] || 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

    console.log('[GET /api/reservas] Success', { count: reservas.length });
    return NextResponse.json(reservas);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener reservas',
      { route: '/api/reservas', method: 'GET', operation: 'fetch_reservas' }
    );
  }
}

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      // Importación dinámica para evitar errores en build time
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[POST /api/reservas] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[POST /api/reservas] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[POST /api/reservas] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[POST /api/reservas] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/reservas');
        if (dbCheck.error) return dbCheck.error;
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/reservas');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { usuario_id, clase_id } = await request.json();

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await db.prepare(
      'INSERT INTO reserva (usuario_id, clase_id) VALUES (?, ?)'
    ).bind(usuario_id, clase_id).run();

    console.log('[POST /api/reservas] Success', { usuario_id, clase_id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al crear reserva',
      { route: '/api/reservas', method: 'POST', operation: 'create_reserva' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      // Importación dinámica para evitar errores en build time
      const { getOptionalRequestContext } = await import('@cloudflare/next-on-pages');
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[DELETE /api/reservas] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[DELETE /api/reservas] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/reservas] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[DELETE /api/reservas] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/reservas');
        if (dbCheck.error) return dbCheck.error;
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/reservas');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Usuario ID y Clase ID requeridos' }, { status: 400 });
    }

    await db.prepare('DELETE FROM reserva WHERE usuario_id = ? AND clase_id = ?')
      .bind(usuario_id, clase_id).run();

    console.log('[DELETE /api/reservas] Success', { usuario_id, clase_id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar reserva',
      { route: '/api/reservas', method: 'DELETE', operation: 'delete_reserva' }
    );
  }
}
