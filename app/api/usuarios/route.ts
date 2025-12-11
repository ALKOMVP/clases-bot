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
    
    // Convertir activo de INTEGER a boolean
    // Por defecto todos los usuarios están activos (solo desactivar si explícitamente es 0 o false)
    const usuariosNormalizados = usuarios.map((u: any) => ({
      ...u,
      activo: u.activo === 0 || u.activo === false ? false : true
    }));
    
    console.log('[GET /api/usuarios] Success', { count: usuariosNormalizados.length });
    return NextResponse.json(Array.isArray(usuariosNormalizados) ? usuariosNormalizados : []);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener usuarios',
      { route: '/api/usuarios', method: 'GET', operation: 'fetch_usuarios' }
    );
  }
}

export async function POST(request: NextRequest) {
  // Usar EXACTAMENTE el mismo patrón que GET que funciona
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
      console.log('[POST /api/usuarios] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await request.json();
    const { nombre, apellido, telefono, fecha_alta, activo } = body;

    if (!nombre || !apellido || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Ejecutar INSERT directamente - mismo patrón que GET
    const activoValue = activo !== undefined ? (activo ? 1 : 0) : 1;
    
    console.log('[POST /api/usuarios] Datos a insertar:', { nombre, apellido, telefono, fecha_alta, activo: activoValue });
    
    const result = await db.prepare(
      'INSERT INTO usuario (nombre, apellido, telefono, fecha_alta, activo) VALUES (?, ?, ?, ?, ?)'
    ).bind(nombre, apellido, telefono, fecha_alta || null, activoValue).run();
    
    const lastRowId = result && typeof result === 'object' 
      ? (result as any).meta?.last_row_id || (result as any).last_row_id
      : null;

    console.log('[POST /api/usuarios] Success', { id: lastRowId });
    return NextResponse.json({ success: true, id: lastRowId });
  } catch (error: any) {
    console.error('[POST /api/usuarios] Error:', error);
    const errorMessage = error?.message || String(error);
    
    
    return NextResponse.json({ 
      error: `Error al crear usuario: ${errorMessage}`,
      details: errorMessage
    }, { status: 500 });
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

    const { id, nombre, apellido, telefono, fecha_alta, activo } = await request.json();

    if (!id || !nombre || !apellido || !telefono) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const activoValue = activo !== undefined ? (activo ? 1 : 0) : 1;
    
    console.log('[PUT /api/usuarios] Datos a actualizar:', { id, nombre, apellido, telefono, fecha_alta, activo: activoValue });
    
    await db.prepare(
      'UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, fecha_alta = ?, activo = ? WHERE id = ?'
    ).bind(nombre, apellido, telefono, fecha_alta, activoValue, id).run();

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
