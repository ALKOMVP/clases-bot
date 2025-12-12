import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, checkDatabaseAvailability, getEnvironmentInfo } from '@/lib/error-handler';

// OpenNext no requiere runtime = 'edge' explícito

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas] Starting request', { environment: envInfo.environment });
  
  try {
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[GET /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const usuario_id = searchParams.get('usuario_id');
    const clase_id = searchParams.get('clase_id');

    let query = `
      SELECT r.*, u.nombre, u.apellido, c.dia, c.hora, c.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase c ON r.clase_id = c.id
      WHERE u.activo = 1
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
      query += ' AND ' + conditions.join(' AND ');
    }

    // Ordenar por día y hora
    const ordenDias: { [key: string]: number } = { 'Lun': 1, 'Mar': 2, 'Jue': 3, 'Sab': 4 };
    query += ' ORDER BY c.dia, c.hora, u.apellido, u.nombre';

    let reservas: any[] = [];
    try {
      const stmt = db.prepare(query);
      const result = params.length > 0 
        ? await stmt.bind(...params).all()
        : await stmt.all();
      
      reservas = (result.results || []) as any[];
    } catch (error: any) {
      console.error('[GET /api/reservas] Error ejecutando query:', error);
      // Si hay error, retornar array vacío en lugar de fallar
      reservas = [];
    }
    
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
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[POST /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    // Solo usar mock DB si NO hay DB real disponible Y estamos en desarrollo
    if (!db) {
      const isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        db = getMockDBInstance();
        console.log('[POST /api/reservas] Using mock DB (development only)');
      } else {
        console.error('[POST /api/reservas] DB not available in production');
        return NextResponse.json({ 
          error: 'Base de datos no disponible',
          details: 'El binding de D1 no está configurado correctamente'
        }, { status: 503 });
      }
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const { usuario_id, clase_id } = await request.json();

    if (!usuario_id || !clase_id) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Verificar que el usuario existe y está activo
    const usuario = await db.prepare('SELECT id, activo FROM usuario WHERE id = ?').bind(usuario_id).first();
    
    if (!usuario) {
      return NextResponse.json({ 
        error: 'El alumno no existe',
        code: 'USUARIO_NO_EXISTE'
      }, { status: 400 });
    }

    if (!(usuario as any).activo || (usuario as any).activo === 0) {
      return NextResponse.json({ 
        error: 'No se pueden inscribir alumnos desactivados a clases',
        code: 'USUARIO_DESACTIVADO'
      }, { status: 400 });
    }

    // Verificar si el usuario ya está inscrito en esta clase
    const existingReserva = await db.prepare(
      'SELECT * FROM reserva WHERE usuario_id = ? AND clase_id = ?'
    ).bind(usuario_id, clase_id).first();

    if (existingReserva) {
      return NextResponse.json({ 
        error: 'El alumno ya está inscrito en esta clase',
        code: 'ALREADY_ENROLLED'
      }, { status: 400 });
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
    // En OpenNext, los bindings están disponibles a través del contexto de Cloudflare
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/reservas] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db) {
      // Si no hay DB disponible, usar mock como fallback
      db = getMockDBInstance();
      console.log('[DELETE /api/reservas] Using mock DB as fallback');
    }
    
    // Verificar que la DB esté disponible (ya sea real o mock)
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
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
