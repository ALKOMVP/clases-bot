import { NextRequest, NextResponse } from 'next/server';
import { getMockDBInstance } from '@/lib/db-mock';
import { createErrorResponse, getEnvironmentInfo } from '@/lib/error-handler';

export async function GET(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[GET /api/reservas/temporales] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[GET /api/reservas/temporales] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[GET /api/reservas/temporales] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[GET /api/reservas/temporales] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Obtener todas las reservas temporales (es_reasignacion = 1 y fecha_clase no null)
    // EXCLUYENDO las que tienen cancelación para esa fecha
    const query = `
      SELECT 
        r.usuario_id,
        r.clase_id,
        r.fecha_clase,
        r.created_at,
        u.nombre as usuario_nombre,
        u.apellido as usuario_apellido,
        cl.dia as clase_dia,
        cl.hora as clase_hora,
        cl.nombre as clase_nombre
      FROM reserva r
      JOIN usuario u ON r.usuario_id = u.id
      JOIN clase cl ON r.clase_id = cl.id
      WHERE r.es_reasignacion = 1
        AND r.fecha_clase IS NOT NULL
        AND r.fecha_clase != ''
        AND r.fecha_clase != 'null'
        AND NOT EXISTS (
          SELECT 1 FROM cancelacion c
          WHERE c.usuario_id = r.usuario_id
            AND c.clase_id = r.clase_id
            AND c.fecha_clase = r.fecha_clase
        )
      ORDER BY r.fecha_clase DESC, r.created_at DESC
    `;

    let asignaciones: any[] = [];
    try {
      const stmt = db.prepare(query);
      const result = await stmt.all();
      asignaciones = (result.results || []) as any[];
      console.log('[GET /api/reservas/temporales] Query ejecutada exitosamente,', asignaciones.length, 'asignaciones encontradas');
    } catch (error: any) {
      console.error('[GET /api/reservas/temporales] ❌ Error ejecutando query:', error);
      asignaciones = [];
    }

    console.log('[GET /api/reservas/temporales] Success', { count: asignaciones.length });
    return NextResponse.json(asignaciones);
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al obtener asignaciones temporales',
      { route: '/api/reservas/temporales', method: 'GET', operation: 'fetch_temporales' }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const envInfo = getEnvironmentInfo();
  console.log('[DELETE /api/reservas/temporales] Starting request', { environment: envInfo.environment });
  
  try {
    let db: any = null;
    
    const cloudflareContext = (globalThis as any)[Symbol.for('__cloudflare-context__')];
    if (cloudflareContext?.env?.DB) {
      db = cloudflareContext.env.DB;
      console.log('[DELETE /api/reservas/temporales] DB obtained from Cloudflare context (OpenNext)');
    }
    
    if (!db && typeof process !== 'undefined' && (process.env as any).DB) {
      db = (process.env as any).DB;
      console.log('[DELETE /api/reservas/temporales] DB obtained from process.env.DB (OpenNext fallback)');
    }
    
    if (!db) {
      db = getMockDBInstance();
      console.log('[DELETE /api/reservas/temporales] Using mock DB as fallback');
    }
    
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuario_id');
    const claseId = searchParams.get('clase_id');
    const fechaClase = searchParams.get('fecha_clase');

    if (!usuarioId || !claseId || !fechaClase) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: usuario_id, clase_id, fecha_clase' }, { status: 400 });
    }

    const usuarioIdNum = Number(usuarioId);
    const claseIdNum = Number(claseId);
    const fechaClaseStr = String(fechaClase);

    if (!Number.isFinite(usuarioIdNum) || !Number.isFinite(claseIdNum) || !fechaClaseStr) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    // Verificar que la reserva temporal existe
    const reservaExistente = await db.prepare(`
      SELECT * FROM reserva
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(usuarioIdNum, claseIdNum, fechaClaseStr).first();

    if (!reservaExistente) {
      return NextResponse.json({ 
        error: 'La asignación temporal no existe o ya fue eliminada',
        code: 'ASIGNACION_NO_EXISTE'
      }, { status: 404 });
    }

    // Eliminar la reserva temporal
    const result = await db.prepare(`
      DELETE FROM reserva
      WHERE usuario_id = ? AND clase_id = ? AND fecha_clase = ? AND es_reasignacion = 1
    `).bind(usuarioIdNum, claseIdNum, fechaClaseStr).run();

    const deleted = result?.meta?.changes || 0;
    console.log('[DELETE /api/reservas/temporales] Success', { 
      usuario_id: usuarioIdNum, 
      clase_id: claseIdNum, 
      fecha_clase: fechaClaseStr, 
      deleted
    });

    return NextResponse.json({ 
      deleted, 
      success: true,
      message: 'Asignación temporal eliminada exitosamente'
    });
  } catch (error: any) {
    return createErrorResponse(
      error,
      'Error al eliminar asignación temporal',
      { route: '/api/reservas/temporales', method: 'DELETE', operation: 'delete_temporal' }
    );
  }
}
