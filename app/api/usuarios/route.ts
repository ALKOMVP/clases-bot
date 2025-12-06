import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/usuarios] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/usuarios] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[GET /api/usuarios] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.prepare('SELECT * FROM usuario WHERE id = ?').bind(id).first();
      return NextResponse.json(result);
    }

    const result = await db.prepare('SELECT * FROM usuario ORDER BY apellido, nombre').all();
    const usuarios = (result?.results || []) as any[];
    
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
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    // Acceder al contexto de Cloudflare de la misma forma que /api/test
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    db = cloudflareContext?.env?.DB;
    
    console.log('[POST /api/usuarios] Cloudflare context check', {
      hasContext: !!cloudflareContext,
      hasEnv: !!cloudflareContext?.env,
      hasDB: !!db,
      dbType: typeof db,
      hasPrepare: typeof db?.prepare === 'function',
      envKeys: cloudflareContext?.env ? Object.keys(cloudflareContext.env) : []
    });
    
    if (!db) {
      // Si no hay DB en el contexto, intentar obtenerla de otra forma
      console.warn('[POST /api/usuarios] DB not found in Cloudflare context, checking alternatives');
      
      // En desarrollo local, usar mock DB
      const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        db = getMockDBInstance();
        console.log('[POST /api/usuarios] Using mock DB (development only)');
      } else {
        // En producción, si no hay DB, devolver error
        console.error('[POST /api/usuarios] DB not available in production - Cloudflare context missing');
        return NextResponse.json({ 
          error: 'Base de datos no disponible',
          details: 'El binding de D1 no está disponible en el contexto de Cloudflare. Verifica la configuración del binding en Cloudflare Pages.'
        }, { status: 503 });
      }
    } else {
      console.log('[POST /api/usuarios] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Verificar que la DB esté disponible
    if (!db || typeof db.prepare !== 'function') {
      console.error('[POST /api/usuarios] DB is invalid', { 
        hasDB: !!db,
        hasPrepare: typeof db?.prepare === 'function'
      });
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { nombre, apellido, email, fecha_alta } = await request.json();

    if (!nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Ejecutar INSERT
    const result = await db.prepare(
      'INSERT INTO usuario (nombre, apellido, email, fecha_alta) VALUES (?, ?, ?, ?)'
    ).bind(nombre, apellido, email, fecha_alta || null).run();
    
    const lastRowId = result && typeof result === 'object' 
      ? (result as any).meta?.last_row_id || (result as any).last_row_id
      : null;

    console.log('[POST /api/usuarios] Success', { id: lastRowId });
    return NextResponse.json({ success: true, id: lastRowId });
  } catch (error: any) {
    console.error('[POST /api/usuarios] Error caught:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      error: String(error),
      errorType: typeof error
    });
    
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'El email ya existe' }, { status: 400 });
    }
    
    // Si el error no es explícitamente sobre DB no disponible, devolver error genérico
    const isDBError = error?.message === 'Database not available' || 
                      error?.message === 'DB not available' ||
                      error?.message === 'Base de datos no disponible';
    
    if (!isDBError) {
      return NextResponse.json({ 
        error: 'Error al crear usuario',
        details: error?.message || String(error)
      }, { status: 500 });
    }
    
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
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[PUT /api/usuarios] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[PUT /api/usuarios] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
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
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/usuarios] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[DELETE /api/usuarios] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
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
