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
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[POST /api/usuarios] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[POST /api/usuarios] Using mock DB as fallback', { 
        hasDB: !!db,
        dbType: typeof db,
        hasPrepare: typeof db?.prepare === 'function'
      });
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      console.error('[POST /api/usuarios] DB is null after fallback');
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    console.log('[POST /api/usuarios] About to parse request body');
    const { nombre, apellido, email, fecha_alta } = await request.json();
    console.log('[POST /api/usuarios] Request body parsed', { nombre, apellido, email, fecha_alta });

    if (!nombre || !apellido || !email) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    console.log('[POST /api/usuarios] About to execute INSERT');
    let result;
    try {
      result = await db.prepare(
        'INSERT INTO usuario (nombre, apellido, email, fecha_alta) VALUES (?, ?, ?, ?)'
      ).bind(nombre, apellido, email, fecha_alta || null).run();
      console.log('[POST /api/usuarios] INSERT executed successfully', { result });
    } catch (insertError: any) {
      console.error('[POST /api/usuarios] INSERT failed', {
        error: insertError?.message,
        name: insertError?.name,
        stack: insertError?.stack
      });
      throw insertError;
    }
    
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
      error: String(error)
    });
    
    if (error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json({ error: 'El email ya existe' }, { status: 400 });
    }
    
    // Si el error no es de base de datos, devolver error genérico
    if (!error.message?.includes('Database') && 
        !error.message?.includes('DB') && 
        !error.message?.includes('D1') && 
        !error.message?.includes('binding')) {
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
