import { NextRequest, NextResponse } from 'next/server';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { getDB } from '@/lib/db';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// Edge runtime required for Cloudflare Pages
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/usuarios] Starting request', { environment: envInfo.environment });
  
  try {
    // Intentar obtener la BD del contexto de Cloudflare
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[GET /api/usuarios] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[GET /api/usuarios] getOptionalRequestContext failed:', e?.message);
    }
    
    // Si no hay BD del contexto, intentar process.env.DB
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/usuarios] DB obtained from process.env');
    }
    
    // Si no hay BD, usar mock en desarrollo o devolver array vacío en producción
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[GET /api/usuarios] Using mock DB (development)');
      } else {
        console.warn('[GET /api/usuarios] DB not available, returning empty array');
        return NextResponse.json([]);
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.prepare('SELECT * FROM usuario WHERE id = ?').bind(id).first();
      console.log('[GET /api/usuarios] Success (single)', { id });
      return NextResponse.json(result);
    }

    const result = await db.prepare('SELECT * FROM usuario ORDER BY apellido, nombre').all();
    
    const usuarios = result?.results || [];
    console.log('[GET /api/usuarios] Success', { count: usuarios.length });
    return NextResponse.json(Array.isArray(usuarios) ? usuarios : []);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener usuarios',
      { route: '/api/usuarios', method: 'GET', operation: 'fetch_usuarios' }
    );
  }
}

export async function POST(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[POST /api/usuarios] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[POST /api/usuarios] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[POST /api/usuarios] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[POST /api/usuarios] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[POST /api/usuarios] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
        if (dbCheck.error) return dbCheck.error;
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { nombre, apellido, email, fecha_alta } = await request.json();

    if (!nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const fechaAlta = fecha_alta || new Date().toISOString().split('T')[0];
    const result = await db.prepare(
      'INSERT INTO usuario (nombre, apellido, email, fecha_alta) VALUES (?, ?, ?, ?)'
    ).bind(nombre, apellido, email, fechaAlta).run();

    // Manejar diferentes estructuras de respuesta (mock DB vs D1 real)
    const lastRowId = result && typeof result === 'object' 
      ? (result as any).meta?.last_row_id || (result as any).last_row_id
      : null;

    console.log('[POST /api/usuarios] Success', { id: lastRowId, email });
    return NextResponse.json({ success: true, id: lastRowId });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al crear usuario',
      { route: '/api/usuarios', method: 'POST', operation: 'create_usuario' }
    );
  }
}

export async function PUT(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[PUT /api/usuarios] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[PUT /api/usuarios] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[PUT /api/usuarios] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[PUT /api/usuarios] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[PUT /api/usuarios] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
        if (dbCheck.error) return dbCheck.error;
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { id, nombre, apellido, email, fecha_alta } = await request.json();

    if (!id || !nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    await db.prepare(
      'UPDATE usuario SET nombre = ?, apellido = ?, email = ?, fecha_alta = ? WHERE id = ?'
    ).bind(nombre, apellido, email, fecha_alta, id).run();

    console.log('[PUT /api/usuarios] Success', { id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al actualizar usuario',
      { route: '/api/usuarios', method: 'PUT', operation: 'update_usuario' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/usuarios] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    try {
      const context = getOptionalRequestContext();
      if (context?.env && (context.env as any).DB) {
        db = (context.env as any).DB;
        console.log('[DELETE /api/usuarios] DB obtained from Cloudflare context');
      }
    } catch (e: any) {
      console.warn('[DELETE /api/usuarios] getOptionalRequestContext failed:', e?.message);
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/usuarios] DB obtained from process.env');
    }
    
    if (!db) {
      if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        db = getMockDBInstance();
        console.log('[DELETE /api/usuarios] Using mock DB (development)');
      } else {
        const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
        if (dbCheck.error) return dbCheck.error;
      }
    }
    
    const dbCheck = checkDatabaseAvailability(db, '/api/usuarios');
    if (!dbCheck.available && dbCheck.error) {
      return dbCheck.error;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await db.prepare('DELETE FROM usuario WHERE id = ?').bind(id).run();

    console.log('[DELETE /api/usuarios] Success', { id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar usuario',
      { route: '/api/usuarios', method: 'DELETE', operation: 'delete_usuario' }
    );
  }
}
